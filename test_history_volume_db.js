const mysql = require('mysql2/promise');
require('dotenv').config();

async function testHistoryVolumeData() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Test 1: Cek struktur tabel volume_tabungs
    console.log('\n📊 Test 1: Checking volume_tabungs table structure');
    const [structure] = await connection.query('DESCRIBE volume_tabungs');
    console.table(structure);

    // Test 2: Cek data yang ada di tabel
    console.log('\n📋 Test 2: Sample data in volume_tabungs');
    const [sampleData] = await connection.query('SELECT * FROM volume_tabungs ORDER BY created_at DESC LIMIT 5');
    console.log(`Found ${sampleData.length} records`);
    
    if (sampleData.length > 0) {
      sampleData.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`- ID: ${record.id}`);
        console.log(`- Tanggal: ${record.tanggal}`);
        console.log(`- Lokasi: ${record.lokasi}`);
        console.log(`- Nama: ${record.nama}`);
        console.log(`- Volume Total: ${record.volume_total}`);
        console.log(`- Status: ${record.status}`);
        try {
          const tabungData = typeof record.tabung === 'string' ? JSON.parse(record.tabung) : record.tabung;
          console.log(`- Total Tabung: ${Array.isArray(tabungData) ? tabungData.length : 'Invalid data'}`);
        } catch (e) {
          console.log(`- Total Tabung: Error parsing (${typeof record.tabung})`);
          console.log(`- Tabung raw data: ${record.tabung}`);
        }
        console.log(`- Created At: ${record.created_at}`);
      });
    } else {
      console.log('⚠️ No data found in volume_tabungs table');
    }

    // Test 3: Query seperti di API
    console.log('\n🔍 Test 3: Testing API-like query');
    const [apiData] = await connection.query(`
      SELECT 
        id,
        tanggal,
        lokasi,
        tabung,
        nama,
        volume_total,
        status,
        keterangan,
        created_at
      FROM volume_tabungs 
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('API Query Result:');
    apiData.forEach(record => {
      try {
        const tabungArray = typeof record.tabung === 'string' ? JSON.parse(record.tabung) : record.tabung;
        console.log({
          id: record.id,
          tanggal: record.tanggal,
          lokasi: record.lokasi,
          nama: record.nama,
          volume_total: record.volume_total,
          status: record.status,
          total_tabung: Array.isArray(tabungArray) ? tabungArray.length : 'Invalid',
          tabung_codes: Array.isArray(tabungArray) ? tabungArray.map(t => t.kode_tabung).join(', ') : 'N/A'
        });
      } catch (e) {
        console.log({
          id: record.id,
          error: 'JSON parse error',
          tabung_raw: record.tabung,
          tabung_type: typeof record.tabung
        });
      }
    });

    // Test 4: Count query
    console.log('\n📈 Test 4: Statistics query');
    const [countData] = await connection.query('SELECT COUNT(*) as total FROM volume_tabungs');
    const [volumeStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_pengisian,
        SUM(volume_total) as total_volume,
        AVG(volume_total) as rata_rata_volume
      FROM volume_tabungs
    `);
    
    console.log('Statistics:');
    console.log(`- Total Records: ${countData[0].total}`);
    console.log(`- Total Pengisian: ${volumeStats[0].total_pengisian}`);
    console.log(`- Total Volume: ${volumeStats[0].total_volume}`);
    console.log(`- Rata-rata Volume: ${volumeStats[0].rata_rata_volume}`);

    console.log('\n✅ Database tests completed successfully!');
    console.log('📝 The History Volume API should work correctly with this data');

  } catch (error) {
    console.error('❌ Error testing database:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testHistoryVolumeData();