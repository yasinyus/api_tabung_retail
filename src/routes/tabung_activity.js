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

router.post('/tabung_activity', authKepalaGudang, async (req, res) => {
  const { dari, tujuan, tabung, keterangan, activity, status} = req.body;
  // tabung: array of tabung QR
  if (!dari || !tujuan || !Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const id_user = req.user.id;
  const nama_petugas = req.user.name;
  const total_tabung = tabung.length;
  const tanggal = new Date().toLocaleDateString('id-ID'); // DD/MM/YYYY
  const waktu = new Date(); // datetime otomatis
  // const nama_aktivitas = req.activity;
  // const status = req.status;
  try {
    const [result] = await db.query(
      'INSERT INTO aktivitas_tabung (dari, tujuan, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, waktu, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [dari, tujuan, JSON.stringify(tabung), keterangan || '', nama_petugas, id_user, total_tabung, tanggal, waktu, activity, status]
    );
    res.json({ message: 'Sukses', id: result.insertId, total_tabung: total_tabung });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
