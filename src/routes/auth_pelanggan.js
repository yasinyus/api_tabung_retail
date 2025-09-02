const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const bcrypt = require('bcrypt');

router.post('/', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM pelanggans WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const pelanggan = rows[0];
    let hashedPassword = pelanggan.password;
    if (hashedPassword.startsWith('$2y$')) {
      hashedPassword = '$2b$' + hashedPassword.slice(4);
    }
    const match = await bcrypt.compare(password, hashedPassword);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ 
      id: pelanggan.id, 
      role: 'pelanggan', 
      name: pelanggan.nama_pelanggan || pelanggan.nama,
      email: pelanggan.email 
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    
    res.json({ 
      token, 
      pelanggan: { 
        id: pelanggan.id, 
        role: 'pelanggan', 
        nama_pelanggan: pelanggan.nama_pelanggan,
        lokasi_pelanggan: pelanggan.lokasi_pelanggan,
        harga_tabung: pelanggan.harga_tabung,
        jenis_pelanggan: pelanggan.jenis_pelanggan,
        penanggung_jawab: pelanggan.penanggung_jawab,
        email: pelanggan.email,
        kode_pelanggan: pelanggan.kode_pelanggan
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;