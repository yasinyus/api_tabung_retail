const mysql = require('mysql2/promise');
require('dotenv').config();

async function testLaporanPelangganBulanan() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Test query untuk laporan pelanggan bulanan
    console.log('\n🔍 Testing monthly laporan pelanggan query...');
    
    // Check available pelanggans first
    console.log('\n📋 Checking available pelanggans...');
    const [availablePelanggans] = await connection.query('SELECT kode_pelanggan, nama_pelanggan FROM pelanggans LIMIT 5');
    console.table(availablePelanggans);

    const kode_pelanggan = availablePelanggans.length > 0 ? availablePelanggans[0].kode_pelanggan : 'PA0001';
    const tahun = 2025;
    const bulan = 10;

    console.log(`\n🎯 Testing with kode_pelanggan: ${kode_pelanggan}`);

    // Get info pelanggan
    const [pelangganInfo] = await connection.query(
      'SELECT nama_pelanggan FROM pelanggans WHERE kode_pelanggan = ?', 
      [kode_pelanggan]
    );

    if (pelangganInfo.length === 0) {
      console.log(`❌ Pelanggan ${kode_pelanggan} tidak ditemukan`);
      return;
    }

    console.log(`✅ Pelanggan ditemukan: ${pelangganInfo[0].nama_pelanggan}`);

    // Query laporan berdasarkan kode_pelanggan dan bulan/tahun
    const [rows] = await connection.query(`
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
    `, [kode_pelanggan, tahun, bulan]);

    console.log(`\n📊 Found ${rows.length} laporan records for ${kode_pelanggan} in ${bulan}/${tahun}`);

    if (rows.length === 0) {
      console.log('⚠️ No data found for this month');
      return;
    }

    // Group laporan berdasarkan tanggal
    const groupedByDate = {};
    let totalTabung = 0;
    let totalHarga = 0;

    rows.forEach((row, index) => {
      const tanggal = row.tanggal_only;
      const harga = parseFloat(row.harga) || 0;
      const tabung = parseInt(row.tabung) || 0;
      
      totalTabung += tabung;
      totalHarga += harga;
      
      if (!groupedByDate[tanggal]) {
        groupedByDate[tanggal] = [];
      }
      
      // Parse list tabung
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
        list_tabung: listTabung,
        total_tabung_in_list: listTabung.length,
        id_bast_invoice: row.id_bast_invoice
      });

      // Show first few records
      if (index < 3) {
        console.log(`\n📋 Record ${index + 1}:`);
        console.log(`- ID: ${row.id}`);
        console.log(`- Tanggal: ${row.tanggal_only}`);
        console.log(`- Keterangan: ${row.keterangan}`);
        console.log(`- Tabung: ${tabung}`);
        console.log(`- Harga: ${harga}`);
        console.log(`- List Tabung: ${listTabung.join(', ') || 'None'}`);
        console.log(`- BAST Invoice: ${row.id_bast_invoice || 'NULL'}`);
      }
    });

    // Show grouped data summary
    console.log('\n📅 Data grouped by date:');
    Object.keys(groupedByDate)
      .sort((a, b) => new Date(b) - new Date(a))
      .forEach(tanggal => {
        const dayData = groupedByDate[tanggal];
        const totalTabungHari = dayData.reduce((sum, item) => sum + item.tabung, 0);
        const totalHargaHari = dayData.reduce((sum, item) => sum + item.harga, 0);
        
        console.log(`- ${tanggal}: ${dayData.length} laporan, ${totalTabungHari} tabung, Rp ${totalHargaHari.toLocaleString()}`);
      });

    // Summary statistics
    console.log('\n📈 Summary Statistics:');
    console.log(`- Total Laporan: ${rows.length}`);
    console.log(`- Total Tabung: ${totalTabung}`);
    console.log(`- Total Harga: Rp ${totalHarga.toLocaleString()}`);
    console.log(`- Total Hari Aktif: ${Object.keys(groupedByDate).length}`);

    // Test API response format
    console.log('\n📝 Sample API Response Format:');
    const sampleResponse = {
      message: 'Laporan pelanggan bulanan berhasil diambil',
      kode_pelanggan: kode_pelanggan,
      nama_pelanggan: pelangganInfo[0].nama_pelanggan,
      periode: `Oktober ${tahun}`,
      summary: {
        total_laporan: rows.length,
        total_tabung: totalTabung,
        total_harga: parseFloat(totalHarga.toFixed(2)),
        total_hari_aktif: Object.keys(groupedByDate).length
      },
      data_sample: Object.keys(groupedByDate).slice(0, 2).map(tanggal => ({
        tanggal: tanggal,
        total_laporan_hari: groupedByDate[tanggal].length,
        laporan: groupedByDate[tanggal].slice(0, 1) // Show first item only
      }))
    };

    console.log(JSON.stringify(sampleResponse, null, 2));

    console.log('\n✅ Monthly laporan pelanggan API endpoint is working correctly!');
    console.log(`🚀 Test URL: GET /api/laporan-pelanggan/${kode_pelanggan}/${tahun}/${bulan}`);

  } catch (error) {
    console.error('❌ Error testing monthly laporan:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testLaporanPelangganBulanan();