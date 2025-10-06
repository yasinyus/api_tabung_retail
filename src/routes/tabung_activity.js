const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

function authKepalaGudang(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'kepala_gudang' && decoded.role !== 'driver') {
      return res.status(403).json({ message: 'Forbidden: Not kepala_gudang or driver' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Generate unique BAST ID (8 karakter unik)
function generateBastId() {
  // Kombinasi timestamp presisi tinggi + process.hrtime untuk uniqueness
  const hrTime = process.hrtime.bigint().toString();
  const timestamp = Date.now().toString();
  const random1 = Math.random().toString(36).substr(2, 8);
  const random2 = Math.random().toString(36).substr(2, 8);
  
  // Gabungkan semua dan ambil 8 karakter unik
  const combined = (hrTime + timestamp + random1 + random2).replace(/[^A-Z0-9]/gi, '');
  let result = '';
  
  // Pilih 8 karakter acak dari kombinasi untuk memastikan tidak ada duplikasi
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * combined.length);
    result += combined[randomIndex].toUpperCase();
  }
  
  return result;
}

router.post('/tabung_activity', authKepalaGudang, async (req, res) => {
  const { dari, tujuan, tabung, keterangan, activity, status} = req.body;
  // tabung: array of tabung QR
  if (!dari || !tujuan || !Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validasi status harus sesuai ENUM database jika ada
  if (status) {
    const validStatuses = ['Kosong', 'Isi', 'Rusak'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        received: status 
      });
    }
  }

  // Validasi kode_tabung harus ada di tabel tabungs
  try {
    const placeholders = tabung.map(() => '?').join(',');
    const [validTabungs] = await db.query(
      `SELECT kode_tabung FROM tabungs WHERE kode_tabung IN (${placeholders})`,
      tabung
    );
    
    const validKodeTabungs = validTabungs.map(row => row.kode_tabung);
    const invalidTabungs = tabung.filter(kode => !validKodeTabungs.includes(kode));
    
    if (invalidTabungs.length > 0) {
      return res.status(400).json({
        message: 'Invalid kode_tabung found. These tabung codes do not exist in tabungs table:',
        invalid_codes: invalidTabungs,
        valid_codes: validKodeTabungs
      });
    }
  } catch (validationError) {
    return res.status(500).json({
      message: 'Error validating kode_tabung',
      error: validationError.message
    });
  }

  const id_user = req.user.id;
  const nama_petugas = req.user.name;
  const total_tabung = tabung.length;
  const tanggal = new Date().toLocaleDateString('id-ID'); // DD/MM/YYYY
  const waktu = new Date(); // datetime otomatis
  
  try {
    // Insert ke aktivitas_tabung
    const [result] = await db.query(
      'INSERT INTO aktivitas_tabung (dari, tujuan, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, waktu, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [dari, tujuan, JSON.stringify(tabung), keterangan || '', nama_petugas, id_user, total_tabung, tanggal, waktu, activity, status]
    );

    // Jika status = Refund dan nama_aktivitas = "Terima Tabung Dari Pelanggan" atau "Terima Tabung Dari Agen"
    // maka insert ke tabel serah_terima_tabungs
    let serahTerimaResult = null;
    if (activity === "Terima Tabung Dari Pelanggan" || activity === "Terima Tabung Dari Agen") {
      try {
        // Pastikan tabel serah_terima_tabungs ada
        await db.query(`
          CREATE TABLE IF NOT EXISTS serah_terima_tabungs (
            id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
            bast_id VARCHAR(50) NULL DEFAULT NULL,
            kode_pelanggan VARCHAR(50) NULL DEFAULT NULL,
            tabung JSON NULL DEFAULT NULL,
            total_harga DECIMAL(20,2) NULL DEFAULT NULL,
            status VARCHAR(50) NULL DEFAULT NULL,
            created_at TIMESTAMP NULL DEFAULT NULL,
            updated_at TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (id)
          )
        `);
        
        const bast_id = generateBastId();
        const total_harga = null; // sesuai permintaan user
        
        // Insert ke serah_terima_tabungs dengan kode_pelanggan dari parameter 'dari'
        const [serahTerima] = await db.query(
          'INSERT INTO serah_terima_tabungs (bast_id, kode_pelanggan, tabung, total_harga, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [bast_id, dari, JSON.stringify(tabung), total_harga, status, waktu, waktu]
        );
        
        serahTerimaResult = {
          id: serahTerima.insertId,
          bast_id: bast_id,
          kode_pelanggan: dari,
          total_harga: total_harga,
          status: status
        };
        
        console.log('Serah terima tabung created for Rusak:', serahTerimaResult);
        
      } catch (serahTerimaError) {
        console.error('Error creating serah terima tabung for Rusak:', serahTerimaError.message);
        // Continue execution, don't fail the whole transaction
      }
    }

    // Update atau insert ke tabel stok_tabung untuk setiap kode_tabung (skip jika status = Rusak)
    const stokResults = [];
    
    if (status !== "Rusak" || status !== "Kosong" || status !== "Isi") {
      console.log('Starting stok_tabung update/insert process');
      console.log('Tabung array:', tabung);
      console.log('Status:', status);
      console.log('Tujuan:', tujuan);
      
      for (const kode_tabung of tabung) {
      try {
        console.log(`Processing tabung: ${kode_tabung}`);
        
        // Cek apakah kode_tabung sudah ada di stok_tabung
        const [existingStok] = await db.query('SELECT id FROM stok_tabung WHERE kode_tabung = ?', [kode_tabung]);
        console.log(`Existing stok check for ${kode_tabung}:`, existingStok.length);
        
        if (existingStok.length > 0) {
          // Update jika sudah ada
          console.log(`Updating existing stok for ${kode_tabung}`);
          const [updateResult] = await db.query(
            'UPDATE stok_tabung SET status = ?, lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?', 
            [status || 'Kosong', tujuan, waktu, kode_tabung]
          );
          console.log(`Update result for ${kode_tabung}:`, updateResult.affectedRows);
          stokResults.push({
            kode_tabung: kode_tabung,
            action: 'updated',
            affectedRows: updateResult.affectedRows,
            success: updateResult.affectedRows > 0
          });
        } else {
          // Insert jika belum ada
          console.log(`Inserting new stok for ${kode_tabung}`);
          const [insertResult] = await db.query(
            'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [kode_tabung, status || 'Kosong', 0, tujuan, waktu, waktu]
          );
          console.log(`Insert result for ${kode_tabung}:`, insertResult.insertId);
          stokResults.push({
            kode_tabung: kode_tabung,
            action: 'inserted',
            insertId: insertResult.insertId,
            success: insertResult.insertId > 0
          });
        }
      } catch (stokError) {
        console.error(`Error updating stok_tabung for ${kode_tabung}:`, stokError.message);
        stokResults.push({
          kode_tabung: kode_tabung,
          action: 'error',
          error: stokError.message,
          success: false
        });
        }
      }
      
      console.log('Finished stok_tabung update/insert process');
      
      res.json({ 
        message: 'Sukses - Aktivitas dan stok_tabung berhasil diproses', 
        id: result.insertId, 
        serah_terima: serahTerimaResult,
        total_tabung: total_tabung,
        stok_results: stokResults,
        stok_summary: {
          total: tabung.length,
          successful: stokResults.filter(r => r.success).length,
          failed: stokResults.filter(r => !r.success).length
        }
      });
    } else {
      // Jika status = Refund, tidak update stok_tabung
      console.log('Skipping stok_tabung update for status: Refund');
      
      res.json({ 
        message: 'Sukses - Aktivitas berhasil disimpan (stok_tabung tidak diubah untuk status Refund)', 
        id: result.insertId, 
        total_tabung: total_tabung,
        status: status,
        serah_terima: serahTerimaResult
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


router.post('/laporan_pelanggan', authKepalaGudang, async (req, res) => {
  const { activity, dari, tujuan, tabung, keterangan, status } = req.body;
  
  // Validasi input
  if (!activity || !dari || !tujuan || !Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ message: 'Missing required fields: activity, dari, tujuan, tabung' });
  }

  // Validasi status harus sesuai ENUM database jika ada
  if (status) {
    const validStatuses = ['Kosong', 'Isi'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        received: status 
      });
    }
  }

  // Validasi kode_tabung harus ada di tabel tabungs
  try {
    const placeholders = tabung.map(() => '?').join(',');
    const [validTabungs] = await db.query(
      `SELECT kode_tabung FROM tabungs WHERE kode_tabung IN (${placeholders})`,
      tabung
    );
    
    const validKodeTabungs = validTabungs.map(row => row.kode_tabung);
    const invalidTabungs = tabung.filter(kode => !validKodeTabungs.includes(kode));
    
    if (invalidTabungs.length > 0) {
      return res.status(400).json({
        message: 'Invalid kode_tabung found. These tabung codes do not exist in tabungs table:',
        invalid_codes: invalidTabungs,
        valid_codes: validKodeTabungs
      });
    }
  } catch (validationError) {
    return res.status(500).json({
      message: 'Error validating kode_tabung',
      error: validationError.message
    });
  }
  
  try {
    // Format tanggal MySQL (YYYY-MM-DD)
    const today = new Date();
    const tanggal = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const waktu = new Date();
    
    // Ambil kode_pelanggan dari field 'dari'
    const kode_pelanggan = dari;
    const jumlah_tabung = tabung.length;
    
    // Get saldo pelanggan untuk sisa_deposit
    const [saldoData] = await db.query('SELECT saldo FROM saldo_pelanggans WHERE kode_pelanggan = ?', [kode_pelanggan]);
    if (saldoData.length === 0) {
      return res.status(404).json({ message: 'Customer tidak ditemukan' });
    }
    
    const sisa_deposit = parseFloat(saldoData[0].saldo);
    
    // Insert ke laporan_pelanggan
    const [result] = await db.query(
      'INSERT INTO laporan_pelanggan (tanggal, kode_pelanggan, keterangan, tabung, harga, tambahan_deposit, pengurangan_deposit, sisa_deposit, konfirmasi, list_tabung, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        tanggal, 
        kode_pelanggan, 
        "Kembali", // menggunakan activity sebagai keterangan
        jumlah_tabung, 
        0, // harga default 0
        0, // tambahan_deposit default 0
        0, // pengurangan_deposit default 0
        sisa_deposit, 
        0, // konfirmasi default 0
        JSON.stringify(tabung), // list_tabung sebagai JSON array
        waktu
      ]
    );

    // Update atau insert ke tabel stok_tabung berdasarkan kode_tabung
    console.log('Starting stok_tabung update/insert process for laporan_pelanggan');
    console.log('Tabung array:', tabung);
    console.log('Status:', status);
    console.log('Tujuan:', tujuan);
    
    const stokResults = [];
    
    for (const kode_tabung of tabung) {
      try {
        console.log(`Processing tabung: ${kode_tabung}`);
        
        // Cek apakah kode_tabung sudah ada di stok_tabung
        const [existingStok] = await db.query('SELECT id FROM stok_tabung WHERE kode_tabung = ?', [kode_tabung]);
        console.log(`Existing stok check for ${kode_tabung}:`, existingStok.length);
        
        if (existingStok.length > 0) {
          // Update jika sudah ada
          console.log(`Updating existing stok for ${kode_tabung}`);
          const [updateResult] = await db.query(
            'UPDATE stok_tabung SET status = ?, lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?', 
            [status || 'Isi', tujuan, waktu, kode_tabung]
          );
          console.log(`Update result for ${kode_tabung}:`, updateResult.affectedRows);
          stokResults.push({
            kode_tabung: kode_tabung,
            action: 'updated',
            affectedRows: updateResult.affectedRows,
            success: updateResult.affectedRows > 0
          });
        } else {
          // Insert jika belum ada
          console.log(`Inserting new stok for ${kode_tabung}`);
          const [insertResult] = await db.query(
            'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [kode_tabung, status || 'Isi', 0, tujuan, waktu, waktu]
          );
          console.log(`Insert result for ${kode_tabung}:`, insertResult.insertId);
          stokResults.push({
            kode_tabung: kode_tabung,
            action: 'inserted',
            insertId: insertResult.insertId,
            success: insertResult.insertId > 0
          });
        }
      } catch (stokError) {
        console.error(`Error updating stok_tabung for ${kode_tabung}:`, stokError.message);
        stokResults.push({
          kode_tabung: kode_tabung,
          action: 'error',
          error: stokError.message,
          success: false
        });
      }
    }
    
    console.log('Finished stok_tabung update/insert process for laporan_pelanggan');
    
    res.json({ 
      message: 'Laporan pelanggan berhasil disimpan dan stok_tabung diperbarui',
      id: result.insertId,
      tanggal: tanggal,
      kode_pelanggan: kode_pelanggan,
      keterangan: activity,
      tabung: jumlah_tabung,
      harga: 0,
      tambahan_deposit: 0,
      pengurangan_deposit: 0,
      sisa_deposit: sisa_deposit,
      konfirmasi: 0,
      list_tabung: tabung,
      tabung_list: tabung,
      stok_results: stokResults,
      stok_summary: {
        total: tabung.length,
        successful: stokResults.filter(r => r.success).length,
        failed: stokResults.filter(r => !r.success).length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// API untuk mengambil data pelanggan berdasarkan kode_pelanggan
router.get('/pelanggan/:kode_pelanggan', authKepalaGudang, async (req, res) => {
  const { kode_pelanggan } = req.params;
  
  if (!kode_pelanggan) {
    return res.status(400).json({ 
      message: 'Kode pelanggan wajib diisi' 
    });
  }
  
  try {
    // Get data pelanggan dari tabel pelanggans - hanya data utama
    const [pelangganData] = await db.query(`
      SELECT * FROM pelanggans 
      WHERE kode_pelanggan = ?
    `, [kode_pelanggan]);
    
    if (pelangganData.length === 0) {
      return res.status(404).json({ 
        message: 'Data pelanggan tidak ditemukan',
        kode_pelanggan: kode_pelanggan 
      });
    }
    
    const pelanggan = pelangganData[0];
    
    res.json({
      message: 'Data pelanggan berhasil diambil',
      kode_pelanggan: kode_pelanggan,
      nama_pelanggan: pelanggan.nama_pelanggan,
      data: pelanggan
    });
    
  } catch (err) {
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      kode_pelanggan: kode_pelanggan 
    });
  }
});

// API untuk mengambil data gudang berdasarkan kode_gudang
router.get('/gudang/:kode_gudang', authKepalaGudang, async (req, res) => {
  const { kode_gudang } = req.params;
  
  if (!kode_gudang) {
    return res.status(400).json({ 
      message: 'Kode gudang wajib diisi' 
    });
  }
  
  try {
    // Get data gudang dari tabel gudangs - hanya data utama
    const [gudangData] = await db.query(`
      SELECT * FROM gudangs 
      WHERE kode_gudang = ?
    `, [kode_gudang]);
    
    if (gudangData.length === 0) {
      return res.status(404).json({ 
        message: 'Data gudang tidak ditemukan',
        kode_gudang: kode_gudang 
      });
    }
    
    const gudang = gudangData[0];
    
    res.json({
      message: 'Data gudang berhasil diambil',
      kode_gudang: kode_gudang,
      nama_gudang: gudang.nama_gudang,
      data: gudang
    });
    
  } catch (err) {
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      kode_gudang: kode_gudang 
    });
  }
});

module.exports = router;