const mysql = require('mysql2/promise');
require('dotenv').config();

async function testStokTabungAPI() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');
    console.log('🧪 Testing Stok Tabung API Queries...\n');

    // Test 1: Cek data stok_tabung yang ada
    console.log('📊 Test 1: Sample data in stok_tabung');
    const [sampleData] = await connection.query(`
      SELECT kode_tabung, status, lokasi, volume, tanggal_update 
      FROM stok_tabung 
      ORDER BY lokasi, kode_tabung 
      LIMIT 10
    `);
    
    if (sampleData.length > 0) {
      console.table(sampleData);
      console.log(`Found ${sampleData.length} sample records`);
      
      // Test dengan lokasi yang ada
      const testLokasi = sampleData[0].lokasi;
      console.log(`\n🔍 Test 2: Query for lokasi "${testLokasi}"`);
      
      const [lokasiData] = await connection.query(`
        SELECT 
          id,
          kode_tabung,
          status,
          lokasi,
          volume,
          tanggal_update,
          created_at
        FROM stok_tabung 
        WHERE lokasi = ?
        ORDER BY kode_tabung ASC
        LIMIT 5
      `, [testLokasi]);
      
      console.log(`Results for lokasi ${testLokasi}:`);
      console.table(lokasiData);
      
      // Test 3: Statistik lokasi
      console.log(`\n📈 Test 3: Statistics for lokasi "${testLokasi}"`);
      const [statsData] = await connection.query(`
        SELECT 
          COUNT(*) as total_tabung,
          SUM(CASE WHEN status = 'Isi' THEN 1 ELSE 0 END) as tabung_isi,
          SUM(CASE WHEN status = 'Kosong' THEN 1 ELSE 0 END) as tabung_kosong,
          SUM(CASE WHEN status = 'Rusak' THEN 1 ELSE 0 END) as tabung_rusak,
          SUM(CASE WHEN volume > 0 THEN volume ELSE 0 END) as total_volume
        FROM stok_tabung 
        WHERE lokasi = ?
      `, [testLokasi]);
      
      console.log('Statistics:', {
        ...statsData[0],
        total_volume: parseFloat(statsData[0].total_volume || 0)
      });
      
    } else {
      console.log('⚠️ No data found in stok_tabung table');
    }

    // Test 4: Ringkasan semua lokasi
    console.log('\n📋 Test 4: Summary all locations');
    const [ringkasanLokasi] = await connection.query(`
      SELECT 
        lokasi,
        COUNT(*) as total_tabung,
        SUM(CASE WHEN status = 'Isi' THEN 1 ELSE 0 END) as tabung_isi,
        SUM(CASE WHEN status = 'Kosong' THEN 1 ELSE 0 END) as tabung_kosong,
        SUM(CASE WHEN status = 'Rusak' THEN 1 ELSE 0 END) as tabung_rusak,
        SUM(CASE WHEN volume > 0 THEN volume ELSE 0 END) as total_volume
      FROM stok_tabung 
      GROUP BY lokasi
      ORDER BY lokasi ASC
    `);

    console.log('Summary by location:');
    console.table(ringkasanLokasi.map(item => ({
      lokasi: item.lokasi,
      total: item.total_tabung,
      isi: item.tabung_isi,
      kosong: item.tabung_kosong,
      rusak: item.tabung_rusak,
      volume: parseFloat(item.total_volume || 0),
      pct_isi: item.total_tabung > 0 ? ((item.tabung_isi / item.total_tabung) * 100).toFixed(1) + '%' : '0%'
    })));

    // Test 5: Total keseluruhan
    console.log('\n🎯 Test 5: Grand total statistics');
    const [totalKeseluruhan] = await connection.query(`
      SELECT 
        COUNT(*) as total_tabung,
        SUM(CASE WHEN status = 'Isi' THEN 1 ELSE 0 END) as tabung_isi,
        SUM(CASE WHEN status = 'Kosong' THEN 1 ELSE 0 END) as tabung_kosong,
        SUM(CASE WHEN status = 'Rusak' THEN 1 ELSE 0 END) as tabung_rusak,
        SUM(CASE WHEN volume > 0 THEN volume ELSE 0 END) as total_volume,
        COUNT(DISTINCT lokasi) as total_lokasi
      FROM stok_tabung
    `);

    console.log('Grand Total:', {
      ...totalKeseluruhan[0],
      total_volume: parseFloat(totalKeseluruhan[0].total_volume || 0)
    });

    // Test 6: Pencarian kode tabung
    if (sampleData.length > 0) {
      const testKodeTabung = sampleData[0].kode_tabung;
      console.log(`\n🔎 Test 6: Search for kode_tabung "${testKodeTabung}"`);
      
      const [searchResult] = await connection.query(`
        SELECT 
          id,
          kode_tabung,
          status,
          lokasi,
          volume,
          tanggal_update,
          created_at
        FROM stok_tabung 
        WHERE kode_tabung = ?
      `, [testKodeTabung]);
      
      if (searchResult.length > 0) {
        console.log('Search result:', searchResult[0]);
      } else {
        console.log('❌ Tabung not found');
      }
    }

    console.log('\n✅ All Stok Tabung API queries working correctly!');
    console.log('🚀 API endpoints ready:');
    console.log('- GET /api/stok-tabung/lokasi/:lokasi');
    console.log('- GET /api/stok-tabung/ringkasan');
    console.log('- GET /api/stok-tabung/cari/:kode_tabung');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testStokTabungAPI();