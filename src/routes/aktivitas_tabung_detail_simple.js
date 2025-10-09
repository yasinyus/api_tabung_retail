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

// GET /api/aktivitas-tabung/:id - Mendapatkan detail aktivitas tabung berdasarkan ID
router.get('/:id', authUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID tidak valid' });
    }

    // Query sederhana untuk mendapatkan data aktivitas_tabung berdasarkan ID
    const [aktivitasData] = await db.query(`
      SELECT * FROM aktivitas_tabung WHERE id = ?
    `, [id]);

    if (aktivitasData.length === 0) {
      return res.status(404).json({ message: 'Data aktivitas tabung tidak ditemukan' });
    }

    const aktivitas = aktivitasData[0];

    // Parse JSON tabung untuk mendapatkan array kode_tabung
    let tabungArray = [];
    try {
      tabungArray = typeof aktivitas.tabung === 'string' ? JSON.parse(aktivitas.tabung) : aktivitas.tabung;
      if (!Array.isArray(tabungArray)) {
        tabungArray = [];
      }
    } catch (e) {
      console.error('Error parsing tabung JSON:', e);
      tabungArray = [];
    }

    // Response hanya data dari aktivitas_tabung
    res.json({
      message: 'Data aktivitas tabung berhasil diambil',
      data: {
        ...aktivitas,
        tabung: tabungArray,
        total_tabung_parsed: tabungArray.length
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;