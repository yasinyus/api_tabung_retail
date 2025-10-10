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

// GET /api/stok-tabung/lokasi/:lokasi - Cek stok tabung berdasarkan lokasi
router.get('/lokasi/:lokasi', authUser, async (req, res) => {
  try {
    const { lokasi } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      search = '',
      sort_by = 'kode_tabung',
      sort_order = 'ASC'
    } = req.query;

    if (!lokasi) {
      return res.status(400).json({ message: 'Lokasi wajib diisi' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereConditions = ['lokasi = ?'];
    let queryParams = [lokasi];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push('kode_tabung LIKE ?');
      queryParams.push(`%${search}%`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Validasi sort_by
    const allowedSortFields = ['kode_tabung', 'status', 'volume', 'tanggal_update'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'kode_tabung';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Query untuk mendapatkan data dengan pagination
    const dataQuery = `
      SELECT 
        id,
        kode_tabung,
        status,
        lokasi,
        volume,
        tanggal_update,
        created_at
      FROM stok_tabung 
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const [data] = await db.query(dataQuery, queryParams);

    // Query untuk mendapatkan total count
    const countQuery = `SELECT COUNT(*) as total FROM stok_tabung ${whereClause}`;
    const countParams = queryParams.slice(0, -2); // Hapus limit dan offset
    const [countResult] = await db.query(countQuery, countParams);
    const totalRecords = countResult[0].total;

    // Query untuk statistik lokasi
    const [statsData] = await db.query(`
      SELECT 
        COUNT(*) as total_tabung,
        SUM(CASE WHEN status = 'Isi' THEN 1 ELSE 0 END) as tabung_isi,
        SUM(CASE WHEN status = 'Kosong' THEN 1 ELSE 0 END) as tabung_kosong,
        SUM(CASE WHEN status = 'Rusak' THEN 1 ELSE 0 END) as tabung_rusak,
        SUM(CASE WHEN volume > 0 THEN volume ELSE 0 END) as total_volume
      FROM stok_tabung 
      WHERE lokasi = ?
    `, [lokasi]);

    // Hitung pagination
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      message: 'Data stok tabung berhasil diambil',
      lokasi: lokasi,
      statistik: {
        total_tabung: statsData[0].total_tabung,
        tabung_isi: statsData[0].tabung_isi,
        tabung_kosong: statsData[0].tabung_kosong,
        tabung_rusak: statsData[0].tabung_rusak,
        total_volume: parseFloat(statsData[0].total_volume || 0)
      },
      data: data,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_records: totalRecords,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      },
      filters: {
        lokasi: lokasi,
        status: status || null,
        search: search || null,
        sort_by: sortField,
        sort_order: sortDirection
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/stok-tabung/ringkasan - Ringkasan stok semua lokasi
router.get('/ringkasan', authUser, async (req, res) => {
  try {
    // Ringkasan per lokasi
    const [ringkasanLokasi] = await db.query(`
      SELECT 
        lokasi,
        COUNT(*) as total_tabung,
        SUM(CASE WHEN status = 'Isi' THEN 1 ELSE 0 END) as tabung_isi,
        SUM(CASE WHEN status = 'Kosong' THEN 1 ELSE 0 END) as tabung_kosong,
        SUM(CASE WHEN status = 'Rusak' THEN 1 ELSE 0 END) as tabung_rusak,
        SUM(CASE WHEN volume > 0 THEN volume ELSE 0 END) as total_volume
      FROM stok_tabung 
      GROUP BY lokasi
      ORDER BY lokasi ASC
    `);

    // Total keseluruhan
    const [totalKeseluruhan] = await db.query(`
      SELECT 
        COUNT(*) as total_tabung,
        SUM(CASE WHEN status = 'Isi' THEN 1 ELSE 0 END) as tabung_isi,
        SUM(CASE WHEN status = 'Kosong' THEN 1 ELSE 0 END) as tabung_kosong,
        SUM(CASE WHEN status = 'Rusak' THEN 1 ELSE 0 END) as tabung_rusak,
        SUM(CASE WHEN volume > 0 THEN volume ELSE 0 END) as total_volume,
        COUNT(DISTINCT lokasi) as total_lokasi
      FROM stok_tabung
    `);

    // Format data ringkasan lokasi
    const ringkasanData = ringkasanLokasi.map(item => ({
      lokasi: item.lokasi,
      total_tabung: item.total_tabung,
      tabung_isi: item.tabung_isi,
      tabung_kosong: item.tabung_kosong,
      tabung_rusak: item.tabung_rusak,
      total_volume: parseFloat(item.total_volume || 0),
      persentase_isi: item.total_tabung > 0 ? ((item.tabung_isi / item.total_tabung) * 100).toFixed(2) : 0
    }));

    res.json({
      message: 'Ringkasan stok tabung berhasil diambil',
      total_keseluruhan: {
        total_tabung: totalKeseluruhan[0].total_tabung,
        tabung_isi: totalKeseluruhan[0].tabung_isi,
        tabung_kosong: totalKeseluruhan[0].tabung_kosong,
        tabung_rusak: totalKeseluruhan[0].tabung_rusak,
        total_volume: parseFloat(totalKeseluruhan[0].total_volume || 0),
        total_lokasi: totalKeseluruhan[0].total_lokasi
      },
      ringkasan_per_lokasi: ringkasanData
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/stok-tabung/cari/:kode_tabung - Cari tabung berdasarkan kode
router.get('/cari/:kode_tabung', authUser, async (req, res) => {
  try {
    const { kode_tabung } = req.params;

    if (!kode_tabung) {
      return res.status(400).json({ message: 'Kode tabung wajib diisi' });
    }

    const [data] = await db.query(`
      SELECT 
        id,
        kode_tabung,
        status,
        lokasi,
        volume,
        tanggal_update,
        created_at
      FROM stok_tabung 
      WHERE kode_tabung = ?
    `, [kode_tabung]);

    if (data.length === 0) {
      return res.status(404).json({ 
        message: 'Tabung tidak ditemukan',
        kode_tabung: kode_tabung
      });
    }

    res.json({
      message: 'Data tabung berhasil ditemukan',
      data: data[0]
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;