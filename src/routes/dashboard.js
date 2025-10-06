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

// History aktivitas_tabung untuk user hari ini
router.get('/history/today', authUser, async (req, res) => {
  const id_user = req.user.id;
  
  try {
    // Format tanggal hari ini untuk filter
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Get aktivitas_tabung berdasarkan id_user untuk hari ini
    const [historyToday] = await db.query(`
      SELECT 
        id,
        dari,
        tujuan,
        tabung,
        keterangan,
        nama_petugas,
        total_tabung,
        tanggal,
        waktu,
        nama_aktivitas,
        status,
        created_at
      FROM aktivitas_tabung 
      WHERE id_user = ? 
        AND waktu >= ? 
        AND waktu < ?
      ORDER BY waktu DESC
    `, [id_user, todayStart, todayEnd]);
    
    // Parse tabung JSON untuk setiap record
    const processedHistory = historyToday.map(record => ({
      ...record,
      tabung_list: JSON.parse(record.tabung || '[]'),
      tabung_count: JSON.parse(record.tabung || '[]').length
    }));
    
    res.json({
      message: 'History aktivitas hari ini berhasil diambil',
      user_id: id_user,
      user_name: req.user.name,
      date: today.toISOString().split('T')[0],
      total_aktivitas: historyToday.length,
      total_tabung_processed: historyToday.reduce((sum, record) => sum + record.total_tabung, 0),
      data: processedHistory
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// History aktivitas_tabung untuk user semua hari
router.get('/history/all', authUser, async (req, res) => {
  const id_user = req.user.id;
  const { page = 1, limit = 50, start_date, end_date } = req.query;
  
  try {
    let dateFilter = '';
    let queryParams = [id_user];
    
    // Add date range filter if provided
    if (start_date && end_date) {
      dateFilter = ' AND DATE(waktu) BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total_records
      FROM aktivitas_tabung 
      WHERE id_user = ?${dateFilter}
    `, queryParams);
    
    const totalRecords = countResult[0].total_records;
    const totalPages = Math.ceil(totalRecords / limit);
    
    // Get aktivitas_tabung dengan JOIN ke transactions dan pelanggans untuk mendapatkan harga detail
    const [historyAll] = await db.query(`
      SELECT 
        a.id,
        a.dari,
        a.tujuan,
        a.tabung,
        a.keterangan,
        a.nama_petugas,
        a.total_tabung,
        a.tanggal,
        a.waktu,
        a.nama_aktivitas,
        a.status,
        a.created_at,
        t.trx_id,
        t.id as transaction_id,
        t.type as transaction_type,
        t.total as transaction_total,
        t.status as transaction_status,
        t.customer_id,
        p.kode_pelanggan,
        p.nama_pelanggan,
        p.harga_tabung as harga_per_tabung
      FROM aktivitas_tabung a
      LEFT JOIN transactions t ON a.id = t.aktivitas_id
      LEFT JOIN pelanggans p ON t.customer_id = p.id
      WHERE a.id_user = ?${dateFilter}
      ORDER BY a.waktu DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);
    
    // Parse tabung JSON dan process transaction info dengan harga detail untuk setiap record
    const processedHistory = await Promise.all(historyAll.map(async (record) => {
      const tabungList = JSON.parse(record.tabung || '[]');
      const hargaPerTabung = parseFloat(record.harga_per_tabung || 0);
      
      // Hitung harga detail per tabung berdasarkan volume dari stok_tabung
      let tabungDetails = [];
      let totalHargaCalculated = 0;
      
      if (Array.isArray(tabungList) && hargaPerTabung > 0) {
        for (const kodeTabung of tabungList) {
          try {
            // Get volume dari stok_tabung untuk setiap kode_tabung
            const [stokData] = await db.query('SELECT volume FROM stok_tabung WHERE kode_tabung = ?', [kodeTabung]);
            const volume = stokData.length > 0 ? parseFloat(stokData[0].volume || 0) : 0;
            const subtotal = volume * hargaPerTabung;
            
            tabungDetails.push({
              kode_tabung: kodeTabung,
              volume: volume,
              harga_per_m3: hargaPerTabung,
              subtotal: subtotal
            });
            
            totalHargaCalculated += subtotal;
          } catch (error) {
            console.error(`Error getting volume for ${kodeTabung}:`, error.message);
            tabungDetails.push({
              kode_tabung: kodeTabung,
              volume: 0,
              harga_per_m3: hargaPerTabung,
              subtotal: 0
            });
          }
        }
      }
      
      return {
        id: record.id,
        dari: record.dari,
        tujuan: record.tujuan,
        tabung: record.tabung,
        tabung_list: tabungList,
        tabung_count: tabungList.length,
        tabung_details: tabungDetails, // Detail harga per tabung
        keterangan: record.keterangan,
        nama_petugas: record.nama_petugas,
        total_tabung: record.total_tabung,
        tanggal: record.tanggal,
        waktu: record.waktu,
        nama_aktivitas: record.nama_aktivitas,
        status: record.status,
        created_at: record.created_at,
        // Transaction info dari JOIN dengan harga detail
        transaction_info: record.trx_id ? {
          trx_id: record.trx_id,
          transaction_id: record.transaction_id,
          transaction_type: record.transaction_type,
          transaction_total: parseFloat(record.transaction_total || 0),
          transaction_status: record.transaction_status
        } : null,
        // Customer info untuk invoice
        customer_info: record.customer_id ? {
          customer_id: record.customer_id,
          kode_pelanggan: record.kode_pelanggan,
          nama_pelanggan: record.nama_pelanggan,
          harga_per_tabung: hargaPerTabung
        } : null,
        // Harga kalkulasi real-time
        pricing_info: {
          harga_per_m3: hargaPerTabung,
          total_harga_calculated: parseFloat(totalHargaCalculated.toFixed(2)),
          currency: 'IDR'
        }
      };
    }));
    
    // Get summary statistics
    const [summaryResult] = await db.query(`
      SELECT 
        COUNT(*) as total_aktivitas,
        SUM(total_tabung) as total_tabung_processed,
        COUNT(DISTINCT DATE(waktu)) as total_days_active,
        MIN(DATE(waktu)) as first_activity_date,
        MAX(DATE(waktu)) as last_activity_date
      FROM aktivitas_tabung 
      WHERE id_user = ?${dateFilter}
    `, queryParams);
    
    const summary = summaryResult[0];
    
    res.json({
      message: 'History aktivitas semua hari berhasil diambil',
      user_id: id_user,
      user_name: req.user.name,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_records: totalRecords,
        limit: parseInt(limit),
        has_next: page < totalPages,
        has_prev: page > 1
      },
      summary: {
        total_aktivitas: summary.total_aktivitas,
        total_tabung_processed: summary.total_tabung_processed,
        total_days_active: summary.total_days_active,
        first_activity_date: summary.first_activity_date,
        last_activity_date: summary.last_activity_date
      },
      filters: {
        start_date: start_date || null,
        end_date: end_date || null
      },
      data: processedHistory
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
