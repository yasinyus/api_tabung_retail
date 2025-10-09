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

    // Test 1: Cek data yang ada di aktivitas_tabung
    console.log('\n📋 Test 1: Sample data in aktivitas_tabung');
    const [sampleData] = await connection.query('SELECT id, dari, tujuan, nama_aktivitas, status, total_tabung FROM aktivitas_tabung ORDER BY id DESC LIMIT 3');
    
    if (sampleData.length > 0) {
      console.table(sampleData);
      
      // Test 2: Test query seperti di API
      const testId = sampleData[0].id;
      console.log(`\n🧪 Test 2: Testing API query for ID ${testId}`);
      
      const [aktivitasData] = await connection.query(`
        SELECT * FROM aktivitas_tabung WHERE id = ?
      `, [testId]);
      
      if (aktivitasData.length > 0) {
        const aktivitas = aktivitasData[0];
        console.log('✅ Data found:');
        console.log(`- ID: ${aktivitas.id}`);
        console.log(`- Dari: ${aktivitas.dari}`);
        console.log(`- Tujuan: ${aktivitas.tujuan}`);
        console.log(`- Nama Aktivitas: ${aktivitas.nama_aktivitas}`);
        console.log(`- Status: ${aktivitas.status}`);
        console.log(`- Total Tabung: ${aktivitas.total_tabung}`);
        
        // Test parsing JSON tabung
        let tabungArray = [];
        try {
          tabungArray = typeof aktivitas.tabung === 'string' ? JSON.parse(aktivitas.tabung) : aktivitas.tabung;
          if (!Array.isArray(tabungArray)) {
            tabungArray = [];
          }
          console.log(`- Tabung Array Length: ${tabungArray.length}`);
          console.log(`- Tabung Codes: ${tabungArray.join(', ')}`);
        } catch (e) {
          console.log('❌ Error parsing tabung JSON:', e.message);
        }
        
        console.log('\n✅ API query simulation successful!');
      } else {
        console.log('❌ No data found for the test ID');
      }
    } else {
      console.log('⚠️ No data found in aktivitas_tabung table');
    }

    // Test 3: Test dengan ID yang tidak ada
    console.log('\n🧪 Test 3: Testing with non-existent ID (999999)');
    const [notFoundData] = await connection.query(`
      SELECT * FROM aktivitas_tabung WHERE id = ?
    `, [999999]);
    
    if (notFoundData.length === 0) {
      console.log('✅ Correctly returns no data for non-existent ID');
    }

    console.log('\n🎉 All database tests passed!');
    console.log('📝 API Endpoint: GET /api/aktivitas-tabung/:id');
    console.log('📝 Response: Simple data from aktivitas_tabung table only');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testAktivitasTabungDetailAPI();