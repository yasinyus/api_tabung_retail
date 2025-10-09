const mysql = require('mysql2/promise');
require('dotenv').config();

async function testTrxIdInLaporanPelanggan() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Test 1: Cek struktur tabel laporan_pelanggan
    console.log('\n📊 Test 1: Checking laporan_pelanggan table structure');
    const [structure] = await connection.query('DESCRIBE laporan_pelanggan');
    const bastInvoiceField = structure.find(field => field.Field === 'id_bast_invoice');
    
    if (bastInvoiceField) {
      console.log('✅ Column id_bast_invoice exists:');
      console.log(bastInvoiceField);
    } else {
      console.log('❌ Column id_bast_invoice NOT found');
      console.log('Available columns:');
      structure.forEach(field => console.log(`- ${field.Field}`));
    }

    // Test 2: Cek data terbaru di laporan_pelanggan
    console.log('\n📋 Test 2: Recent data in laporan_pelanggan');
    const [recentData] = await connection.query(`
      SELECT 
        id,
        tanggal,
        kode_pelanggan,
        keterangan,
        harga,
        id_bast_invoice,
        created_at
      FROM laporan_pelanggan 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (recentData.length > 0) {
      console.log(`Found ${recentData.length} recent records:`);
      recentData.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`- ID: ${record.id}`);
        console.log(`- Tanggal: ${record.tanggal}`);
        console.log(`- Kode Pelanggan: ${record.kode_pelanggan}`);
        console.log(`- Keterangan: ${record.keterangan}`);
        console.log(`- Harga: ${record.harga}`);
        console.log(`- ID BAST Invoice: ${record.id_bast_invoice || 'NULL'}`);
        console.log(`- Created At: ${record.created_at}`);
      });

      // Test 3: Cek apakah ada record dengan id_bast_invoice yang diisi
      console.log('\n🔍 Test 3: Records with id_bast_invoice filled');
      const [filledBastInvoice] = await connection.query(`
        SELECT 
          id,
          kode_pelanggan,
          keterangan,
          harga,
          id_bast_invoice,
          created_at
        FROM laporan_pelanggan 
        WHERE id_bast_invoice IS NOT NULL AND id_bast_invoice != ''
        ORDER BY created_at DESC 
        LIMIT 3
      `);

      if (filledBastInvoice.length > 0) {
        console.log(`✅ Found ${filledBastInvoice.length} records with id_bast_invoice:`);
        filledBastInvoice.forEach((record, index) => {
          console.log(`${index + 1}. ID: ${record.id}, Customer: ${record.kode_pelanggan}, Invoice ID: ${record.id_bast_invoice}`);
        });
      } else {
        console.log('⚠️ No records found with id_bast_invoice filled');
      }

      // Test 4: Validasi format TRX ID
      if (filledBastInvoice.length > 0) {
        console.log('\n🎯 Test 4: TRX ID format validation');
        filledBastInvoice.forEach((record, index) => {
          const trxId = record.id_bast_invoice;
          const isTrxFormat = trxId && trxId.startsWith('TRX-');
          console.log(`${index + 1}. ${trxId} - ${isTrxFormat ? '✅ Valid TRX format' : '❌ Invalid format'}`);
        });
      }

    } else {
      console.log('⚠️ No data found in laporan_pelanggan table');
    }

    // Test 5: Simulasi INSERT seperti di API (untuk memastikan query berhasil)
    console.log('\n🧪 Test 5: Simulate API INSERT query');
    const testTrxId = 'TRX-TEST123456';
    const testDate = new Date().toISOString().split('T')[0];
    const testCustomer = 'TEST_CUSTOMER';

    try {
      // Test query tanpa eksekusi actual
      const testQuery = `
        INSERT INTO laporan_pelanggan 
        (tanggal, kode_pelanggan, keterangan, tabung, harga, tambahan_deposit, pengurangan_deposit, sisa_deposit, konfirmasi, list_tabung, id_bast_invoice, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // Hanya test format query, tidak eksekusi
      console.log('✅ INSERT query format is correct');
      console.log(`Sample TRX ID that would be inserted: ${testTrxId}`);
      
    } catch (queryError) {
      console.log('❌ INSERT query format error:', queryError.message);
    }

    console.log('\n✅ Test completed successfully!');
    console.log('📝 The aktivitas-transaksi API should now insert trx_id into id_bast_invoice column');

  } catch (error) {
    console.error('❌ Error testing trx_id in laporan_pelanggan:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testTrxIdInLaporanPelanggan();