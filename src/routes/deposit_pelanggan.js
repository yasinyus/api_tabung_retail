const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

function authPelanggan(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'pelanggan') {
      return res.status(403).json({ message: 'Access denied. Pelanggan only.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.get('/deposit/:kode_pelanggan', authPelanggan, async (req, res) => {
  const { kode_pelanggan } = req.params;
  
  if (!kode_pelanggan) {
    return res.status(400).json({ 
      message: 'Kode pelanggan wajib diisi' 
    });
  }
  
  try {
    const [rows] = await db.query(
      'SELECT * FROM deposits WHERE kode_pelanggan = ? ORDER BY created_at DESC', 
      [kode_pelanggan]
    );
    
    if (rows.length === 0) {
      return res.json({ 
        message: 'Data deposit tidak ditemukan',
        kode_pelanggan: kode_pelanggan,
        data: []
      });
    }
    
    res.json({ 
      message: 'Data deposit ditemukan',
      kode_pelanggan: kode_pelanggan,
      total_records: rows.length,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
