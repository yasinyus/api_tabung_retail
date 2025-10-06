require('dotenv').config();
const db = require('./src/db');

async function checkTabungsAndConstraints() {
  try {
    console.log('=== CHECKING TABUNGS TABLE AND FOREIGN KEY CONSTRAINTS ===\n');

    // 1. Check tabungs table structure
    console.log('1. Checking tabungs table structure:');
    const [tabungsColumns] = await db.query('DESCRIBE tabungs');
    console.table(tabungsColumns);

    // 2. Check some data in tabungs
    console.log('\n2. Sample data in tabungs table:');
    const [tabungsData] = await db.query('SELECT * FROM tabungs LIMIT 10');
    console.table(tabungsData);

    // 3. Check foreign key constraints
    console.log('\n3. Checking foreign key constraints on stok_tabung:');
    const [constraints] = await db.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'stok_tabung' 
      AND TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.table(constraints);

    // 4. Check if there are kode_tabung in stok_tabung that don't exist in tabungs
    console.log('\n4. Checking orphaned kode_tabung in stok_tabung:');
    const [orphaned] = await db.query(`
      SELECT s.kode_tabung 
      FROM stok_tabung s 
      LEFT JOIN tabungs t ON s.kode_tabung = t.kode_tabung 
      WHERE t.kode_tabung IS NULL
    `);
    console.log('Orphaned kode_tabung:', orphaned);

    // 5. Try with existing kode_tabung from tabungs
    console.log('\n5. Testing update with existing kode_tabung:');
    const [existingTabung] = await db.query('SELECT kode_tabung FROM tabungs LIMIT 1');
    if (existingTabung.length > 0) {
      const testKode = existingTabung[0].kode_tabung;
      console.log('Using existing kode_tabung:', testKode);
      
      // Check if it exists in stok_tabung
      const [stokExists] = await db.query('SELECT * FROM stok_tabung WHERE kode_tabung = ?', [testKode]);
      console.log('Exists in stok_tabung:', stokExists.length > 0);
      
      if (stokExists.length > 0) {
        // Try to update lokasi
        console.log('Attempting to update lokasi...');
        const [updateResult] = await db.query(
          'UPDATE stok_tabung SET lokasi = ?, tanggal_update = NOW() WHERE kode_tabung = ?',
          ['TEST_UPDATE_LOKASI', testKode]
        );
        console.log('Update result:', updateResult);
        
        // Check the result
        const [updatedRecord] = await db.query('SELECT * FROM stok_tabung WHERE kode_tabung = ?', [testKode]);
        console.log('Updated record:');
        console.table(updatedRecord);
      } else {
        console.log('Kode tabung not found in stok_tabung, attempting insert...');
        const [insertResult] = await db.query(
          'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [testKode, 'Kosong', 0, 'TEST_INSERT_LOKASI']
        );
        console.log('Insert result:', insertResult);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTabungsAndConstraints();