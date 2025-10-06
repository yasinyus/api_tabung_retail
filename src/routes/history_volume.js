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

// GET /api/history-volume/all - Mendapatkan semua history pengisian volume
router.get('/all', authUser, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      lokasi = '', 
      status = '', 
      tanggal_dari = '', 
      tanggal_sampai = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(nama LIKE ? OR keterangan LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (lokasi) {
      whereConditions.push('lokasi LIKE ?');
      queryParams.push(`%${lokasi}%`);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (tanggal_dari) {
      whereConditions.push('tanggal >= ?');
      queryParams.push(tanggal_dari);
    }

    if (tanggal_sampai) {
      whereConditions.push('tanggal <= ?');
      queryParams.push(tanggal_sampai);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validasi sort_by
    const allowedSortFields = ['id', 'tanggal', 'lokasi', 'nama', 'volume_total', 'status', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query untuk mendapatkan data dengan pagination
    const dataQuery = `
      SELECT 
        id,
        tanggal,
        lokasi,
        tabung,
        nama,
        volume_total,
        status,
        keterangan,
        created_at
      FROM volume_tabungs 
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const [data] = await db.query(dataQuery, queryParams);

    // Query untuk mendapatkan total count
    const countQuery = `SELECT COUNT(*) as total FROM volume_tabungs ${whereClause}`;
    const countParams = queryParams.slice(0, -2); // Hapus limit dan offset
    const [countResult] = await db.query(countQuery, countParams);
    const totalRecords = countResult[0].total;

    // Parse JSON tabung untuk setiap record
    const processedData = data.map(record => {
      let tabungArray = [];
      try {
        // Handle MySQL JSON column yang sudah parsed otomatis atau masih string
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
        total_tabung: tabungArray.length
      };
    });

    // Hitung statistik
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      message: 'History pengisian volume berhasil diambil',
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
        lokasi: lokasi || null,
        status: status || null,
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

// GET /api/history-volume/detail/:id - Mendapatkan detail history pengisian berdasarkan ID
router.get('/detail/:id', authUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID tidak valid' });
    }

    const [data] = await db.query(`
      SELECT 
        id,
        tanggal,
        lokasi,
        tabung,
        nama,
        volume_total,
        status,
        keterangan,
        created_at
      FROM volume_tabungs 
      WHERE id = ?
    `, [id]);

    if (data.length === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const record = data[0];
    let tabungArray = [];
    try {
      // Handle MySQL JSON column yang sudah parsed otomatis atau masih string
      tabungArray = typeof record.tabung === 'string' ? JSON.parse(record.tabung) : record.tabung;
      if (!Array.isArray(tabungArray)) {
        tabungArray = [];
      }
    } catch (e) {
      console.error('Error parsing tabung JSON:', e);
      tabungArray = [];
    }

    // Ambil informasi detail tabung dari tabel tabungs dan stok_tabung
    const tabungDetails = [];
    for (const item of tabungArray) {
      const [tabungInfo] = await db.query(`
        SELECT 
          t.kode_tabung,
          t.seri_tabung,
          t.tahun,
          t.siklus,
          st.status as current_status,
          st.lokasi as current_lokasi,
          st.volume as current_volume,
          st.tanggal_update
        FROM tabungs t
        LEFT JOIN stok_tabung st ON t.kode_tabung = st.kode_tabung
        WHERE t.kode_tabung = ?
      `, [item.kode_tabung]);

      tabungDetails.push({
        kode_tabung: item.kode_tabung,
        volume_saat_pengisian: item.volume,
        tabung_info: tabungInfo[0] || null
      });
    }

    const result = {
      ...record,
      tabung: tabungArray,
      total_tabung: tabungArray.length,
      tabung_details: tabungDetails
    };

    res.json({
      message: 'Detail history pengisian berhasil diambil',
      data: result
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/history-volume/statistik - Mendapatkan statistik pengisian volume
router.get('/statistik', authUser, async (req, res) => {
  try {
    const { periode = '30' } = req.query; // Default 30 hari terakhir

    // Total volume pengisian
    const [totalVolume] = await db.query(`
      SELECT 
        COUNT(*) as total_pengisian,
        SUM(volume_total) as total_volume,
        AVG(volume_total) as rata_rata_volume
      FROM volume_tabungs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(periode)]);

    // Pengisian per status
    const [statusStats] = await db.query(`
      SELECT 
        status,
        COUNT(*) as jumlah,
        SUM(volume_total) as total_volume
      FROM volume_tabungs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY status
    `, [parseInt(periode)]);

    // Pengisian per lokasi (top 10)
    const [lokasiStats] = await db.query(`
      SELECT 
        lokasi,
        COUNT(*) as jumlah,
        SUM(volume_total) as total_volume
      FROM volume_tabungs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY lokasi
      ORDER BY total_volume DESC
      LIMIT 10
    `, [parseInt(periode)]);

    // Trend pengisian per hari (7 hari terakhir)
    const [trendDaily] = await db.query(`
      SELECT 
        DATE(created_at) as tanggal,
        COUNT(*) as jumlah_pengisian,
        SUM(volume_total) as total_volume
      FROM volume_tabungs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY tanggal DESC
    `);

    // Petugas yang paling aktif (top 10)
    const [petugasStats] = await db.query(`
      SELECT 
        nama,
        COUNT(*) as jumlah_pengisian,
        SUM(volume_total) as total_volume
      FROM volume_tabungs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY nama
      ORDER BY jumlah_pengisian DESC
      LIMIT 10
    `, [parseInt(periode)]);

    res.json({
      message: 'Statistik pengisian volume berhasil diambil',
      periode: `${periode} hari terakhir`,
      statistik: {
        total: totalVolume[0],
        per_status: statusStats,
        per_lokasi: lokasiStats,
        trend_harian: trendDaily,
        petugas_aktif: petugasStats
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/history-volume/export - Export data untuk Excel/CSV
router.get('/export', authUser, async (req, res) => {
  try {
    const { 
      format = 'json',
      tanggal_dari = '', 
      tanggal_sampai = '',
      lokasi = '',
      status = ''
    } = req.query;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (lokasi) {
      whereConditions.push('lokasi LIKE ?');
      queryParams.push(`%${lokasi}%`);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (tanggal_dari) {
      whereConditions.push('tanggal >= ?');
      queryParams.push(tanggal_dari);
    }

    if (tanggal_sampai) {
      whereConditions.push('tanggal <= ?');
      queryParams.push(tanggal_sampai);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [data] = await db.query(`
      SELECT 
        id,
        tanggal,
        lokasi,
        tabung,
        nama,
        volume_total,
        status,
        keterangan,
        created_at
      FROM volume_tabungs 
      ${whereClause}
      ORDER BY created_at DESC
    `, queryParams);

    // Process data untuk export
    const exportData = data.map(record => {
      let tabungArray = [];
      try {
        // Handle MySQL JSON column yang sudah parsed otomatis atau masih string
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
        total_tabung: tabungArray.length,
        kode_tabung_list: tabungArray.map(t => t.kode_tabung).join(', '),
        tabung_detail: JSON.stringify(tabungArray)
      };
    });

    if (format === 'csv') {
      // Set headers untuk CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=history_volume_pengisian.csv');
      
      // CSV header
      const csvHeader = 'ID,Tanggal,Lokasi,Nama Petugas,Volume Total,Status,Total Tabung,Kode Tabung,Keterangan,Created At\n';
      let csvContent = csvHeader;
      
      // CSV data
      exportData.forEach(row => {
        csvContent += `${row.id},"${row.tanggal}","${row.lokasi}","${row.nama}",${row.volume_total},"${row.status}",${row.total_tabung},"${row.kode_tabung_list}","${row.keterangan || ''}","${row.created_at}"\n`;
      });
      
      res.send(csvContent);
    } else {
      // JSON format
      res.json({
        message: 'Data export berhasil diambil',
        total_records: exportData.length,
        filters: {
          tanggal_dari: tanggal_dari || null,
          tanggal_sampai: tanggal_sampai || null,
          lokasi: lokasi || null,
          status: status || null
        },
        data: exportData
      });
    }

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;