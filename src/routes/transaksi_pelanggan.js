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
    if (decoded.role !== 'pelanggan' && decoded.role !== 'driver') {
      return res.status(403).json({ message: 'Access denied. Pelanggan or Driver only.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.get('/transaksi/:customer_id', authPelanggan, async (req, res) => {
  const { customer_id } = req.params;
  
  if (!customer_id) {
    return res.status(400).json({ 
      message: 'Customer ID wajib diisi' 
    });
  }
  
  try {
    const [rows] = await db.query(
      'SELECT * FROM transactions WHERE customer_id = ? ORDER BY created_at DESC', 
      [customer_id]
    );
    
    if (rows.length === 0) {
      return res.json({ 
        message: 'Data transaksi tidak ditemukan',
        customer_id: customer_id,
        data: []
      });
    }
    
    res.json({ 
      message: 'Data transaksi ditemukan',
      customer_id: customer_id,
      total_records: rows.length,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// API untuk insert data detail_transaksi
router.post('/detail-transaksi', authPelanggan, async (req, res) => {
  const { trx_id, tabung } = req.body;
  
  if (!trx_id || !tabung) {
    return res.status(400).json({ 
      message: 'Field wajib diisi: trx_id, tabung' 
    });
  }
  
  if (!Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ 
      message: 'Tabung harus berupa array dan tidak boleh kosong' 
    });
  }
  
  // Validasi format tabung
  for (let i = 0; i < tabung.length; i++) {
    if (!tabung[i].kode_tabung || typeof tabung[i].volume !== 'number') {
      return res.status(400).json({
        message: 'Format tabung tidak valid. Setiap tabung harus memiliki kode_tabung dan volume (number)'
      });
    }
  }
  
  try {
    // Cek apakah trx_id exists di tabel transactions
    const [trxExists] = await db.query('SELECT id FROM transactions WHERE trx_id = ?', [trx_id]);
    if (trxExists.length === 0) {
      return res.status(404).json({
        message: 'Transaction ID tidak ditemukan'
      });
    }
    
    const created_at = new Date();
    
    const query = `
      INSERT INTO detail_transaksi (trx_id, tabung, created_at) 
      VALUES (?, ?, ?)
    `;
    
    const [result] = await db.query(query, [
      trx_id,
      JSON.stringify(tabung), // Simpan array tabung sebagai JSON
      created_at
    ]);
    
    res.json({ 
      message: 'Data detail transaksi berhasil disimpan',
      id: result.insertId,
      trx_id: trx_id,
      total_tabung: tabung.length,
      tabung_detail: tabung,
      created_at: created_at
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
