// Direct database test for Rusak status logic

// Check current stok_tabung before and after
async function checkStokTabung() {
  const mysql = require('mysql2/promise');
  require('dotenv').config();
  
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  console.log('\n4. Current stok_tabung data for TB0001 and TB0002:');
  const [results] = await db.query('SELECT * FROM stok_tabung WHERE kode_tabung IN (?, ?)', ['TB0001', 'TB0002']);
  console.table(results);

  await db.end();
}

async function main() {
  console.log('=== TESTING RUSAK STATUS API ===\n');
  
  // Check current data first
  await checkStokTabung();
  
  // Test the API
  await testRusakStatusAPI();
  
  // Check data after API call
  setTimeout(async () => {
    console.log('\n=== AFTER API CALL ===');
    await checkStokTabung();
  }, 2000);
}

main().catch(console.error);