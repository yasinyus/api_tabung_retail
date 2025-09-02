const express = require('express');
const router = express.Router();
const db = require('../../db');
const jwt = require('jsonwebtoken');

function authKepalaGudang(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'driver') {
      return res.status(403).json({ message: 'Forbidden: Not Driver' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.post('/tabung_turun_gudang', authKepalaGudang, async (req, res) => {
  const { lokasi_gudang, armada, tabung, keterangan } = req.body;
  // tabung: array of tabung QR
  if (!lokasi_gudang || !armada || !Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
    const id_user = req.user.id;
    const nama_petugas = req.user.name;
    const total_tabung = tabung.length;
    const tanggal = new Date().toLocaleDateString('id-ID'); // DD/MM/YYYY
    const nama_aktivitas = 'Tabung Turun di Gudang';
    const status = 'Isi';
    try {
      const [result] = await db.query(
        'INSERT INTO aktivitas_tabung (lokasi_gudang, armada, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [lokasi_gudang, armada, JSON.stringify(tabung), keterangan || '', nama_petugas, id_user, total_tabung, tanggal, nama_aktivitas, status]
      );
    res.json({ message: 'Data dikirim', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
