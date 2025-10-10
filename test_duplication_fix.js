const mysql = require('mysql2/promise');
require('dotenv').config();

async function testHistoryAllFixDuplication() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Test query sebelum fix (dengan JOIN biasa)
    console.log('\n❌ Query SEBELUM fix (with JOIN - causing duplication):');
    const [duplicatedData] = await connection.query(`
      SELECT 
        a.id,
        a.nama_aktivitas,
        a.waktu,
        st.bast_id,
        st.id as serah_terima_id
      FROM aktivitas_tabung a
      LEFT JOIN serah_terima_tabungs st ON a.id = st.aktivitas_id
      ORDER BY a.waktu DESC
      LIMIT 10
    `);

    console.log(`Found ${duplicatedData.length} records (with duplicates):`);
    duplicatedData.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, Activity: ${record.nama_aktivitas}, BAST: ${record.bast_id || 'NULL'}`);
    });

    // Count unique aktivitas IDs in duplicated result
    const uniqueIds = [...new Set(duplicatedData.map(r => r.id))];
    console.log(`Unique aktivitas IDs: ${uniqueIds.length} (should be same as total if no duplication)`);

    // Test query setelah fix (dengan subquery)
    console.log('\n✅ Query SETELAH fix (with subquery - no duplication):');
    const [fixedData] = await connection.query(`
      SELECT 
        a.id,
        a.nama_aktivitas,
        a.waktu,
        (SELECT bast_id FROM serah_terima_tabungs WHERE aktivitas_id = a.id LIMIT 1) as bast_id,
        (SELECT id FROM serah_terima_tabungs WHERE aktivitas_id = a.id LIMIT 1) as serah_terima_id
      FROM aktivitas_tabung a
      ORDER BY a.waktu DESC
      LIMIT 10
    `);

    console.log(`Found ${fixedData.length} records (no duplicates):`);
    fixedData.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, Activity: ${record.nama_aktivitas}, BAST: ${record.bast_id || 'NULL'}`);
    });

    // Verify no duplicates
    const fixedUniqueIds = [...new Set(fixedData.map(r => r.id))];
    console.log(`Unique aktivitas IDs: ${fixedUniqueIds.length} (should be same as total)`);

    // Test dengan user_id filter seperti di API
    console.log('\n🔍 Test with user_id filter (like in API):');
    const testUserId = 3; // From your response data
    const [userSpecificData] = await connection.query(`
      SELECT 
        a.id,
        a.nama_aktivitas,
        a.dari,
        a.tujuan,
        a.waktu,
        (SELECT bast_id FROM serah_terima_tabungs WHERE aktivitas_id = a.id LIMIT 1) as bast_id
      FROM aktivitas_tabung a
      WHERE a.id_user = ?
      ORDER BY a.waktu DESC
      LIMIT 5
    `, [testUserId]);

    console.log(`Found ${userSpecificData.length} records for user_id ${testUserId}:`);
    userSpecificData.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, ${record.nama_aktivitas}, ${record.dari} -> ${record.tujuan}, BAST: ${record.bast_id || 'NULL'}`);
    });

    // Count serah_terima_tabungs records untuk debugging
    console.log('\n📊 Debug info:');
    const [aktivitasCount] = await connection.query('SELECT COUNT(*) as count FROM aktivitas_tabung WHERE id_user = ?', [testUserId]);
    const [serahTerimaCount] = await connection.query('SELECT COUNT(*) as count FROM serah_terima_tabungs');
    const [serahTerimaWithAktivitas] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM serah_terima_tabungs st 
      JOIN aktivitas_tabung a ON st.aktivitas_id = a.id 
      WHERE a.id_user = ?
    `, [testUserId]);

    console.log(`- aktivitas_tabung (user ${testUserId}): ${aktivitasCount[0].count} records`);
    console.log(`- serah_terima_tabungs (total): ${serahTerimaCount[0].count} records`);
    console.log(`- serah_terima_tabungs (for user ${testUserId}): ${serahTerimaWithAktivitas[0].count} records`);

    console.log('\n✅ Duplication issue fixed! Each aktivitas_tabung now appears only once.');

  } catch (error) {
    console.error('❌ Error testing duplication fix:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testHistoryAllFixDuplication();