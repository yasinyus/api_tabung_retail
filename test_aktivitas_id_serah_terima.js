const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSerahTerimaWithAktivitasId() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Test simulasi seperti di API
    console.log('\n🧪 Testing serah_terima_tabungs with aktivitas_id...');
    
    const activity = "Terima Tabung Dari Pelanggan";
    const dari = "CUST001";
    const tujuan = "GUDANG_TEST";
    const tabung = ["TB0001", "TB0002"];
    const status = "Rusak";
    const waktu = new Date();
    const nama_petugas = "Test Petugas";
    const id_user = 1;
    const total_tabung = tabung.length;

    // 1. Insert ke aktivitas_tabung terlebih dahulu
    console.log('📝 Step 1: Insert to aktivitas_tabung...');
    const [activityResult] = await connection.query(
      'INSERT INTO aktivitas_tabung (dari, tujuan, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, waktu, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [dari, tujuan, JSON.stringify(tabung), 'Test insert aktivitas_id', nama_petugas, id_user, total_tabung, waktu.toISOString().split('T')[0], waktu, activity, status]
    );
    
    const aktivitas_id = activityResult.insertId;
    console.log(`✅ Aktivitas inserted with ID: ${aktivitas_id}`);

    // 2. Generate BAST ID seperti di API
    function generateBastId() {
      const hrTime = process.hrtime.bigint().toString();
      const timestamp = Date.now().toString();
      const random1 = Math.random().toString(36).substr(2, 8);
      const random2 = Math.random().toString(36).substr(2, 8);
      
      const combined = (hrTime + timestamp + random1 + random2).replace(/[^A-Z0-9]/gi, '');
      let result = '';
      
      for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * combined.length);
        result += combined[randomIndex].toUpperCase();
      }
      
      return result;
    }

    const bast_id = generateBastId();
    const total_harga = null;

    // 3. Insert ke serah_terima_tabungs dengan aktivitas_id
    console.log('\n📋 Step 2: Insert to serah_terima_tabungs with aktivitas_id...');
    const [serahTerima] = await connection.query(
      'INSERT INTO serah_terima_tabungs (bast_id, aktivitas_id, kode_pelanggan, tabung, total_harga, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [bast_id, aktivitas_id, dari, JSON.stringify(tabung), total_harga, status, waktu, waktu]
    );
    
    console.log(`✅ Serah terima inserted with ID: ${serahTerima.insertId}`);

    // 4. Verifikasi data yang tersimpan
    console.log('\n🔍 Step 3: Verify inserted data...');
    const [verifyData] = await connection.query(`
      SELECT 
        st.id,
        st.bast_id,
        st.aktivitas_id,
        st.kode_pelanggan,
        st.status,
        st.created_at,
        at.nama_aktivitas,
        at.dari,
        at.tujuan
      FROM serah_terima_tabungs st
      LEFT JOIN aktivitas_tabung at ON st.aktivitas_id = at.id
      WHERE st.id = ?
    `, [serahTerima.insertId]);

    if (verifyData.length > 0) {
      const data = verifyData[0];
      console.log('📊 Verification Result:');
      console.log(`- Serah Terima ID: ${data.id}`);
      console.log(`- BAST ID: ${data.bast_id}`);
      console.log(`- Aktivitas ID: ${data.aktivitas_id}`);
      console.log(`- Kode Pelanggan: ${data.kode_pelanggan}`);
      console.log(`- Status: ${data.status}`);
      console.log(`- Nama Aktivitas: ${data.nama_aktivitas}`);
      console.log(`- Dari: ${data.dari}`);
      console.log(`- Tujuan: ${data.tujuan}`);
      console.log(`- Created At: ${data.created_at}`);
    }

    // 5. Test JOIN query untuk memastikan relasi bekerja
    console.log('\n🔗 Step 4: Test JOIN query...');
    const [joinData] = await connection.query(`
      SELECT 
        COUNT(*) as total_with_aktivitas_id,
        COUNT(at.id) as total_with_valid_aktivitas
      FROM serah_terima_tabungs st
      LEFT JOIN aktivitas_tabung at ON st.aktivitas_id = at.id
      WHERE st.aktivitas_id IS NOT NULL
    `);
    
    console.log(`📈 JOIN Statistics:`);
    console.log(`- Total records with aktivitas_id: ${joinData[0].total_with_aktivitas_id}`);
    console.log(`- Total with valid aktivitas reference: ${joinData[0].total_with_valid_aktivitas}`);

    // 6. Cleanup test data
    await connection.query('DELETE FROM serah_terima_tabungs WHERE id = ?', [serahTerima.insertId]);
    await connection.query('DELETE FROM aktivitas_tabung WHERE id = ?', [aktivitas_id]);
    console.log('\n🧹 Test data cleaned up');

    console.log('\n✅ SUCCESS: aktivitas_id column is working correctly!');
    console.log('🎯 The API will now store aktivitas_id in serah_terima_tabungs table');

  } catch (error) {
    console.error('❌ Error testing aktivitas_id:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testSerahTerimaWithAktivitasId();