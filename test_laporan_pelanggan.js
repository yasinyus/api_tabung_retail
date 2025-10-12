const mysql = require('mysql2/promise');
require('dotenv').config();

async function testLaporanPelangganAPI() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Test 1: Cek struktur tabel laporan_pelanggan
    console.log('\n📊 Test 1: Checking laporan_pelanggan table structure');
    const [structure] = await connection.query('DESCRIBE laporan_pelanggan');
    console.table(structure);

    // Test 2: Cek data yang ada di tabel
    console.log('\n📋 Test 2: Sample data in laporan_pelanggan');
    const [sampleData] = await connection.query('SELECT * FROM laporan_pelanggan ORDER BY created_at DESC LIMIT 5');
    console.log(`Found ${sampleData.length} records`);
    
    if (sampleData.length > 0) {
      sampleData.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`- ID: ${record.id}`);
        console.log(`- Tanggal: ${record.tanggal}`);
        console.log(`- Kode Pelanggan: ${record.kode_pelanggan}`);
        console.log(`- Keterangan: ${record.keterangan}`);
        console.log(`- Tabung: ${record.tabung}`);
        console.log(`- Harga: ${record.harga}`);
        console.log(`- Sisa Deposit: ${record.sisa_deposit}`);
        console.log(`- ID BAST Invoice: ${record.id_bast_invoice || 'NULL'}`);
        
        // Test JSON parsing
        try {
          const listTabung = JSON.parse(record.list_tabung || '[]');
          console.log(`- List Tabung: ${listTabung.join(', ')}`);
          console.log(`- Total Tabung in List: ${listTabung.length}`);
        } catch (e) {
          console.log(`- List Tabung: Error parsing JSON`);
        }
        
        console.log(`- Created At: ${record.created_at}`);
      });
    } else {
      console.log('⚠️ No data found in laporan_pelanggan table');
    }

    // Test 3: Query berdasarkan kode_pelanggan (seperti di API)
    console.log('\n🔍 Test 3: Testing API-like query by kode_pelanggan');
    const testKodePelanggan = sampleData.length > 0 ? sampleData[0].kode_pelanggan : 'PA0001';
    
    const [customerData] = await connection.query(`
      SELECT 
        lp.*,
        p.nama_pelanggan
      FROM laporan_pelanggan lp
      LEFT JOIN pelanggans p ON lp.kode_pelanggan = p.kode_pelanggan
      WHERE lp.kode_pelanggan = ?
      ORDER BY lp.created_at DESC
      LIMIT 3
    `, [testKodePelanggan]);

    console.log(`Query result for kode_pelanggan: ${testKodePelanggan}`);
    console.log(`Found ${customerData.length} records`);
    
    customerData.forEach(record => {
      console.log({
        id: record.id,
        tanggal: record.tanggal,
        nama_pelanggan: record.nama_pelanggan,
        keterangan: record.keterangan,
        tabung: record.tabung,
        harga: record.harga,
        sisa_deposit: record.sisa_deposit
      });
    });

    // Test 4: Statistics query
    console.log('\n📈 Test 4: Statistics query');
    const [statsData] = await connection.query(`
      SELECT 
        COUNT(*) as total_laporan,
        SUM(tabung) as total_tabung,
        SUM(harga) as total_harga,
        MAX(sisa_deposit) as sisa_deposit_terakhir
      FROM laporan_pelanggan
      WHERE kode_pelanggan = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [testKodePelanggan]);
    
    console.log('Statistics for', testKodePelanggan, '(30 days):');
    console.log(statsData[0]);

    // Test 5: Count total records
    console.log('\n📊 Test 5: Total counts');
    const [totalCount] = await connection.query('SELECT COUNT(*) as total FROM laporan_pelanggan');
    const [uniqueCustomers] = await connection.query('SELECT COUNT(DISTINCT kode_pelanggan) as unique_customers FROM laporan_pelanggan');
    
    console.log(`- Total Records: ${totalCount[0].total}`);
    console.log(`- Unique Customers: ${uniqueCustomers[0].unique_customers}`);

    // Test 6: Search functionality test
    console.log('\n🔍 Test 6: Search functionality');
    const [searchResults] = await connection.query(`
      SELECT 
        lp.id,
        lp.kode_pelanggan,
        lp.keterangan,
        p.nama_pelanggan
      FROM laporan_pelanggan lp
      LEFT JOIN pelanggans p ON lp.kode_pelanggan = p.kode_pelanggan
      WHERE lp.kode_pelanggan LIKE ? OR p.nama_pelanggan LIKE ? OR lp.keterangan LIKE ?
      LIMIT 3
    `, ['%PA%', '%Pelanggan%', '%Kembali%']);
    
    console.log(`Search results (sample):`, searchResults.length);
    searchResults.forEach(record => {
      console.log(`- ${record.kode_pelanggan}: ${record.nama_pelanggan} - ${record.keterangan}`);
    });

    console.log('\n✅ All laporan pelanggan API tests completed successfully!');
    console.log('📝 The Laporan Pelanggan API should work correctly with this data');

    console.log('\n📋 Available Endpoints:');
    console.log('- GET /api/laporan-pelanggan/:kode_pelanggan - List laporan by customer');
    console.log('- GET /api/laporan-pelanggan/detail/:id - Detail laporan by ID');
    console.log('- GET /api/laporan-pelanggan/statistik/:kode_pelanggan - Customer statistics');
    console.log('- GET /api/laporan-pelanggan/semua/all - All reports (admin)');

  } catch (error) {
    console.error('❌ Error testing laporan pelanggan:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testLaporanPelangganAPI();