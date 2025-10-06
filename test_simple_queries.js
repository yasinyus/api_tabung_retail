// Simple test tanpa HTTP request - langsung test function
const db = require('./src/db');

async function testHistoryVolumeQueries() {
  console.log('🧪 Testing History Volume API Queries...\n');

  try {
    // Test query seperti di API
    console.log('📋 Test 1: Basic pagination query');
    const [data] = await db.query(`
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
      LIMIT 3 OFFSET 0
    `);
    
    console.log(`Found ${data.length} records`);
    data.forEach(record => {
      // Test JSON parsing seperti di API
      let tabungArray = [];
      try {
        tabungArray = typeof record.tabung === 'string' ? JSON.parse(record.tabung) : record.tabung;
        if (!Array.isArray(tabungArray)) {
          tabungArray = [];
        }
      } catch (e) {
        console.error('Error parsing tabung JSON:', e);
        tabungArray = [];
      }
      
      console.log(`- ID: ${record.id}, Lokasi: ${record.lokasi}, Total Tabung: ${tabungArray.length}`);
    });

    // Test count query
    console.log('\n📊 Test 2: Count query');
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM volume_tabungs');
    console.log(`Total records: ${countResult[0].total}`);

    // Test statistics query
    console.log('\n📈 Test 3: Statistics query');
    const [statsResult] = await db.query(`
      SELECT 
        COUNT(*) as total_pengisian,
        SUM(volume_total) as total_volume,
        AVG(volume_total) as rata_rata_volume
      FROM volume_tabungs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    console.log('Statistics:', statsResult[0]);

    // Test detail query dengan JOIN
    console.log('\n🔍 Test 4: Detail query with JOIN');
    const testId = data[0]?.id || 1;
    const [detailResult] = await db.query(`
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
      WHERE id = ?
    `, [testId]);

    if (detailResult.length > 0) {
      const record = detailResult[0];
      let tabungArray = [];
      try {
        tabungArray = typeof record.tabung === 'string' ? JSON.parse(record.tabung) : record.tabung;
        if (!Array.isArray(tabungArray)) {
          tabungArray = [];
        }
      } catch (e) {
        tabungArray = [];
      }

      console.log(`Detail for ID ${testId}:`);
      console.log(`- Tabung count: ${tabungArray.length}`);
      console.log(`- Volume: ${record.volume_total}`);
      console.log(`- Status: ${record.status}`);

      // Test JOIN dengan tabungs dan stok_tabung
      if (tabungArray.length > 0) {
        const firstTabung = tabungArray[0];
        const [tabungInfo] = await db.query(`
          SELECT 
            t.kode_tabung,
            t.seri_tabung,
            t.tahun,
            t.siklus,
            st.status as current_status,
            st.lokasi as current_lokasi,
            st.volume as current_volume,
            st.tanggal_update
          FROM tabungs t
          LEFT JOIN stok_tabung st ON t.kode_tabung = st.kode_tabung
          WHERE t.kode_tabung = ?
        `, [firstTabung.kode_tabung]);

        if (tabungInfo.length > 0) {
          console.log(`- First tabung info: ${firstTabung.kode_tabung} - Current status: ${tabungInfo[0].current_status}`);
        }
      }
    }

    console.log('\n✅ All API queries working correctly!');
    console.log('🚀 History Volume API is ready to use!');

  } catch (error) {
    console.error('❌ Error testing queries:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the test
testHistoryVolumeQueries();