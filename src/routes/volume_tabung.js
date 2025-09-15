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
  const { lokasi, tabung, volume_total, status, nama, keterangan } = req.body;
  
  if (!lokasi || !tabung || !nama || typeof volume_total !== 'number') {
    return res.status(400).json({ 
      message: 'Field wajib diisi: lokasi, tabung, volume_total, nama' 
    });
  }
  
  if (!Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ 
      message: 'Tabung harus berupa array dan tidak boleh kosong' 
    });
  }
  
  // Hitung volume per tabung dari pembagian volume_total
  const volume_per_tabung = volume_total / tabung.length;
  
  // Update array tabung dengan volume yang dihitung
  const tabungWithVolume = tabung.map(item => ({
    kode_tabung: item.kode_tabung,
    volume: volume_per_tabung
  }));
  
  // Validasi format tabung dan cek keberadaan di tabel tabungs
  for (let i = 0; i < tabung.length; i++) {
    if (!tabung[i].kode_tabung) {
      return res.status(400).json({
        message: 'Format tabung tidak valid. Setiap tabung harus memiliki kode_tabung'
      });
    }
    
    // Cek apakah kode_tabung exist di tabel tabungs
    const [tabungExists] = await db.query(
      'SELECT kode_tabung FROM tabungs WHERE kode_tabung = ?', 
      [tabung[i].kode_tabung]
    );
    
    if (tabungExists.length === 0) {
      return res.status(400).json({
        message: `Kode tabung ${tabung[i].kode_tabung} tidak ditemukan di database`
      });
    }
  }
  
  try {
    // Format tanggal YYYY-MM-DD
    const today = new Date();
    const tanggal = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    // Format created_at YYYY-MM-DD HH:MM:SS
    const created_at = new Date();
    
    // Status tabung: isi/kosong, default isi
    const status_tabung = status || 'isi';
    
    const query = `
      INSERT INTO volume_tabungs (tanggal, lokasi, tabung, nama, volume_total, status, keterangan, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.query(query, [
      tanggal,
      lokasi,
      JSON.stringify(tabungWithVolume), // Simpan array tabung dengan volume yang dihitung
      nama,
      volume_total,
      status_tabung,
      keterangan || '', // Keterangan opsional
      created_at
    ]);
    
    // Update/Insert ke tabel stok_tabung untuk setiap tabung
    const tanggal_update = new Date();
    
    for (const item of tabungWithVolume) {
      // Cek apakah kode_tabung sudah ada
      const [existingStock] = await db.query(
        'SELECT id FROM stok_tabung WHERE kode_tabung = ?', 
        [item.kode_tabung]
      );
      
      if (existingStock.length > 0) {
        // Update jika sudah ada
        await db.query(
          'UPDATE stok_tabung SET status = ?, volume = ?, lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?',
          ['Isi', item.volume, lokasi, tanggal_update, item.kode_tabung]
        );
      } else {
        // Insert jika belum ada
        await db.query(
          'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [item.kode_tabung, 'Isi', item.volume, lokasi, tanggal_update, tanggal_update]
        );
      }
    }
    
    res.json({ 
      message: 'Data volume tabung berhasil disimpan dan stok diperbarui',
      id: result.insertId,
      tanggal: tanggal,
      total_tabung: tabung.length,
      volume_total: volume_total,
      volume_per_tabung: volume_per_tabung,
      status: status_tabung,
      keterangan: keterangan || '',
      tabung_detail: tabungWithVolume,
      stok_updated: `${tabungWithVolume.length} tabung diperbarui`,
      created_at: created_at
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;