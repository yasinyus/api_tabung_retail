const http = require('http');

// Test API endpoint untuk Terima Tabung dengan status Rusak
function testTabungActivityAPI() {
  const postData = JSON.stringify({
    "activity": "Terima Tabung Dari Pelanggan",
    "dari": "CUST001", 
    "tujuan": "GUDANG_RUSAK_001",
    "tabung": ["TB0002", "TB0003"],
    "keterangan": "Test tabung rusak dari pelanggan",
    "status": "Rusak"
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tabung/activity',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      // Token dummy - dalam praktik nyata harus token valid
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJrZXBhbGFfZ3VkYW5nIiwiaWF0IjoxNzI4MjEyNDY5fQ.placeholder'
    }
  };

  console.log('🚀 Testing Tabung Activity API with Rusak status...');
  console.log('📝 Request data:', JSON.parse(postData));

  const req = http.request(options, (res) => {
    console.log(`\n📡 Response Status: ${res.statusCode}`);
    console.log('📋 Response Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n✅ Response Body:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.stok_results) {
          console.log('\n📊 Stok Results Summary:');
          response.stok_results.forEach(result => {
            console.log(`- ${result.kode_tabung}: ${result.action} (${result.success ? 'SUCCESS' : 'FAILED'})`);
            if (result.note) console.log(`  Note: ${result.note}`);
          });
        }
      } catch (e) {
        console.log('\n📄 Raw Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
    console.log('💡 Make sure server is running on port 3000');
  });

  req.write(postData);
  req.end();
}

// Check if server is running first
const checkOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ping',
  method: 'GET'
};

console.log('🔍 Checking if server is running...');

const checkReq = http.request(checkOptions, (res) => {
  if (res.statusCode === 404) {
    console.log('✅ Server is running on port 3000');
    console.log('⏳ Waiting 2 seconds before testing API...\n');
    setTimeout(testTabungActivityAPI, 2000);
  }
}).on('error', (e) => {
  console.log('❌ Server is not running. Please start the server first:');
  console.log('   node index.js');
});

checkReq.end();