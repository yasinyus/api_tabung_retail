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

// GET Saldo pelanggan berdasarkan kode_pelanggan (exact match)
router.get('/saldo/:kode_pelanggan', authUser, async (req, res) => {
  const { kode_pelanggan } = req.params;
  
  if (!kode_pelanggan) {
    return res.status(400).json({ message: 'kode_pelanggan is required' });
  }

  try {
    // Join saldo_pelanggans dengan pelanggans untuk mendapatkan data lengkap
    const [saldoData] = await db.query(`
      SELECT 
        sp.id as saldo_id,
        sp.kode_pelanggan,
        sp.saldo,
        sp.created_at as saldo_created_at,
        sp.updated_at as saldo_updated_at,
        p.id as pelanggan_id,
        p.nama_pelanggan,
        p.harga_tabung,
        p.created_at as pelanggan_created_at
      FROM saldo_pelanggans sp
      JOIN pelanggans p ON sp.kode_pelanggan = p.kode_pelanggan
      WHERE sp.kode_pelanggan = ?
    `, [kode_pelanggan]);

    if (saldoData.length === 0) {
      return res.status(404).json({ 
        message: 'Saldo pelanggan tidak ditemukan',
        kode_pelanggan: kode_pelanggan 
      });
    }

    const pelanggan = saldoData[0];

    res.json({
      message: 'Saldo pelanggan berhasil ditemukan',
      data: {
        saldo_info: {
          saldo_id: pelanggan.saldo_id,
          saldo: parseFloat(pelanggan.saldo || 0),
          currency: 'IDR',
          last_updated: pelanggan.saldo_updated_at,
          created_at: pelanggan.saldo_created_at
        },
        pelanggan_info: {
          pelanggan_id: pelanggan.pelanggan_id,
          kode_pelanggan: pelanggan.kode_pelanggan,
          nama_pelanggan: pelanggan.nama_pelanggan,
          alamat: pelanggan.alamat,
          telepon: pelanggan.telepon,
          harga_tabung: parseFloat(pelanggan.harga_tabung || 0),
          created_at: pelanggan.pelanggan_created_at
        }
      }
    });

  } catch (err) {
    console.error('Error getting saldo pelanggan:', err.message);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      kode_pelanggan: kode_pelanggan
    });
  }
});

// GET Search saldo pelanggan berdasarkan nama_pelanggan atau kode_pelanggan
router.get('/saldo/search/:query', authUser, async (req, res) => {
  const { query } = req.params;
  const { limit = 10 } = req.query;
  
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    // Search berdasarkan nama_pelanggan atau kode_pelanggan (LIKE search)
    const [saldoData] = await db.query(`
      SELECT 
        sp.id as saldo_id,
        sp.kode_pelanggan,
        sp.saldo,
        sp.created_at as saldo_created_at,
        sp.updated_at as saldo_updated_at,
        p.id as pelanggan_id,
        p.nama_pelanggan,
        p.harga_tabung,
        p.created_at as pelanggan_created_at
      FROM saldo_pelanggans sp
      JOIN pelanggans p ON sp.kode_pelanggan = p.kode_pelanggan
      WHERE p.nama_pelanggan LIKE ? OR p.kode_pelanggan LIKE ?
      ORDER BY p.nama_pelanggan ASC
      LIMIT ?
    `, [`%${query}%`, `%${query}%`, parseInt(limit)]);

    if (saldoData.length === 0) {
      return res.json({ 
        message: 'Tidak ada saldo pelanggan yang ditemukan',
        query: query,
        total_found: 0,
        data: []
      });
    }

    // Process data untuk response
    const processedData = saldoData.map(pelanggan => ({
      saldo_info: {
        saldo_id: pelanggan.saldo_id,
        saldo: parseFloat(pelanggan.saldo || 0),
        currency: 'IDR',
        last_updated: pelanggan.saldo_updated_at,
        created_at: pelanggan.saldo_created_at
      },
      pelanggan_info: {
        pelanggan_id: pelanggan.pelanggan_id,
        kode_pelanggan: pelanggan.kode_pelanggan,
        nama_pelanggan: pelanggan.nama_pelanggan,
        harga_tabung: parseFloat(pelanggan.harga_tabung || 0),
        created_at: pelanggan.pelanggan_created_at
      }
    }));

    res.json({
      message: 'Search saldo pelanggan berhasil',
      query: query,
      total_found: saldoData.length,
      data: processedData
    });

  } catch (err) {
    console.error('Error searching saldo pelanggan:', err.message);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      query: query
    });
  }
});

// GET List semua saldo pelanggan dengan pagination
router.get('/saldo-list', authUser, async (req, res) => {
  const { page = 1, limit = 20, sort_by = 'nama_pelanggan', order = 'ASC' } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total 
      FROM saldo_pelanggans sp
      JOIN pelanggans p ON sp.kode_pelanggan = p.kode_pelanggan
    `);
    const totalRecords = countResult[0].total;

    // Validate sort_by untuk keamanan
    const allowedSortFields = ['nama_pelanggan', 'kode_pelanggan', 'saldo', 'saldo_created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'nama_pelanggan';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get saldo data dengan pagination
    const [saldoData] = await db.query(`
      SELECT 
        sp.id as saldo_id,
        sp.kode_pelanggan,
        sp.saldo,
        sp.created_at as saldo_created_at,
        sp.updated_at as saldo_updated_at,
        p.id as pelanggan_id,
        p.nama_pelanggan,
        p.harga_tabung,
        p.created_at as pelanggan_created_at
      FROM saldo_pelanggans sp
      JOIN pelanggans p ON sp.kode_pelanggan = p.kode_pelanggan
      ORDER BY ${sortField === 'saldo' ? 'sp.saldo' : sortField === 'saldo_created_at' ? 'sp.created_at' : 'p.' + sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    // Process data
    const processedData = saldoData.map(pelanggan => ({
      saldo_info: {
        saldo_id: pelanggan.saldo_id,
        saldo: parseFloat(pelanggan.saldo || 0),
        currency: 'IDR',
        last_updated: pelanggan.saldo_updated_at,
        created_at: pelanggan.saldo_created_at
      },
      pelanggan_info: {
        pelanggan_id: pelanggan.pelanggan_id,
        kode_pelanggan: pelanggan.kode_pelanggan,
        nama_pelanggan: pelanggan.nama_pelanggan,
        harga_tabung: parseFloat(pelanggan.harga_tabung || 0),
        created_at: pelanggan.pelanggan_created_at
      }
    }));

    // Calculate summary
    const totalSaldo = saldoData.reduce((sum, item) => sum + parseFloat(item.saldo || 0), 0);

    res.json({
      message: 'List saldo pelanggan berhasil diambil',
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit)
      },
      summary: {
        total_pelanggan: totalRecords,
        total_saldo: parseFloat(totalSaldo.toFixed(2)),
        currency: 'IDR'
      },
      sort_info: {
        sort_by: sortField,
        order: sortOrder
      },
      data: processedData
    });

  } catch (err) {
    console.error('Error getting list saldo pelanggan:', err.message);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

module.exports = router;