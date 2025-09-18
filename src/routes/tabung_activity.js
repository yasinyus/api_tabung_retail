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

router.post('/tabung_activity', authKepalaGudang, async (req, res) => {
  const { dari, tujuan, tabung, keterangan, activity, status} = req.body;
  // tabung: array of tabung QR
  if (!dari || !tujuan || !Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const id_user = req.user.id;
  const nama_petugas = req.user.name;
  const total_tabung = tabung.length;
  const tanggal = new Date().toLocaleDateString('id-ID'); // DD/MM/YYYY
  const waktu = new Date(); // datetime otomatis
  // const nama_aktivitas = req.activity;
  // const status = req.status;
  try {
    const [result] = await db.query(
      'INSERT INTO aktivitas_tabung (dari, tujuan, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, waktu, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [dari, tujuan, JSON.stringify(tabung), keterangan || '', nama_petugas, id_user, total_tabung, tanggal, waktu, activity, status]
    );
    res.json({ message: 'Sukses', id: result.insertId, total_tabung: total_tabung });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/laporan_pelanggan', authKepalaGudang, async (req, res) => {
  const { activity, dari, tujuan, tabung, keterangan, status } = req.body;
  
  // Validasi input
  if (!activity || !dari || !tujuan || !Array.isArray(tabung) || tabung.length === 0) {
    return res.status(400).json({ message: 'Missing required fields: activity, dari, tujuan, tabung' });
  }
  
  try {
    // Format tanggal MySQL (YYYY-MM-DD)
    const today = new Date();
    const tanggal = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const waktu = new Date();
    
    // Ambil kode_pelanggan dari field 'dari'
    const kode_pelanggan = dari;
    const jumlah_tabung = tabung.length;
    
    // Get saldo pelanggan untuk sisa_deposit
    const [saldoData] = await db.query('SELECT saldo FROM saldo_pelanggans WHERE kode_pelanggan = ?', [kode_pelanggan]);
    if (saldoData.length === 0) {
      return res.status(404).json({ message: 'Customer tidak ditemukan' });
    }
    
    const sisa_deposit = parseFloat(saldoData[0].saldo);
    
    const [result] = await db.query(
      'INSERT INTO laporan_pelanggan (tanggal, kode_pelanggan, keterangan, tabung, harga, tambahan_deposit, pengurangan_deposit, sisa_deposit, konfirmasi, list_tabung, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        tanggal, 
        kode_pelanggan, 
        "Kembali", // menggunakan activity sebagai keterangan
        jumlah_tabung, 
        0, // harga default 0
        0, // tambahan_deposit default 0
        0, // pengurangan_deposit default 0
        sisa_deposit, 
        0, // konfirmasi default 0
        JSON.stringify(tabung), // list_tabung sebagai JSON array
        waktu
      ]
    );
    
    res.json({ 
      message: 'Laporan pelanggan berhasil disimpan',
      id: result.insertId,
      tanggal: tanggal,
      kode_pelanggan: kode_pelanggan,
      keterangan: activity,
      tabung: jumlah_tabung,
      harga: 0,
      tambahan_deposit: 0,
      pengurangan_deposit: 0,
      sisa_deposit: sisa_deposit,
      konfirmasi: 0,
      list_tabung: tabung,
      tabung_list: tabung
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
