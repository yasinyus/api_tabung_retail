const mysql = require('mysql2/promise');
require('dotenv').config();

async function testLokasiUpdate() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // 1. Cek data awal di stok_tabung
    console.log('\n📊 Data awal di tabel stok_tabung:');
    const [initialData] = await connection.query('SELECT kode_tabung, lokasi, status FROM stok_tabung LIMIT 5');
    console.table(initialData);

    // 2. Simulasi update lokasi seperti di API
    const testKodeTabung = 'TB0001'; // Gunakan kode yang ada
    const newLokasi = 'GUDANG_TEST_API';
    const currentTime = new Date();

    console.log(`\n🔄 Testing update lokasi untuk ${testKodeTabung} ke ${newLokasi}`);

    // Cek apakah kode_tabung ada
    const [existingStok] = await connection.query('SELECT id FROM stok_tabung WHERE kode_tabung = ?', [testKodeTabung]);
    console.log(`Existing stok check for ${testKodeTabung}:`, existingStok.length);

    if (existingStok.length > 0) {
      // Update jika sudah ada
      console.log(`Updating existing stok for ${testKodeTabung}`);
      const [updateResult] = await connection.query(
        'UPDATE stok_tabung SET lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?', 
        [newLokasi, currentTime, testKodeTabung]
      );
      console.log(`Update result:`, updateResult.affectedRows, 'rows affected');
      
      // Verifikasi update
      const [updatedData] = await connection.query('SELECT kode_tabung, lokasi, status, tanggal_update FROM stok_tabung WHERE kode_tabung = ?', [testKodeTabung]);
      console.log('Data setelah update:');
      console.table(updatedData);
      
    } else {
      console.log(`❌ Kode tabung ${testKodeTabung} tidak ditemukan di stok_tabung`);
    }

    // 3. Test insert untuk kode baru
    const newKodeTabung = 'TB9999';
    const testStatus = 'Rusak'; // Now supported in ENUM
    const testLokasi = 'GUDANG_RUSAK_TEST';

    console.log(`\n➕ Testing insert untuk kode baru ${newKodeTabung}`);
    
    // Cek apakah kode sudah ada
    const [existingNew] = await connection.query('SELECT id FROM stok_tabung WHERE kode_tabung = ?', [newKodeTabung]);
    
    if (existingNew.length === 0) {
      // Pastikan kode_tabung ada di tabel tabungs dulu
      const [tabungExists] = await connection.query('SELECT kode_tabung FROM tabungs WHERE kode_tabung = ?', [newKodeTabung]);
      
      if (tabungExists.length === 0) {
        console.log(`📝 Insert ${newKodeTabung} ke tabel tabungs terlebih dahulu`);
        // Cek struktur tabel tabungs dulu
        const [tabungsStructure] = await connection.query('DESCRIBE tabungs');
        console.log('Struktur tabel tabungs:');
        console.table(tabungsStructure);
        
        // Insert dengan kolom yang benar
        const currentTime = new Date();
        await connection.query('INSERT INTO tabungs (kode_tabung, seri_tabung, tahun, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', 
          [newKodeTabung, 'SERIES-TEST', 2025, currentTime, currentTime]);
      }
      
      // Insert ke stok_tabung
      const [insertResult] = await connection.query(
        'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newKodeTabung, testStatus, 0, testLokasi, currentTime, currentTime]
      );
      console.log(`Insert result:`, insertResult.insertId);
      
      // Verifikasi insert
      const [insertedData] = await connection.query('SELECT kode_tabung, lokasi, status FROM stok_tabung WHERE kode_tabung = ?', [newKodeTabung]);
      console.log('Data setelah insert:');
      console.table(insertedData);
      
      // Cleanup - hapus data test
      await connection.query('DELETE FROM stok_tabung WHERE kode_tabung = ?', [newKodeTabung]);
      await connection.query('DELETE FROM tabungs WHERE kode_tabung = ?', [newKodeTabung]);
      console.log(`🧹 Cleanup: Data test ${newKodeTabung} dihapus`);
      
    } else {
      console.log(`⚠️ Kode tabung ${newKodeTabung} sudah ada di stok_tabung`);
    }

    console.log('\n✅ Test selesai - Lokasi update functionality working correctly');

  } catch (error) {
    console.error('❌ Error testing lokasi update:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
testLokasiUpdate();