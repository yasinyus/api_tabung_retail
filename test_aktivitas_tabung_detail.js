const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAktivitasTabungDetailAPI() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');
    console.log('🧪 Testing Aktivitas Tabung Detail API Queries...\n');

    // Test 1: Get sample aktivitas_tabung data
    console.log('📋 Test 1: Get sample aktivitas_tabung data');
    const [sampleData] = await connection.query(`
      SELECT 
        id,
        dari,
        tujuan,
        tabung,
        nama_aktivitas,
        status,
        total_tabung,
        waktu
      FROM aktivitas_tabung 
      ORDER BY waktu DESC
      LIMIT 3
    `);
    
    console.log(`Found ${sampleData.length} records`);
    sampleData.forEach(record => {
      let tabungArray = [];
      try {
        tabungArray = typeof record.tabung === 'string' ? JSON.parse(record.tabung) : record.tabung;
        if (!Array.isArray(tabungArray)) {
          tabungArray = [];
        }
      } catch (e) {
        tabungArray = [];
      }
      
      console.log(`- ID: ${record.id}, Activity: ${record.nama_aktivitas}, Status: ${record.status}, Tabung: ${tabungArray.length}`);
    });

    if (sampleData.length === 0) {
      console.log('⚠️ No data found in aktivitas_tabung table');
      return;
    }

    // Test 2: Detail query like API endpoint
    const testId = sampleData[0].id;
    console.log(`\n🔍 Test 2: Detail query for ID ${testId}`);
    
    const [detailData] = await connection.query(`
      SELECT 
        id,
        dari,
        tujuan,
        tabung,
        keterangan,
        nama_petugas,
        id_user,
        total_tabung,
        tanggal,
        waktu,
        nama_aktivitas,
        status,
        created_at,
        updated_at
      FROM aktivitas_tabung 
      WHERE id = ?
    `, [testId]);

    if (detailData.length > 0) {
      const aktivitas = detailData[0];
      console.log('✅ Detail data found:');
      console.log(`- ID: ${aktivitas.id}`);
      console.log(`- From: ${aktivitas.dari} → To: ${aktivitas.tujuan}`);
      console.log(`- Activity: ${aktivitas.nama_aktivitas}`);
      console.log(`- Status: ${aktivitas.status}`);
      console.log(`- Petugas: ${aktivitas.nama_petugas}`);
      console.log(`- Total Tabung: ${aktivitas.total_tabung}`);

      // Test tabung parsing
      let tabungArray = [];
      try {
        tabungArray = typeof aktivitas.tabung === 'string' ? JSON.parse(aktivitas.tabung) : aktivitas.tabung;
        if (!Array.isArray(tabungArray)) {
          tabungArray = [];
        }
      } catch (e) {
        tabungArray = [];
      }
      console.log(`- Tabung Array: [${tabungArray.join(', ')}]`);

      // Test relasi data
      console.log('\n🔗 Test 3: Testing relational queries');
      
      // Test pelanggan data
      const [pelangganData] = await connection.query('SELECT kode_pelanggan, nama_pelanggan FROM pelanggans WHERE kode_pelanggan = ?', [aktivitas.dari]);
      if (pelangganData.length > 0) {
        console.log(`✅ Pelanggan found: ${pelangganData[0].nama_pelanggan}`);
      } else {
        console.log(`⚠️ No pelanggan found for: ${aktivitas.dari}`);
      }

      // Test gudang data
      const [gudangData] = await connection.query('SELECT kode_gudang, nama_gudang FROM gudangs WHERE kode_gudang = ?', [aktivitas.tujuan]);
      if (gudangData.length > 0) {
        console.log(`✅ Gudang found: ${gudangData[0].nama_gudang}`);
      } else {
        console.log(`⚠️ No gudang found for: ${aktivitas.tujuan}`);
      }

      // Test user data
      const [userData] = await connection.query('SELECT username, name, role FROM users WHERE id = ?', [aktivitas.id_user]);
      if (userData.length > 0) {
        console.log(`✅ User found: ${userData[0].name} (${userData[0].role})`);
      } else {
        console.log(`⚠️ No user found for ID: ${aktivitas.id_user}`);
      }

      // Test serah terima data
      const [serahTerimaData] = await connection.query(`
        SELECT bast_id, status 
        FROM serah_terima_tabungs 
        WHERE kode_pelanggan = ? 
        AND created_at >= DATE_SUB(?, INTERVAL 1 HOUR)
        LIMIT 1
      `, [aktivitas.dari, aktivitas.waktu]);
      
      if (serahTerimaData.length > 0) {
        console.log(`✅ Serah Terima found: BAST ${serahTerimaData[0].bast_id}`);
      } else {
        console.log(`⚠️ No serah terima found for: ${aktivitas.dari}`);
      }
    }

    // Test 4: List query with pagination
    console.log('\n📊 Test 4: List query with pagination');
    const [listData] = await connection.query(`
      SELECT 
        id,
        dari,
        tujuan,
        nama_aktivitas,
        status,
        total_tabung,
        waktu
      FROM aktivitas_tabung 
      ORDER BY waktu DESC
      LIMIT 5 OFFSET 0
    `);
    
    console.log(`✅ List query returned ${listData.length} records`);

    // Test 5: Statistics query
    console.log('\n📈 Test 5: Statistics queries');
    
    const [totalStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_aktivitas,
        SUM(total_tabung) as total_tabung_processed
      FROM aktivitas_tabung
      WHERE waktu >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    console.log(`✅ Total Statistics: ${totalStats[0].total_aktivitas} aktivitas, ${totalStats[0].total_tabung_processed} tabung`);

    const [statusStats] = await connection.query(`
      SELECT 
        status,
        COUNT(*) as jumlah
      FROM aktivitas_tabung
      WHERE waktu >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY status
    `);
    
    console.log('✅ Status Statistics:');
    statusStats.forEach(stat => {
      console.log(`   - ${stat.status}: ${stat.jumlah} aktivitas`);
    });

    console.log('\n✅ All API queries working correctly!');
    console.log('🚀 Aktivitas Tabung Detail API is ready to use!');
    console.log('\n📋 Available Endpoints:');
    console.log('- GET /api/aktivitas-tabung/:id - Detail aktivitas berdasarkan ID');
    console.log('- GET /api/aktivitas-tabung/list/all - List dengan pagination & filter');
    console.log('- GET /api/aktivitas-tabung/statistik/summary - Statistik aktivitas');

  } catch (error) {
    console.error('❌ Error testing queries:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testAktivitasTabungDetailAPI();