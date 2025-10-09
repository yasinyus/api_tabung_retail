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

    // Parse JSON tabung untuk setiap record
    const processedData = data.map(record => {
      let tabungArray = [];
      try {
        tabungArray = typeof record.tabung === 'string' ? JSON.parse(record.tabung) : record.tabung;
        if (!Array.isArray(tabungArray)) {
          tabungArray = [];
        }
      } catch (e) {
        console.error('Error parsing tabung JSON:', e);
        tabungArray = [];
      }
      
      return {
        ...record,
        tabung: tabungArray,
        total_tabung_actual: tabungArray.length
      };
    });

    // Hitung statistik
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      message: 'Daftar aktivitas tabung berhasil diambil',
      data: processedData,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_records: totalRecords,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      },
      filters: {
        search: search || null,
        status: status || null,
        nama_aktivitas: nama_aktivitas || null,
        tanggal_dari: tanggal_dari || null,
        tanggal_sampai: tanggal_sampai || null,
        sort_by: sortField,
        sort_order: sortDirection
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/aktivitas-tabung/statistik - Mendapatkan statistik aktivitas tabung
router.get('/statistik/summary', authUser, async (req, res) => {
  try {
    const { periode = '30' } = req.query; // Default 30 hari terakhir

    // Total aktivitas
    const [totalAktivitas] = await db.query(`
      SELECT 
        COUNT(*) as total_aktivitas,
        SUM(total_tabung) as total_tabung_processed
      FROM aktivitas_tabung
      WHERE waktu >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(periode)]);

    // Aktivitas per status
    const [statusStats] = await db.query(`
      SELECT 
        status,
        COUNT(*) as jumlah,
        SUM(total_tabung) as total_tabung
      FROM aktivitas_tabung
      WHERE waktu >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY status
      ORDER BY jumlah DESC
    `, [parseInt(periode)]);

    // Aktivitas per nama_aktivitas
    const [aktivitasStats] = await db.query(`
      SELECT 
        nama_aktivitas,
        COUNT(*) as jumlah,
        SUM(total_tabung) as total_tabung
      FROM aktivitas_tabung
      WHERE waktu >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY nama_aktivitas
      ORDER BY jumlah DESC
      LIMIT 10
    `, [parseInt(periode)]);

    // Petugas paling aktif
    const [petugasStats] = await db.query(`
      SELECT 
        nama_petugas,
        COUNT(*) as jumlah_aktivitas,
        SUM(total_tabung) as total_tabung
      FROM aktivitas_tabung
      WHERE waktu >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY nama_petugas
      ORDER BY jumlah_aktivitas DESC
      LIMIT 10
    `, [parseInt(periode)]);

    // Trend harian (7 hari terakhir)
    const [trendDaily] = await db.query(`
      SELECT 
        DATE(waktu) as tanggal,
        COUNT(*) as jumlah_aktivitas,
        SUM(total_tabung) as total_tabung
      FROM aktivitas_tabung
      WHERE waktu >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(waktu)
      ORDER BY tanggal DESC
    `);

    res.json({
      message: 'Statistik aktivitas tabung berhasil diambil',
      periode: `${periode} hari terakhir`,
      statistik: {
        total: totalAktivitas[0],
        per_status: statusStats,
        per_aktivitas: aktivitasStats,
        petugas_aktif: petugasStats,
        trend_harian: trendDaily
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;