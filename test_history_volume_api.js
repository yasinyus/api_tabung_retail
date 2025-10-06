const http = require('http');

// Function untuk melakukan HTTP request
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testHistoryVolumeAPI() {
  console.log('🚀 Testing History Volume API Endpoints...\n');

  // Token dummy untuk testing - dalam praktik nyata harus token valid
  const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJrZXBhbGFfZ3VkYW5nIiwiaWF0IjoxNzI4MjEyNDY5fQ.placeholder';

  const baseOptions = {
    hostname: 'localhost',
    port: 3000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    }
  };

  try {
    // Test 1: GET /api/history-volume/all (default)
    console.log('📋 Test 1: GET /api/history-volume/all (default pagination)');
    const test1Options = { ...baseOptions, path: '/api/history-volume/all', method: 'GET' };
    const result1 = await makeRequest(test1Options);
    console.log(`Status: ${result1.statusCode}`);
    if (result1.data.message) {
      console.log(`Message: ${result1.data.message}`);
      console.log(`Total Records: ${result1.data.pagination?.total_records || 0}`);
      console.log(`Current Page: ${result1.data.pagination?.current_page || 1}`);
      console.log(`Records in this page: ${result1.data.data?.length || 0}`);
    }
    console.log('✅ Test 1 completed\n');

    // Test 2: GET /api/history-volume/all dengan filter dan pagination
    console.log('📋 Test 2: GET /api/history-volume/all (with filters)');
    const test2Options = { 
      ...baseOptions, 
      path: '/api/history-volume/all?page=1&limit=5&sort_by=created_at&sort_order=DESC&status=isi', 
      method: 'GET' 
    };
    const result2 = await makeRequest(test2Options);
    console.log(`Status: ${result2.statusCode}`);
    if (result2.data.message) {
      console.log(`Message: ${result2.data.message}`);
      console.log(`Filters Applied: ${JSON.stringify(result2.data.filters || {})}`);
      console.log(`Records found: ${result2.data.data?.length || 0}`);
    }
    console.log('✅ Test 2 completed\n');

    // Test 3: GET /api/history-volume/statistik
    console.log('📊 Test 3: GET /api/history-volume/statistik');
    const test3Options = { ...baseOptions, path: '/api/history-volume/statistik?periode=30', method: 'GET' };
    const result3 = await makeRequest(test3Options);
    console.log(`Status: ${result3.statusCode}`);
    if (result3.data.message) {
      console.log(`Message: ${result3.data.message}`);
      console.log(`Periode: ${result3.data.periode || 'N/A'}`);
      if (result3.data.statistik?.total) {
        console.log(`Total Pengisian: ${result3.data.statistik.total.total_pengisian || 0}`);
        console.log(`Total Volume: ${result3.data.statistik.total.total_volume || 0}`);
      }
    }
    console.log('✅ Test 3 completed\n');

    // Test 4: GET /api/history-volume/detail/:id
    console.log('📝 Test 4: GET /api/history-volume/detail/1');
    const test4Options = { ...baseOptions, path: '/api/history-volume/detail/1', method: 'GET' };
    const result4 = await makeRequest(test4Options);
    console.log(`Status: ${result4.statusCode}`);
    if (result4.data.message) {
      console.log(`Message: ${result4.data.message}`);
      if (result4.data.data) {
        console.log(`ID: ${result4.data.data.id}`);
        console.log(`Tanggal: ${result4.data.data.tanggal}`);
        console.log(`Lokasi: ${result4.data.data.lokasi}`);
        console.log(`Total Tabung: ${result4.data.data.total_tabung}`);
      }
    }
    console.log('✅ Test 4 completed\n');

    // Test 5: GET /api/history-volume/export (JSON format)
    console.log('📤 Test 5: GET /api/history-volume/export (JSON)');
    const test5Options = { ...baseOptions, path: '/api/history-volume/export?format=json&limit=3', method: 'GET' };
    const result5 = await makeRequest(test5Options);
    console.log(`Status: ${result5.statusCode}`);
    if (result5.data.message) {
      console.log(`Message: ${result5.data.message}`);
      console.log(`Total Records: ${result5.data.total_records || 0}`);
    }
    console.log('✅ Test 5 completed\n');

    // Summary
    console.log('🎉 All History Volume API tests completed!');
    console.log('\n📋 Available Endpoints:');
    console.log('- GET /api/history-volume/all - List history dengan pagination & filter');
    console.log('- GET /api/history-volume/detail/:id - Detail history berdasarkan ID');
    console.log('- GET /api/history-volume/statistik - Statistik pengisian volume');
    console.log('- GET /api/history-volume/export - Export data (JSON/CSV)');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('💡 Make sure server is running on port 3000');
  }
}

// Run the tests
testHistoryVolumeAPI();