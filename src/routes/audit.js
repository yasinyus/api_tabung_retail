const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.post('/simpan', authUser, async (req, res) => {
  const { lokasi, tabung, nama, keterangan } = req.body;
  
  if (!lokasi || !tabung || !nama) {
    return res.status(400).json({ 
      message: 'Field wajib diisi: lokasi, tabung, nama' 
    });
  }
  
  if (!Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ 
      message: 'Tabung harus berupa array dan tidak boleh kosong' 
    });
  }
  
  // Validasi format tabung
  for (let i = 0; i < tabung.length; i++) {
    if (!tabung[i].qr_code) {
      return res.status(400).json({
        message: 'Format tabung tidak valid. Setiap tabung harus memiliki qr_code'
      });
    }
  }
  
  try {
    // Format tanggal YYYY-MM-DD
    const today = new Date();
    const tanggal = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    // Format created_at YYYY-MM-DD HH:MM:SS
    const created_at = new Date();
    
    // Hitung total volume dari semua tabung (satuan m³)
    const total_volume = tabung.reduce((sum, item) => sum + item.volume, 0);
    
    const query = `
      INSERT INTO audits (tanggal, lokasi, tabung, nama, keterangan, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.query(query, [
      tanggal,
      lokasi,
      JSON.stringify(tabung), // Simpan array tabung sebagai JSON
      nama,
      keterangan || '', // Keterangan opsional
      created_at
    ]);
    
    // Update lokasi di tabel stok_tabung berdasarkan hasil audit
    for (const item of tabung) {
      if (item.qr_code) {
        try {
          await db.query(
            'UPDATE stok_tabung SET lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?',
            [lokasi, created_at, item.qr_code]
          );
        } catch (updateError) {
          console.log(`Warning: Gagal update lokasi untuk tabung ${item.qr_code}:`, updateError.message);
        }
      }
    }
    
    res.json({ 
      message: 'Data audit berhasil disimpan dan lokasi tabung diperbarui',
      id: result.insertId,
      tanggal: tanggal,
      total_tabung: tabung.length,
      lokasi_audit: lokasi,
      tabung_updated: tabung.length,
      keterangan: keterangan || '',
      created_at: created_at
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/search/:kode_tabung', authUser, async (req, res) => {
  const { kode_tabung } = req.params;
  
  if (!kode_tabung) {
    return res.status(400).json({ 
      message: 'Kode tabung wajib diisi' 
    });
  }
  
  try {
    // Cari data audit yang mengandung kode_tabung dalam JSON column tabung
    const query = `
      SELECT * FROM audits 
      WHERE JSON_SEARCH(tabung, 'one', ?) IS NOT NULL 
      ORDER BY created_at DESC
    `;
    
    const [rows] = await db.query(query, [kode_tabung]);
    
    if (rows.length === 0) {
      return res.json({ 
        message: 'Data audit tidak ditemukan untuk tabung ini',
        kode_tabung: kode_tabung,
        total_records: 0,
        data: []
      });
    }
    
    // Format data untuk response
    const formattedData = rows.map(row => {
      let tabungData = [];
      try {
        // Coba parse JSON, jika gagal gunakan array kosong
        tabungData = typeof row.tabung === 'string' ? JSON.parse(row.tabung) : row.tabung;
      } catch (parseError) {
        console.log('Error parsing JSON for row:', row.id, parseError);
        tabungData = [];
      }
      
      return {
        id: row.id,
        tanggal_audit: row.tanggal,
        lokasi: row.lokasi,
        auditor: row.nama,
        status: row.status || '-',
        keterangan: row.keterangan,
        terakhir_audit: row.created_at,
        tabung_dalam_audit: tabungData
      };
    });
    
    res.json({ 
      message: `History Data Tabung: ${kode_tabung}`,
      subtitle: 'Riwayat audit',
      kode_tabung: kode_tabung,
      total_records: rows.length,
      summary: `Total ${rows.length} riwayat audit untuk tabung ${kode_tabung}`,
      data: formattedData
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;