const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterStokTabungEnum() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');
    
    // Backup data dulu
    console.log('\n📋 Backup current data in stok_tabung:');
    const [backupData] = await connection.query('SELECT kode_tabung, status, lokasi FROM stok_tabung');
    console.table(backupData);

    // Alter table untuk menambahkan 'Rusak' ke ENUM
    console.log('\n🔧 Altering stok_tabung table to add "Rusak" status...');
    await connection.query(`
      ALTER TABLE stok_tabung 
      MODIFY COLUMN status ENUM('Kosong','Isi','Rusak') 
      COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Kosong'
    `);
    
    console.log('✅ Table altered successfully!');
    
    // Verifikasi perubahan
    console.log('\n🔍 Verifying table structure:');
    const [newStructure] = await connection.query('DESCRIBE stok_tabung');
    const statusField = newStructure.find(field => field.Field === 'status');
    console.log('Status field:', statusField);
    
    // Test insert dengan status Rusak
    console.log('\n🧪 Testing insert with Rusak status...');
    
    // Pastikan ada data di tabungs dulu
    const testKodeTabung = 'TB_TEST_RUSAK';
    const currentTime = new Date();
    
    // Insert ke tabungs dulu
    try {
      await connection.query('INSERT INTO tabungs (kode_tabung, seri_tabung, tahun, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', 
        [testKodeTabung, 'SERIES-TEST-RUSAK', 2025, currentTime, currentTime]);
      console.log('✅ Test data inserted to tabungs');
    } catch (tabungsError) {
      if (tabungsError.code === 'ER_DUP_ENTRY') {
        console.log('⚠️ Test data already exists in tabungs');
      } else {
        throw tabungsError;
      }
    }
    
    // Insert ke stok_tabung dengan status Rusak
    try {
      const [insertResult] = await connection.query(
        'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [testKodeTabung, 'Rusak', 0, 'GUDANG_RUSAK_TEST', currentTime, currentTime]
      );
      console.log('✅ Insert with Rusak status successful:', insertResult.insertId);
      
      // Verifikasi data
      const [testData] = await connection.query('SELECT * FROM stok_tabung WHERE kode_tabung = ?', [testKodeTabung]);
      console.log('📊 Inserted data:');
      console.table(testData);
      
      // Cleanup
      await connection.query('DELETE FROM stok_tabung WHERE kode_tabung = ?', [testKodeTabung]);
      await connection.query('DELETE FROM tabungs WHERE kode_tabung = ?', [testKodeTabung]);
      console.log('🧹 Test data cleaned up');
      
    } catch (insertError) {
      console.error('❌ Insert test failed:', insertError.message);
    }
    
    console.log('\n✅ Database alteration completed successfully!');
    console.log('📝 Status ENUM now supports: Kosong, Isi, Rusak');

  } catch (error) {
    console.error('❌ Error altering database:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the alteration
alterStokTabungEnum();