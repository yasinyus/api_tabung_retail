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

router.get('/dashboard', authUser, async (req, res) => {
  try {
    // Get total jumlah tabung dari tabel tabungs
    const [totalTabung] = await db.query('SELECT COUNT(*) as total_tabung FROM tabungs');
    const total_tabung = totalTabung[0].total_tabung;
    
    // Get distribusi tabung berdasarkan lokasi dari tabel stok_tabung
    const [distribusiLokasi] = await db.query(`
      SELECT 
        lokasi, 
        COUNT(*) as jumlah_tabung,
        COUNT(CASE WHEN status = 'Isi' THEN 1 END) as tabung_isi,
        COUNT(CASE WHEN status = 'Kosong' THEN 1 END) as tabung_kosong
      FROM stok_tabung 
      WHERE lokasi IS NOT NULL 
      GROUP BY lokasi 
      ORDER BY jumlah_tabung DESC
    `);
    
    // Get summary berdasarkan status
    const [statusSummary] = await db.query(`
      SELECT 
        status,
        COUNT(*) as jumlah
      FROM stok_tabung 
      GROUP BY status
    `);
    
    // Calculate total tabung in stok_tabung
    const [totalStokTabung] = await db.query('SELECT COUNT(*) as total_stok FROM stok_tabung');
    const total_stok = totalStokTabung[0].total_stok;
    
    res.json({
      message: 'Dashboard data berhasil diambil',
      summary: {
        total_tabung_master: total_tabung,
        total_tabung_stok: total_stok,
        total_lokasi: distribusiLokasi.length
      },
      distribusi_lokasi: distribusiLokasi,
      status_summary: statusSummary,
      generated_at: new Date()
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/stok/search', authUser, async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ message: 'Parameter query "q" diperlukan untuk search kode_tabung' });
  }
  
  try {
    // Search stok_tabung berdasarkan kode_tabung (partial match)
    const [stokResults] = await db.query(`
      SELECT 
        st.id,
        st.kode_tabung,
        st.status,
        st.volume,
        st.lokasi,
        st.tanggal_update,
        st.created_at,
        t.seri_tabung,
        t.siklus
      FROM stok_tabung st
      LEFT JOIN tabungs t ON st.kode_tabung = t.kode_tabung
      WHERE st.kode_tabung LIKE ?
      ORDER BY st.kode_tabung ASC
    `, [`%${q}%`]);
    
    if (stokResults.length === 0) {
      return res.json({
        message: 'Data stok tabung tidak ditemukan',
        query: q,
        total_found: 0,
        data: []
      });
    }
    
    res.json({
      message: 'Data stok tabung berhasil ditemukan',
      query: q,
      total_found: stokResults.length,
      data: stokResults
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/stok/:kode_tabung', authUser, async (req, res) => {
  const { kode_tabung } = req.params;
  
  try {
    // Get specific stok_tabung berdasarkan exact kode_tabung
    const [stokResult] = await db.query(`
      SELECT 
        st.id,
        st.kode_tabung,
        st.status,
        st.volume,
        st.lokasi,
        st.tanggal_update,
        st.created_at,
        t.seri_tabung,
        t.siklus
      FROM stok_tabung st
      LEFT JOIN tabungs t ON st.kode_tabung = t.kode_tabung
      WHERE st.kode_tabung = ?
    `, [kode_tabung]);
    
    if (stokResult.length === 0) {
      return res.status(404).json({
        message: 'Stok tabung tidak ditemukan',
        kode_tabung: kode_tabung
      });
    }
    
    res.json({
      message: 'Data stok tabung berhasil ditemukan',
      kode_tabung: kode_tabung,
      data: stokResult[0]
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
