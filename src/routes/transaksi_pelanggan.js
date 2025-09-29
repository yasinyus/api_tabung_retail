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

// API untuk melihat transaksi pelanggan berdasarkan bulan
router.get('/riwayat/:customer_id/:tahun/:bulan', authPelanggan, async (req, res) => {
  const { customer_id, tahun, bulan } = req.params;
  
  if (!customer_id || !tahun || !bulan) {
    return res.status(400).json({ 
      message: 'Parameter wajib diisi: customer_id, tahun, bulan' 
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
    // Query transaksi berdasarkan customer_id dan bulan/tahun
    const [rows] = await db.query(`
      SELECT 
        t.id,
        t.trx_id,
        t.customer_id,
        t.total as nominal,
        t.notes as keterangan,
        t.status,
        t.payment_method,
        t.created_at as tanggal_transaksi,
        DATE(t.created_at) as tanggal,
        TIME(t.created_at) as waktu,
        dt.tabung as detail_tabung
      FROM transactions t
      LEFT JOIN detail_transaksi dt ON t.trx_id = dt.trx_id
      WHERE t.customer_id = ? 
        AND YEAR(t.created_at) = ? 
        AND MONTH(t.created_at) = ?
      ORDER BY t.created_at DESC
    `, [customer_id, yearNum, monthNum]);
    
    if (rows.length === 0) {
      return res.json({ 
        message: 'Tidak ada transaksi pada bulan tersebut',
        customer_id: customer_id,
        periode: `${getNamaBulan(monthNum)} ${tahun}`,
        total_transaksi: 0,
        total_nominal: 0,
        data: []
      });
    }
    
    // Group transaksi berdasarkan tanggal
    const groupedByDate = {};
    let totalNominal = 0;
    
    rows.forEach(row => {
      const tanggal = row.tanggal;
      totalNominal += parseFloat(row.nominal) || 0;
      
      if (!groupedByDate[tanggal]) {
        groupedByDate[tanggal] = [];
      }
      
      // Parse detail tabung jika ada
      let detailTabung = [];
      if (row.detail_tabung) {
        try {
          detailTabung = JSON.parse(row.detail_tabung);
        } catch (e) {
          detailTabung = [];
        }
      }
      
      groupedByDate[tanggal].push({
        id: row.id,
        trx_id: row.trx_id,
        jenis_transaksi: row.keterangan || 'Virtual Account',
        nominal: `Rp${formatRupiah(row.nominal)}`,
        nominal_raw: parseFloat(row.nominal) || 0,
        status: row.status === 'success' || row.status === 'completed' ? 'Berhasil' : 
                row.status === 'pending' ? 'Pending' : 
                row.status === 'failed' ? 'Gagal' : row.status,
        metode_pembayaran: row.payment_method || 'Virtual Account',
        waktu: row.waktu,
        tanggal_transaksi: row.tanggal_transaksi,
        detail_tabung: detailTabung,
        jumlah_tabung: detailTabung.length
      });
    });
    
    // Convert grouped data ke format array dengan tanggal sebagai header
    const formattedData = [];
    Object.keys(groupedByDate)
      .sort((a, b) => new Date(b) - new Date(a)) // Sort descending
      .forEach(tanggal => {
        const transaksiHari = groupedByDate[tanggal];
        const totalHari = transaksiHari.reduce((sum, trx) => sum + trx.nominal_raw, 0);
        
        formattedData.push({
          tanggal: tanggal,
          tanggal_formatted: formatTanggalIndonesia(tanggal),
          total_transaksi_hari: transaksiHari.length,
          total_nominal_hari: `Rp${formatRupiah(totalHari)}`,
          total_nominal_hari_raw: totalHari,
          transaksi: transaksiHari
        });
      });
    
    res.json({ 
      message: 'Riwayat transaksi berhasil diambil',
      customer_id: customer_id,
      periode: `${getNamaBulan(monthNum)} ${tahun}`,
      tahun: yearNum,
      bulan: monthNum,
      nama_bulan: getNamaBulan(monthNum),
      total_transaksi: rows.length,
      total_nominal: `Rp${formatRupiah(totalNominal)}`,
      total_nominal_raw: totalNominal,
      total_hari_bertransaksi: Object.keys(groupedByDate).length,
      data: formattedData
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper functions
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID').format(number);
}

function formatTanggalIndonesia(dateString) {
  const date = new Date(dateString);
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  };
  return date.toLocaleDateString('id-ID', options);
}

function getNamaBulan(monthNum) {
  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return namaBulan[monthNum - 1] || 'Unknown';
}

module.exports = router;
