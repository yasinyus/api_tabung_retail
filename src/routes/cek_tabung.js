
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

// API untuk cek kode_tabung di tabel tabungs
router.get('/cek-tabung/:kode_tabung', authUser, async (req, res) => {
  const { kode_tabung } = req.params;
  try {
    const [result] = await db.query('SELECT * FROM tabungs WHERE kode_tabung = ?', [kode_tabung]);
    if (result.length === 0) {
      return res.status(404).json({ message: 'Tabung tidak ditemukan', kode_tabung });
    }
    return res.json({ found: true, tabung: result[0] });
  } catch (err) {
    return res.status(500).json({ message: 'Terjadi kesalahan server', error: err.message });
  }
});

module.exports = router;
