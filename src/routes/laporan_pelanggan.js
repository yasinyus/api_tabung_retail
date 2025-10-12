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

// GET /api/laporan-pelanggan/:kode_pelanggan - Mendapatkan laporan pelanggan berdasarkan kode_pelanggan
router.get('/:kode_pelanggan', authUser, async (req, res) => {
  try {
    const { kode_pelanggan } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      start_date = '', 
      end_date = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    if (!kode_pelanggan) {
      return res.status(400).json({ message: 'Kode pelanggan wajib diisi' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereConditions = ['kode_pelanggan = ?'];
    let queryParams = [kode_pelanggan];

    if (start_date) {
      whereConditions.push('tanggal >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('tanggal <= ?');
      queryParams.push(end_date);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Validasi sort_by
    const allowedSortFields = ['id', 'tanggal', 'tabung', 'harga', 'sisa_deposit', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query untuk mendapatkan data dengan pagination
    const dataQuery = `
      SELECT 
        id,
        tanggal,
        kode_pelanggan,
        keterangan,
        tabung,
        harga,
        tambahan_deposit,
        pengurangan_deposit,
        sisa_deposit,
        konfirmasi,
        list_tabung,
        id_bast_invoice,
        created_at,
        updated_at
      FROM laporan_pelanggan 
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const [data] = await db.query(dataQuery, queryParams);

    // Query untuk mendapatkan total count
    const countQuery = `SELECT COUNT(*) as total FROM laporan_pelanggan ${whereClause}`;
    const countParams = queryParams.slice(0, -2); // Hapus limit dan offset
    const [countResult] = await db.query(countQuery, countParams);
    const totalRecords = countResult[0].total;

    // Process data - parse JSON list_tabung
    const processedData = data.map(record => {
      let tabungList = [];
      try {
        tabungList = JSON.parse(record.list_tabung || '[]');
      } catch (e) {
        console.error('Error parsing list_tabung JSON:', e);
        tabungList = [];
      }
      
      return {
        ...record,
        list_tabung: tabungList,
        total_tabung_in_list: tabungList.length
      };
    });

    // Hitung statistik
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Get info pelanggan
    const [pelangganInfo] = await db.query('SELECT nama_pelanggan FROM pelanggans WHERE kode_pelanggan = ?', [kode_pelanggan]);
    const namaPelanggan = pelangganInfo.length > 0 ? pelangganInfo[0].nama_pelanggan : 'Unknown';

    res.json({
      message: 'Laporan pelanggan berhasil diambil',
      kode_pelanggan: kode_pelanggan,
      nama_pelanggan: namaPelanggan,
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
        start_date: start_date || null,
        end_date: end_date || null,
        sort_by: sortField,
        sort_order: sortDirection
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/laporan-pelanggan/detail/:id - Mendapatkan detail laporan berdasarkan ID
router.get('/detail/:id', authUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID tidak valid' });
    }

    const [data] = await db.query(`
      SELECT 
        lp.*,
        p.nama_pelanggan,
        p.alamat,
        p.no_telepon
      FROM laporan_pelanggan lp
      LEFT JOIN pelanggans p ON lp.kode_pelanggan = p.kode_pelanggan
      WHERE lp.id = ?
    `, [id]);

    if (data.length === 0) {
      return res.status(404).json({ message: 'Data laporan tidak ditemukan' });
    }

    const record = data[0];
    
    // Parse JSON list_tabung
    let tabungList = [];
    try {
      tabungList = JSON.parse(record.list_tabung || '[]');
    } catch (e) {
      console.error('Error parsing list_tabung JSON:', e);
      tabungList = [];
    }

    const result = {
      ...record,
      list_tabung: tabungList,
      total_tabung_in_list: tabungList.length
    };

    res.json({
      message: 'Detail laporan berhasil diambil',
      data: result
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/laporan-pelanggan/statistik/:kode_pelanggan - Mendapatkan statistik laporan pelanggan
router.get('/statistik/:kode_pelanggan', authUser, async (req, res) => {
  try {
    const { kode_pelanggan } = req.params;
    const { periode = '30' } = req.query; // Default 30 hari terakhir

    if (!kode_pelanggan) {
      return res.status(400).json({ message: 'Kode pelanggan wajib diisi' });
    }

    // Total laporan
    const [totalLaporan] = await db.query(`
      SELECT 
        COUNT(*) as total_laporan,
        SUM(tabung) as total_tabung,
        SUM(harga) as total_harga,
        SUM(tambahan_deposit) as total_tambahan,
        SUM(pengurangan_deposit) as total_pengurangan,
        MAX(sisa_deposit) as sisa_deposit_terakhir
      FROM laporan_pelanggan
      WHERE kode_pelanggan = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [kode_pelanggan, parseInt(periode)]);

    // Laporan per keterangan
    const [keteranganStats] = await db.query(`
      SELECT 
        keterangan,
        COUNT(*) as jumlah,
        SUM(tabung) as total_tabung,
        SUM(harga) as total_harga
      FROM laporan_pelanggan
      WHERE kode_pelanggan = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY keterangan
      ORDER BY jumlah DESC
    `, [kode_pelanggan, parseInt(periode)]);

    // Trend per hari (7 hari terakhir)
    const [trendDaily] = await db.query(`
      SELECT 
        DATE(created_at) as tanggal,
        COUNT(*) as jumlah_laporan,
        SUM(tabung) as total_tabung,
        SUM(harga) as total_harga
      FROM laporan_pelanggan
      WHERE kode_pelanggan = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY tanggal DESC
    `, [kode_pelanggan]);

    // Get info pelanggan
    const [pelangganInfo] = await db.query('SELECT nama_pelanggan FROM pelanggans WHERE kode_pelanggan = ?', [kode_pelanggan]);
    const namaPelanggan = pelangganInfo.length > 0 ? pelangganInfo[0].nama_pelanggan : 'Unknown';

    res.json({
      message: 'Statistik laporan pelanggan berhasil diambil',
      kode_pelanggan: kode_pelanggan,
      nama_pelanggan: namaPelanggan,
      periode: `${periode} hari terakhir`,
      statistik: {
        total: totalLaporan[0],
        per_keterangan: keteranganStats,
        trend_harian: trendDaily
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/laporan-pelanggan/semua - Mendapatkan semua laporan pelanggan (untuk admin)
router.get('/semua/all', authUser, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      start_date = '', 
      end_date = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(lp.kode_pelanggan LIKE ? OR p.nama_pelanggan LIKE ? OR lp.keterangan LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (start_date) {
      whereConditions.push('lp.tanggal >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('lp.tanggal <= ?');
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validasi sort_by
    const allowedSortFields = ['id', 'tanggal', 'kode_pelanggan', 'tabung', 'harga', 'sisa_deposit', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? `lp.${sort_by}` : 'lp.created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query untuk mendapatkan data dengan pagination
    const dataQuery = `
      SELECT 
        lp.id,
        lp.tanggal,
        lp.kode_pelanggan,
        lp.keterangan,
        lp.tabung,
        lp.harga,
        lp.tambahan_deposit,
        lp.pengurangan_deposit,
        lp.sisa_deposit,
        lp.konfirmasi,
        lp.list_tabung,
        lp.id_bast_invoice,
        lp.created_at,
        p.nama_pelanggan
      FROM laporan_pelanggan lp
      LEFT JOIN pelanggans p ON lp.kode_pelanggan = p.kode_pelanggan
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const [data] = await db.query(dataQuery, queryParams);

    // Query untuk mendapatkan total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM laporan_pelanggan lp
      LEFT JOIN pelanggans p ON lp.kode_pelanggan = p.kode_pelanggan
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2); // Hapus limit dan offset
    const [countResult] = await db.query(countQuery, countParams);
    const totalRecords = countResult[0].total;

    // Process data - parse JSON list_tabung
    const processedData = data.map(record => {
      let tabungList = [];
      try {
        tabungList = JSON.parse(record.list_tabung || '[]');
      } catch (e) {
        console.error('Error parsing list_tabung JSON:', e);
        tabungList = [];
      }
      
      return {
        ...record,
        list_tabung: tabungList,
        total_tabung_in_list: tabungList.length
      };
    });

    // Hitung statistik
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      message: 'Semua laporan pelanggan berhasil diambil',
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
        start_date: start_date || null,
        end_date: end_date || null,
        sort_by: sortField,
        sort_order: sortDirection
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;