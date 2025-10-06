const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

function authKepalaGudang(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'kepala_gudang' && decoded.role !== 'driver') {
      return res.status(403).json({ message: 'Forbidden: Not kepala_gudang or driver' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// GET Detail Transaksi berdasarkan trx_id
router.get('/detail-transaksi/:trx_id', authKepalaGudang, async (req, res) => {
  const { trx_id } = req.params;
  
  if (!trx_id) {
    return res.status(400).json({ message: 'trx_id is required' });
  }

  try {
    // Get detail transaksi dengan JOIN ke transactions dan pelanggans untuk ambil harga
    const [detailTransaksi] = await db.query(`
      SELECT 
        dt.*,
        t.customer_id,
        p.harga_tabung,
        p.kode_pelanggan,
        p.nama_pelanggan
      FROM detail_transaksi dt
      LEFT JOIN transactions t ON dt.trx_id = t.trx_id
      LEFT JOIN pelanggans p ON t.customer_id = p.id
      WHERE dt.trx_id = ?
    `, [trx_id]);

    if (detailTransaksi.length === 0) {
      return res.status(404).json({ 
        message: 'Detail transaksi tidak ditemukan',
        trx_id: trx_id 
      });
    }

    // Parse tabung JSON untuk menghitung jumlah dan total harga
    let tabungData = [];
    let tabungCount = 0;
    let totalHarga = 0;
    const hargaPerTabung = parseFloat(detailTransaksi[0].harga_tabung || 0);
    
    if (detailTransaksi[0].tabung) {
      try {
        tabungData = JSON.parse(detailTransaksi[0].tabung);
        tabungCount = Array.isArray(tabungData) ? tabungData.length : 0;
        
        // Hitung total harga berdasarkan volume setiap tabung
        if (Array.isArray(tabungData)) {
          totalHarga = tabungData.reduce((sum, tabung) => {
            const volume = parseFloat(tabung.volume || 0);
            return sum + (volume * hargaPerTabung);
          }, 0);
        }
      } catch (parseError) {
        console.error('Error parsing tabung JSON:', parseError.message);
        tabungData = [];
        tabungCount = 0;
        totalHarga = 0;
      }
    }

    // Response dengan harga dari pelanggans
    res.json({
      message: 'Detail transaksi berhasil ditemukan',
      data: {
        id: detailTransaksi[0].id,
        trx_id: detailTransaksi[0].trx_id,
        tabung: detailTransaksi[0].tabung, // Raw JSON string
        tabung_parsed: tabungData, // Parsed array
        tabung_count: tabungCount,
        harga_per_tabung: hargaPerTabung,
        total_harga: parseFloat(totalHarga.toFixed(2)),
        customer_info: {
          customer_id: detailTransaksi[0].customer_id,
          kode_pelanggan: detailTransaksi[0].kode_pelanggan,
          nama_pelanggan: detailTransaksi[0].nama_pelanggan,
          harga_tabung: hargaPerTabung
        },
        created_at: detailTransaksi[0].created_at,
        updated_at: detailTransaksi[0].updated_at
      }
    });

  } catch (err) {
    console.error('Error getting detail transaksi:', err.message);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      trx_id: trx_id
    });
  }
});

// GET List detail transaksi dengan pagination (dengan harga dari pelanggans)
router.get('/list-detail-transaksi', authKepalaGudang, async (req, res) => {
  const { page = 1, limit = 10, trx_id } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Build WHERE clause
    let whereClause = '1=1';
    let queryParams = [];

    if (trx_id) {
      whereClause += ' AND dt.trx_id LIKE ?';
      queryParams.push(`%${trx_id}%`);
    }

    // Get total count dari detail_transaksi dengan JOIN
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total 
      FROM detail_transaksi dt
      LEFT JOIN transactions t ON dt.trx_id = t.trx_id
      LEFT JOIN pelanggans p ON t.customer_id = p.id
      WHERE ${whereClause}
    `, queryParams);
    const totalRecords = countResult[0].total;

    // Get detail transaksi dengan pagination dan JOIN untuk harga
    const [detailTransaksi] = await db.query(`
      SELECT 
        dt.*,
        t.customer_id,
        p.harga_tabung,
        p.kode_pelanggan,
        p.nama_pelanggan
      FROM detail_transaksi dt
      LEFT JOIN transactions t ON dt.trx_id = t.trx_id
      LEFT JOIN pelanggans p ON t.customer_id = p.id
      WHERE ${whereClause}
      ORDER BY dt.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    // Parse tabung JSON untuk setiap record dengan kalkulasi harga
    const processedData = detailTransaksi.map(item => {
      let tabungData = [];
      let tabungCount = 0;
      let totalHarga = 0;
      const hargaPerTabung = parseFloat(item.harga_tabung || 0);
      
      if (item.tabung) {
        try {
          tabungData = JSON.parse(item.tabung);
          tabungCount = Array.isArray(tabungData) ? tabungData.length : 0;
          
          // Hitung total harga berdasarkan volume setiap tabung
          if (Array.isArray(tabungData)) {
            totalHarga = tabungData.reduce((sum, tabung) => {
              const volume = parseFloat(tabung.volume || 0);
              return sum + (volume * hargaPerTabung);
            }, 0);
          }
        } catch (parseError) {
          console.error(`Error parsing tabung JSON for trx_id ${item.trx_id}:`, parseError.message);
          tabungData = [];
          tabungCount = 0;
          totalHarga = 0;
        }
      }

      return {
        id: item.id,
        trx_id: item.trx_id,
        tabung: item.tabung, // Raw JSON
        tabung_parsed: tabungData, // Parsed array
        tabung_count: tabungCount,
        harga_per_tabung: hargaPerTabung,
        total_harga: parseFloat(totalHarga.toFixed(2)),
        customer_info: {
          customer_id: item.customer_id,
          kode_pelanggan: item.kode_pelanggan,
          nama_pelanggan: item.nama_pelanggan,
          harga_tabung: hargaPerTabung
        },
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    });

    res.json({
      message: 'List detail transaksi berhasil diambil',
      data: processedData,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit)
      }
    });

  } catch (err) {
    console.error('Error getting list detail transaksi:', err.message);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

module.exports = router;