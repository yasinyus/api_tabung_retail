require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Middleware bodyParser harus di atas semua route
app.use(bodyParser.json());


const authRoutes = require('./src/routes/auth');
const TerimaTabungArmada = require('./src/routes/kepala_gudang/terima_tabung_armada');
const KirimTabungArmada = require('./src/routes/kepala_gudang/kirim_tabung_armada');
const TerimaTabungAgen = require('./src/routes/kepala_gudang/terima_tabung_agen');
const KirimTabungAgen = require('./src/routes/kepala_gudang/kirim_tabung_agen');
const TabungTurunGudang = require('./src/routes/driver/tabung_turun_gudang');
const TabungActivity = require('./src/routes/tabung_activity');
const TabungSearch = require('./src/routes/tabung_search');
const ArmadaScan = require('./src/routes/armada_scan');
const GudangScan = require('./src/routes/gudang_scan');
const volumeTabungRoutes = require('./src/routes/volume_tabung');
const auditRoutes = require('./src/routes/audit');
const authPelangganRoutes = require('./src/routes/auth_pelanggan');
const saldoPelangganRoutes = require('./src/routes/saldo_pelanggan');
const depositPelangganRoutes = require('./src/routes/deposit_pelanggan');
const transaksiPelangganRoutes = require('./src/routes/transaksi_pelanggan');
const aktivitasTransaksiRoutes = require('./src/routes/aktivitas_transaksi');
const detailTransaksiRoutes = require('./src/routes/detail_transaksi');
const cekSaldoPelangganRoutes = require('./src/routes/cek_saldo_pelanggan');
const dashboardRoutes = require('./src/routes/dashboard');
const historyVolumeRoutes = require('./src/routes/history_volume');
const aktivitasTabungDetailRoutes = require('./src/routes/aktivitas_tabung_detail_simple');
const stokTabungRoutes = require('./src/routes/stok_tabung');
const laporanPelangganRoutes = require('./src/routes/laporan_pelanggan');

app.use('/pelanggan', saldoPelangganRoutes);

// Routes
app.use('/login', authRoutes);
app.use('/auth/pelanggan', authPelangganRoutes);
app.use('/tabung', TabungSearch);
app.use('/armada', ArmadaScan);
app.use('/gudang', GudangScan);
app.use('/', TabungActivity);

// KEPALA GUDANG
app.use('/terima', TerimaTabungArmada);
app.use('/kirim', KirimTabungArmada);
app.use('/terima', TerimaTabungAgen);
app.use('/kirim', KirimTabungAgen);

// DRIVER
app.use('/tabung', TabungTurunGudang);
// OPERATOR
app.use('/volume', volumeTabungRoutes);
// AUDITOR
app.use('/audit', auditRoutes);
// PELANGGAN  
app.use('/pelanggan', saldoPelangganRoutes);
app.use('/pelanggan', depositPelangganRoutes);
app.use('/pelanggan', transaksiPelangganRoutes);
// AKTIVITAS TRANSAKSI
app.use('/api', aktivitasTransaksiRoutes);
// DETAIL TRANSAKSI
app.use('/api', detailTransaksiRoutes);
// CEK SALDO PELANGGAN
app.use('/api', cekSaldoPelangganRoutes);
// DASHBOARD
app.use('/api', dashboardRoutes);
// HISTORY VOLUME
app.use('/api/history-volume', historyVolumeRoutes);
// AKTIVITAS TABUNG DETAIL
app.use('/api/aktivitas-tabung', aktivitasTabungDetailRoutes);
// STOK TABUNG
app.use('/api/stok-tabung', stokTabungRoutes);
// LAPORAN PELANGGAN
app.use('/api/laporan-pelanggan', laporanPelangganRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});