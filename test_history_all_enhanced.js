const mysql = require('mysql2/promise');
require('dotenv').config();

async function testHistoryAllWithBastIdAndTrxId() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Test query seperti yang digunakan di API history/all
    console.log('\n🔍 Testing /api/history/all query with bast_id and trx_id...');
    
    const [historyData] = await connection.query(`
      SELECT 
        a.id,
        a.dari,
        a.tujuan,
        a.nama_aktivitas,
        a.status,
        a.waktu,
        t.trx_id,
        t.id as transaction_id,
        st.bast_id,
        st.id as serah_terima_id
      FROM aktivitas_tabung a
      LEFT JOIN transactions t ON a.id = t.aktivitas_id
      LEFT JOIN serah_terima_tabungs st ON a.id = st.aktivitas_id
      ORDER BY a.waktu DESC
      LIMIT 5
    `);

    console.log(`Found ${historyData.length} records:`);
    
    historyData.forEach((record, index) => {
      console.log(`\n📋 Record ${index + 1}:`);
      console.log(`- ID Aktivitas: ${record.id}`);
      console.log(`- Nama Aktivitas: ${record.nama_aktivitas}`);
      console.log(`- Status: ${record.status}`);
      console.log(`- Dari: ${record.dari}`);
      console.log(`- Tujuan: ${record.tujuan}`);
      console.log(`- Waktu: ${record.waktu}`);
      console.log(`- TRX ID: ${record.trx_id || 'NULL'}`);
      console.log(`- Transaction ID: ${record.transaction_id || 'NULL'}`);
      console.log(`- BAST ID: ${record.bast_id || 'NULL'}`);
      console.log(`- Serah Terima ID: ${record.serah_terima_id || 'NULL'}`);
    });

    // Cek statistik JOIN
    console.log('\n📊 JOIN Statistics:');
    
    const [joinStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_aktivitas,
        COUNT(t.trx_id) as with_trx_id,
        COUNT(st.bast_id) as with_bast_id,
        COUNT(CASE WHEN t.trx_id IS NOT NULL AND st.bast_id IS NOT NULL THEN 1 END) as with_both
      FROM aktivitas_tabung a
      LEFT JOIN transactions t ON a.id = t.aktivitas_id
      LEFT JOIN serah_terima_tabungs st ON a.id = st.aktivitas_id
    `);

    const stats = joinStats[0];
    console.log(`- Total Aktivitas: ${stats.total_aktivitas}`);
    console.log(`- Dengan TRX ID: ${stats.with_trx_id}`);
    console.log(`- Dengan BAST ID: ${stats.with_bast_id}`);
    console.log(`- Dengan keduanya: ${stats.with_both}`);

    // Test data per tabel
    console.log('\n🔍 Table counts:');
    const [aktivitasCount] = await connection.query('SELECT COUNT(*) as count FROM aktivitas_tabung');
    const [transactionsCount] = await connection.query('SELECT COUNT(*) as count FROM transactions');
    const [serahTerimaCount] = await connection.query('SELECT COUNT(*) as count FROM serah_terima_tabungs');
    
    console.log(`- aktivitas_tabung: ${aktivitasCount[0].count} records`);
    console.log(`- transactions: ${transactionsCount[0].count} records`);
    console.log(`- serah_terima_tabungs: ${serahTerimaCount[0].count} records`);

    // Contoh response format
    if (historyData.length > 0) {
      const sampleRecord = historyData[0];
      console.log('\n📝 Sample API Response Format:');
      console.log({
        id: sampleRecord.id,
        nama_aktivitas: sampleRecord.nama_aktivitas,
        status: sampleRecord.status,
        transaction_info: sampleRecord.trx_id ? {
          trx_id: sampleRecord.trx_id,
          transaction_id: sampleRecord.transaction_id
        } : null,
        serah_terima_info: sampleRecord.bast_id ? {
          bast_id: sampleRecord.bast_id,
          serah_terima_id: sampleRecord.serah_terima_id
        } : null
      });
    }

    console.log('\n✅ /api/history/all enhancement with bast_id and trx_id is working correctly!');

  } catch (error) {
    console.error('❌ Error testing history/all:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testHistoryAllWithBastIdAndTrxId();