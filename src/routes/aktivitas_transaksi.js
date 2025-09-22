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

// Generate unique transaction ID
function generateTrxId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `TRX-${(timestamp + random).toUpperCase()}`;
}

router.post('/aktivitas-transaksi', authKepalaGudang, async (req, res) => {
  const { activity, dari, tujuan, tabung, keterangan, status } = req.body;
  
  // Validasi input
  if (!activity || !dari || !tujuan || !Array.isArray(tabung) || tabung.length === 0 || !status) {
    return res.status(400).json({ message: 'Missing required fields: activity, dari, tujuan, tabung, status' });
  }
  
  const id_user = req.user.id;
  const nama_petugas = req.user.name;
  const total_tabung = tabung.length;
  const tanggal = new Date().toLocaleDateString('id-ID');
  const waktu = new Date();
  const transaction_date = new Date();
  
  try {
    // Jika status bukan "Kosong", lakukan proses transaksi dengan pelanggan
    if (status !== "Kosong") {
      // Cek data pelanggan untuk mendapatkan harga_tabung dan id (tujuan adalah kode_pelanggan)
      const [pelangganData] = await db.query('SELECT id, harga_tabung FROM pelanggans WHERE kode_pelanggan = ?', [tujuan]);
      if (pelangganData.length === 0) {
        return res.status(404).json({ message: 'Customer tidak ditemukan' });
      }
      
      const customer_id = pelangganData[0].id;
    const harga_per_tabung = parseFloat(pelangganData[0].harga_tabung);
    let total_harga = 0;
    let tabung_details = [];
    
    // Hitung total harga berdasarkan volume setiap tabung
    for (const kode_tabung of tabung) {
      // Ambil volume dari stok_tabung berdasarkan kode_tabung
      const [stokData] = await db.query('SELECT volume FROM stok_tabung WHERE kode_tabung = ?', [kode_tabung]);
      if (stokData.length > 0) {
        const volume = parseFloat(stokData[0].volume);
        const harga_tabung = harga_per_tabung * volume;
        total_harga += harga_tabung;
        
        // Simpan detail tabung dengan volume
        tabung_details.push({
          kode_tabung: kode_tabung,
          volume: volume,
          harga_per_m3: harga_per_tabung,
          subtotal: harga_tabung
        });
      }
    }      // Generate transaction ID
      const trx_id = generateTrxId();
      
      // Insert ke tabel aktivitas_tabung
      const [activityResult] = await db.query(
        'INSERT INTO aktivitas_tabung (dari, tujuan, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, waktu, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [dari, tujuan, JSON.stringify(tabung), keterangan || '', nama_petugas, id_user, total_tabung, tanggal, waktu, activity, status]
      );
      
      // Update atau insert ke tabel stok_tabung berdasarkan kode_tabung
      console.log('Starting stok_tabung update/insert process for Isi status');
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
              [status, tujuan, waktu, kode_tabung]
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
              [kode_tabung, status, 0, tujuan, waktu, waktu]
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
      
      console.log('Finished stok_tabung update/insert process for Isi status');
      
      // Insert ke tabel transactions
      try {
        const [transactionResult] = await db.query(
          'INSERT INTO transactions (trx_id, user_id, customer_id, transaction_date, type, total, jumlah_tabung, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [trx_id, id_user, customer_id, transaction_date, 'purchase', total_harga, total_tabung, 'cash', 'paid', waktu]
        );
        
        // Insert ke tabel detail_transaksi dengan array semua tabung
        const tabung_array = tabung_details.map(detail => ({
          kode_tabung: detail.kode_tabung,
          volume: detail.volume
        }));
        
        await db.query(
          'INSERT INTO detail_transaksi (trx_id, tabung, created_at) VALUES (?, ?, ?)',
          [trx_id, JSON.stringify(tabung_array), waktu]
        );
        
        // Kurangi saldo pelanggan setelah transaksi berhasil
        await db.query('UPDATE saldo_pelanggans SET saldo = saldo - ? WHERE kode_pelanggan = ?', [total_harga, tujuan]);
        
        // Get sisa deposit setelah pengurangan
        const [saldoData] = await db.query('SELECT saldo FROM saldo_pelanggans WHERE kode_pelanggan = ?', [tujuan]);
        const sisa_deposit = saldoData.length > 0 ? saldoData[0].saldo : 0;
        
        // Insert ke tabel laporan_pelanggan
        const today = new Date();
        const tanggal_laporan = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        await db.query(
          'INSERT INTO laporan_pelanggan (tanggal, kode_pelanggan, keterangan, tabung, harga, tambahan_deposit, pengurangan_deposit, sisa_deposit, konfirmasi, list_tabung, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [tanggal_laporan, tujuan, 'Tagihan', total_tabung, total_harga, 0, total_harga, sisa_deposit, 0, JSON.stringify(tabung), waktu]
        );
        
        res.json({ 
          message: 'Data aktivitas dan transaksi berhasil disimpan, saldo pelanggan telah dikurangi',
          aktivitas_id: activityResult.insertId,
          transaction_id: transactionResult.insertId,
          trx_id: trx_id,
          total_tabung: total_tabung,
          total_harga: total_harga,
          customer_id: tujuan,
          saldo_dikurangi: total_harga,
          tabung_details: tabung_details,
          stok_results: stokResults,
          stok_summary: {
            total: tabung.length,
            successful: stokResults.filter(r => r.success).length,
            failed: stokResults.filter(r => !r.success).length
          }
        });
      } catch (transactionError) {
        console.log('Transaction insert error:', transactionError.message);
        // Jika insert transaction gagal, tetap return success untuk aktivitas
        res.json({ 
          message: 'Data aktivitas berhasil disimpan, tetapi transaksi gagal',
          aktivitas_id: activityResult.insertId,
          total_tabung: total_tabung,
          total_harga: total_harga,
          customer_id: tujuan,
          transaction_error: transactionError.message,
          tabung_details: tabung_details,
          stok_results: stokResults,
          stok_summary: {
            total: tabung.length,
            successful: stokResults.filter(r => r.success).length,
            failed: stokResults.filter(r => !r.success).length
          }
        });
      }
    } else {
      // Jika status "Kosong", hanya insert ke aktivitas_tabung saja
      const [activityResult] = await db.query(
        'INSERT INTO aktivitas_tabung (dari, tujuan, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, waktu, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [dari, tujuan, JSON.stringify(tabung), keterangan || '', nama_petugas, id_user, total_tabung, tanggal, waktu, activity, status]
      );
      
      // Update atau insert ke tabel stok_tabung berdasarkan kode_tabung
      console.log('Starting stok_tabung update/insert process for Kosong status');
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
              [status, tujuan, waktu, kode_tabung]
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
              [kode_tabung, status, 0, tujuan, waktu, waktu]
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
      
      console.log('Finished stok_tabung update/insert process for Kosong status');
      
      res.json({ 
        message: 'Data aktivitas berhasil disimpan',
        aktivitas_id: activityResult.insertId,
        total_tabung: total_tabung,
        activity: activity,
        status: status,
        stok_results: stokResults,
        stok_summary: {
          total: tabung.length,
          successful: stokResults.filter(r => r.success).length,
          failed: stokResults.filter(r => !r.success).length
        }
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
