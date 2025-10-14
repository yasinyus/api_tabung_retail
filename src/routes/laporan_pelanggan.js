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

// Function helper untuk nama bulan
function getNamaBulan(bulan) {
  const namaBulan = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return namaBulan[parseInt(bulan)] || 'Unknown';
}

// GET /api/laporan-pelanggan/:kode_pelanggan/:tahun/:bulan - Mendapatkan laporan pelanggan per bulan
router.get('/:kode_pelanggan/:tahun/:bulan', authUser, async (req, res) => {
  const { kode_pelanggan, tahun, bulan } = req.params;
  
  if (!kode_pelanggan || !tahun || !bulan) {
    return res.status(400).json({ 
      message: 'Parameter wajib diisi: kode_pelanggan, tahun, bulan' 
    });
  }
  
  // Validasi format tahun dan bulan
  const yearNum = parseInt(tahun);
  const monthNum = parseInt(bulan);
  
  if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
    return res.status(400).json({ 
      message: 'Format tahun tidak valid (2020-2030)' 
    });
  }
  
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ 
      message: 'Format bulan tidak valid (1-12)' 
    });
  }
  
  try {
    // Get info pelanggan
    const [pelangganInfo] = await db.query(
      'SELECT nama_pelanggan FROM pelanggans WHERE kode_pelanggan = ?', 
      [kode_pelanggan]
    );

    if (pelangganInfo.length === 0) {
      return res.status(404).json({ 
        message: 'Pelanggan tidak ditemukan',
        kode_pelanggan: kode_pelanggan
      });
    }

    const pelanggan = pelangganInfo[0];

    // Query laporan berdasarkan kode_pelanggan dan bulan/tahun
    const [rows] = await db.query(`
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
        DATE(tanggal) as tanggal_only,
        TIME(created_at) as waktu
      FROM laporan_pelanggan
      WHERE kode_pelanggan = ? 
        AND YEAR(tanggal) = ? 
        AND MONTH(tanggal) = ?
      ORDER BY tanggal DESC, created_at DESC
    `, [kode_pelanggan, yearNum, monthNum]);
    
    if (rows.length === 0) {
      return res.json({ 
        message: 'Tidak ada laporan pada bulan tersebut',
        kode_pelanggan: kode_pelanggan,
        nama_pelanggan: pelanggan.nama_pelanggan,
        periode: `${getNamaBulan(monthNum)} ${tahun}`,
        total_laporan: 0,
        total_tabung: 0,
        total_harga: 0,
        data: []
      });
    }
    
    // Group laporan berdasarkan tanggal
    const groupedByDate = {};
    let totalTabung = 0;
    let totalHarga = 0;
    let totalTambahanDeposit = 0;
    let totalPenguranganDeposit = 0;
    let sisaDepositTerakhir = 0;
    
    rows.forEach(row => {
      const tanggal = row.tanggal_only;
      const harga = parseFloat(row.harga) || 0;
      const tabung = parseInt(row.tabung) || 0;
      const tambahanDeposit = parseFloat(row.tambahan_deposit) || 0;
      const penguranganDeposit = parseFloat(row.pengurangan_deposit) || 0;
      
      totalTabung += tabung;
      totalHarga += harga;
      totalTambahanDeposit += tambahanDeposit;
      totalPenguranganDeposit += penguranganDeposit;
      sisaDepositTerakhir = parseFloat(row.sisa_deposit) || 0; // Ambil yang terakhir
      
      if (!groupedByDate[tanggal]) {
        groupedByDate[tanggal] = [];
      }
      
      // Parse list tabung jika ada
      let listTabung = [];
      if (row.list_tabung) {
        try {
          listTabung = JSON.parse(row.list_tabung);
        } catch (e) {
          listTabung = [];
        }
      }
      
      groupedByDate[tanggal].push({
        id: row.id,
        keterangan: row.keterangan,
        tabung: tabung,
        harga: harga,
        tambahan_deposit: tambahanDeposit,
        pengurangan_deposit: penguranganDeposit,
        sisa_deposit: parseFloat(row.sisa_deposit) || 0,
        konfirmasi: row.konfirmasi,
        list_tabung: listTabung,
        total_tabung_in_list: listTabung.length,
        id_bast_invoice: row.id_bast_invoice,
        waktu: row.waktu,
        created_at: row.created_at
      });
    });
    
    // Convert grouped data ke format yang lebih readable
    const dataPerTanggal = Object.keys(groupedByDate)
      .sort((a, b) => new Date(b) - new Date(a)) // Sort tanggal desc
      .map(tanggal => ({
        tanggal: tanggal,
        total_laporan_hari: groupedByDate[tanggal].length,
        total_tabung_hari: groupedByDate[tanggal].reduce((sum, item) => sum + item.tabung, 0),
        total_harga_hari: groupedByDate[tanggal].reduce((sum, item) => sum + item.harga, 0),
        laporan: groupedByDate[tanggal]
      }));
    
    res.json({
      message: 'Laporan pelanggan bulanan berhasil diambil',
      kode_pelanggan: kode_pelanggan,
      nama_pelanggan: pelanggan.nama_pelanggan,
      periode: `${getNamaBulan(monthNum)} ${tahun}`,
      tahun: yearNum,
      bulan: monthNum,
      nama_bulan: getNamaBulan(monthNum),
      summary: {
        total_laporan: rows.length,
        total_tabung: totalTabung,
        total_harga: parseFloat(totalHarga.toFixed(2)),
        total_tambahan_deposit: parseFloat(totalTambahanDeposit.toFixed(2)),
        total_pengurangan_deposit: parseFloat(totalPenguranganDeposit.toFixed(2)),
        sisa_deposit_terakhir: parseFloat(sisaDepositTerakhir.toFixed(2)),
        total_hari_aktif: Object.keys(groupedByDate).length
      },
      data: dataPerTanggal
    });
    
  } catch (err) {
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      kode_pelanggan: kode_pelanggan,
      periode: `${getNamaBulan(monthNum)} ${tahun}`
    });
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