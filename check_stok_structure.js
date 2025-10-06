const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStokTabungStructure() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Cek struktur tabel stok_tabung
    const [stokStructure] = await connection.query('DESCRIBE stok_tabung');
    console.log('Struktur tabel stok_tabung:');
    console.table(stokStructure);

    // Cek nilai ENUM untuk status
    const [showCreate] = await connection.query("SHOW CREATE TABLE stok_tabung");
    console.log('\nCreate table statement:');
    console.log(showCreate[0]['Create Table']);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkStokTabungStructure();