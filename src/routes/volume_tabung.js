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
    if (!tabung[i].qr_code || typeof tabung[i].volume !== 'number') {
      return res.status(400).json({
        message: 'Format tabung tidak valid. Setiap tabung harus memiliki qr_code dan volume (number)'
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
      INSERT INTO volume_tabungs (tanggal, lokasi, tabung, nama, keterangan, created_at) 
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
    
    res.json({ 
      message: 'Data volume tabung berhasil disimpan',
      id: result.insertId,
      tanggal: tanggal,
      total_tabung: tabung.length,
      total_volume: `${total_volume} m³`,
      keterangan: keterangan || '',
      created_at: created_at
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;