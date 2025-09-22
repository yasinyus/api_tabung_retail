require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./src/db');
const app = express();

app.use(bodyParser.json());

// Test endpoint untuk stok_tabung
app.post('/test-stok', async (req, res) => {
  try {
    const { tabung, status, tujuan } = req.body;
    
    console.log('=== TEST STOK_TABUNG ===');
    console.log('Tabung:', tabung);
    console.log('Status:', status);
    console.log('Tujuan:', tujuan);
    
    if (!tabung || !Array.isArray(tabung)) {
      return res.status(400).json({ message: 'Array tabung diperlukan' });
    }
    
    const results = [];
    const waktu = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    for (const kode_tabung of tabung) {
      console.log(`\n--- Processing: ${kode_tabung} ---`);
      
      // Cek apakah sudah ada di stok_tabung
      const [existing] = await db.query('SELECT * FROM stok_tabung WHERE kode_tabung = ?', [kode_tabung]);
      console.log(`Existing records for ${kode_tabung}:`, existing.length);
      
      if (existing.length > 0) {
        // Update existing record
        console.log(`Updating existing record for ${kode_tabung}`);
        const [updateResult] = await db.query(
          'UPDATE stok_tabung SET status = ?, lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?',
          [status, tujuan, waktu, kode_tabung]
        );
        console.log(`Update result for ${kode_tabung}:`, updateResult);
        results.push({ 
          kode_tabung, 
          action: 'updated', 
          affectedRows: updateResult.affectedRows,
          success: updateResult.affectedRows > 0 
        });
      } else {
        // Insert new record
        console.log(`Inserting new record for ${kode_tabung}`);
        const [insertResult] = await db.query(
          'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [kode_tabung, status, 0, tujuan, waktu, waktu]
        );
        console.log(`Insert result for ${kode_tabung}:`, insertResult);
        results.push({ 
          kode_tabung, 
          action: 'inserted', 
          insertId: insertResult.insertId,
          success: insertResult.insertId > 0 
        });
      }
    }
    
    console.log('\n=== FINAL RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
    
    res.json({ 
      message: 'Test stok_tabung completed successfully', 
      results,
      summary: {
        total: tabung.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('Error in test-stok:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
});

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Test server running on port ${PORT}`);
});