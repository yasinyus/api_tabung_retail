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

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});