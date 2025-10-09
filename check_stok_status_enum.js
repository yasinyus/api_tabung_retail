const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStokTabungStatusEnum() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Cek struktur tabel stok_tabung untuk melihat ENUM status
    console.log('\n📊 Checking stok_tabung table structure:');
    const [structure] = await connection.query('DESCRIBE stok_tabung');
    const statusField = structure.find(field => field.Field === 'status');
    
    console.log('Status field info:');
    console.log(statusField);

    // Cek dengan SHOW CREATE TABLE untuk melihat ENUM values
    console.log('\n🔍 Checking ENUM values:');
    const [showCreate] = await connection.query("SHOW CREATE TABLE stok_tabung");
    console.log('Create table statement:');
    console.log(showCreate[0]['Create Table']);

    // Test insert dengan berbagai status
    console.log('\n🧪 Testing status values:');
    const testStatuses = ['Kosong', 'Isi', 'Rusak', 'kosong', 'isi', 'rusak'];
    
    for (const status of testStatuses) {
      try {
        // Test dengan query sederhana
        await connection.query('SELECT ? as test_status', [status]);
        console.log(`✅ Status "${status}" - Format OK`);
        
        // Test apakah bisa digunakan dalam UPDATE
        const testQuery = `SELECT CASE WHEN ? IN ('Kosong','Isi','Rusak') THEN 'VALID' ELSE 'INVALID' END as validation`;
        const [result] = await connection.query(testQuery, [status]);
        console.log(`   Validation: ${result[0].validation}`);
        
      } catch (error) {
        console.log(`❌ Status "${status}" - Error: ${error.message}`);
      }
    }

    // Cek data existing di stok_tabung
    console.log('\n📋 Current data in stok_tabung:');
    const [currentData] = await connection.query('SELECT kode_tabung, status, lokasi FROM stok_tabung LIMIT 5');
    console.table(currentData);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the check
checkStokTabungStatusEnum();