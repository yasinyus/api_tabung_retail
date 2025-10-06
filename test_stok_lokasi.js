require('dotenv').config();
const db = require('./src/db');

async function testStokTabungLokasi() {
  try {
    console.log('=== TESTING STOK_TABUNG LOKASI UPDATE ===\n');

    // 1. Check table structure
    console.log('1. Checking stok_tabung table structure:');
    const [columns] = await db.query('DESCRIBE stok_tabung');
    console.table(columns);

    // 2. Check current data in stok_tabung
    console.log('\n2. Current data in stok_tabung:');
    const [currentData] = await db.query('SELECT * FROM stok_tabung LIMIT 10');
    console.table(currentData);

    // 3. Test manual update
    console.log('\n3. Testing manual lokasi update:');
    
    // First, insert a test record if not exists
    const testKodeTabung = 'TEST_LOK_001';
    const [existing] = await db.query('SELECT * FROM stok_tabung WHERE kode_tabung = ?', [testKodeTabung]);
    
    if (existing.length === 0) {
      console.log('Inserting test record...');
      await db.query(
        'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [testKodeTabung, 'Kosong', 0, 'TEST_LOCATION']
      );
      console.log('Test record inserted.');
    }

    // Try to update lokasi
    console.log('Updating lokasi...');
    const [updateResult] = await db.query(
      'UPDATE stok_tabung SET lokasi = ?, status = ?, tanggal_update = NOW() WHERE kode_tabung = ?',
      ['UPDATED_LOCATION', 'Rusak', testKodeTabung]
    );
    
    console.log('Update result:', updateResult);

    // Check if update was successful
    const [updatedData] = await db.query('SELECT * FROM stok_tabung WHERE kode_tabung = ?', [testKodeTabung]);
    console.log('Updated record:');
    console.table(updatedData);

    // 4. Check if there are any records with NULL lokasi
    console.log('\n4. Checking records with NULL lokasi:');
    const [nullLokasi] = await db.query('SELECT COUNT(*) as count_null_lokasi FROM stok_tabung WHERE lokasi IS NULL');
    console.log('Records with NULL lokasi:', nullLokasi[0].count_null_lokasi);

    // 5. Show sample records with non-null lokasi
    console.log('\n5. Sample records with non-null lokasi:');
    const [nonNullLokasi] = await db.query('SELECT * FROM stok_tabung WHERE lokasi IS NOT NULL LIMIT 5');
    console.table(nonNullLokasi);

    // Clean up test data
    await db.query('DELETE FROM stok_tabung WHERE kode_tabung = ?', [testKodeTabung]);
    console.log('\nTest record cleaned up.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testStokTabungLokasi();