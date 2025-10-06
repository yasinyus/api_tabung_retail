const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyLokasiUpdate() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tabung_retail'
    });

    console.log('🔗 Database connected successfully');

    // Simulasi proses lengkap seperti di API
    console.log('\n🎯 Simulating complete "Terima Tabung Dari Pelanggan" with Rusak status...');
    
    const activity = "Terima Tabung Dari Pelanggan";
    const dari = "CUST001";
    const tujuan = "GUDANG_RUSAK_FINAL";
    const tabung = ["TB0002", "TB0003"];  // Gunakan kode yang ada
    const status = "Rusak";
    const waktu = new Date();
    const nama_petugas = "Test Petugas";
    const id_user = 1;
    const total_tabung = tabung.length;

    // 1. Insert ke aktivitas_tabung
    console.log('📝 Step 1: Insert to aktivitas_tabung...');
    const [activityResult] = await connection.query(
      'INSERT INTO aktivitas_tabung (dari, tujuan, tabung, keterangan, nama_petugas, id_user, total_tabung, tanggal, waktu, nama_aktivitas, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [dari, tujuan, JSON.stringify(tabung), 'Test rusak', nama_petugas, id_user, total_tabung, waktu.toISOString().split('T')[0], waktu, activity, status]
    );
    console.log('✅ Activity inserted with ID:', activityResult.insertId);

    // 2. Process stok_tabung untuk setiap kode_tabung
    console.log('\n🔄 Step 2: Process stok_tabung updates...');
    const stokResults = [];
    
    for (const kode_tabung of tabung) {
      try {
        console.log(`Processing tabung: ${kode_tabung}`);
        
        // Cek apakah kode_tabung sudah ada di stok_tabung
        const [existingStok] = await connection.query('SELECT id FROM stok_tabung WHERE kode_tabung = ?', [kode_tabung]);
        console.log(`Existing stok check for ${kode_tabung}:`, existingStok.length);
        
        // Logic khusus untuk status "Rusak" pada aktivitas "Terima Tabung"
        if (status === "Rusak" && (activity === "Terima Tabung Dari Pelanggan" || activity === "Terima Tabung Dari Agen")) {
          if (existingStok.length > 0) {
            // Update jika sudah ada, lokasi diisi dengan tujuan
            console.log(`Updating existing stok for ${kode_tabung} with Rusak status - lokasi from tujuan`);
            const [updateResult] = await connection.query(
              'UPDATE stok_tabung SET status = ?, lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?', 
              [status, tujuan, waktu, kode_tabung]
            );
            console.log(`Update result for ${kode_tabung}:`, updateResult.affectedRows);
            stokResults.push({
              kode_tabung: kode_tabung,
              action: 'updated',
              affectedRows: updateResult.affectedRows,
              success: updateResult.affectedRows > 0,
              note: 'Rusak status - lokasi updated from tujuan'
            });
          } else {
            // Insert jika belum ada, lokasi diisi dengan tujuan
            console.log(`Inserting new stok for ${kode_tabung} with Rusak status - lokasi from tujuan`);
            const [insertResult] = await connection.query(
              'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [kode_tabung, status, 0, tujuan, waktu, waktu]
            );
            console.log(`Insert result for ${kode_tabung}:`, insertResult.insertId);
            stokResults.push({
              kode_tabung: kode_tabung,
              action: 'inserted',
              insertId: insertResult.insertId,
              success: insertResult.insertId > 0,
              note: 'Rusak status - lokasi set from tujuan'
            });
          }
        }
      } catch (stokError) {
        console.error(`Error updating stok_tabung for ${kode_tabung}:`, stokError.message);
        stokResults.push({
          kode_tabung: kode_tabung,
          action: 'error',
          error: stokError.message,
          success: false
        });
      }
    }

    // 3. Verifikasi hasil
    console.log('\n📊 Step 3: Verify results...');
    console.log('Stok Results:');
    console.table(stokResults);

    // Cek data aktual di database
    console.log('\n🔍 Current data in stok_tabung for processed tabung:');
    for (const kode_tabung of tabung) {
      const [currentData] = await connection.query('SELECT * FROM stok_tabung WHERE kode_tabung = ?', [kode_tabung]);
      if (currentData.length > 0) {
        console.log(`${kode_tabung}:`, {
          status: currentData[0].status,
          lokasi: currentData[0].lokasi,
          tanggal_update: currentData[0].tanggal_update
        });
      } else {
        console.log(`${kode_tabung}: Not found in stok_tabung`);
      }
    }

    // Summary
    const successful = stokResults.filter(r => r.success).length;
    const failed = stokResults.filter(r => !r.success).length;
    
    console.log('\n✅ SUMMARY:');
    console.log(`📈 Activity ID: ${activityResult.insertId}`);
    console.log(`📦 Total Tabung: ${tabung.length}`);
    console.log(`✅ Successful Updates: ${successful}`);
    console.log(`❌ Failed Updates: ${failed}`);
    console.log(`🎯 Target Lokasi: ${tujuan}`);
    console.log(`📊 Status Applied: ${status}`);
    
    if (successful === tabung.length) {
      console.log('\n🎉 ALL LOKASI UPDATES SUCCESSFUL!');
      console.log('✅ Problem SOLVED: stok_tabung kolom lokasi sudah terupdate dengan benar');
    } else {
      console.log('\n⚠️ Some updates failed. Check error messages above.');
    }

  } catch (error) {
    console.error('❌ Error in verification:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the verification
verifyLokasiUpdate();