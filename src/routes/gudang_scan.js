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

router.get('/scan/:qr_code', authUser, async (req, res) => {
  const { qr_code } = req.params;
  
  if (!qr_code) {
    return res.status(400).json({ message: 'QR code required' });
  }
  
  try {
    const [rows] = await db.query('SELECT * FROM gudangs WHERE qr_code = ?', [qr_code]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Gudang not found' });
    }
    
    res.json({ 
      message: 'Gudang found',
      data: rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
