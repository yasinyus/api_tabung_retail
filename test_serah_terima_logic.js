// Test untuk memastikan serah_terima_tabungs insert bekerja
console.log('=== TEST SERAH TERIMA TABUNGS LOGIC ===');
console.log('');

console.log('Kondisi yang harus dipenuhi untuk insert ke serah_terima_tabungs:');
console.log('1. status === "Refund"');
console.log('2. activity === "Terima Tabung Dari Pelanggan" ATAU "Terima Tabung Dari Agen"');
console.log('');

console.log('Data yang akan diinsert:');
console.log('- id: autoincrement');
console.log('- bast_id: generated 8 karakter (format: BASTxxxx)');
console.log('- kode_pelanggan: dari parameter tujuan');
console.log('- tabung: JSON array dari parameter tabung');
console.log('- total_harga: NULL (sesuai permintaan)');
console.log('- status: dari parameter status ("Refund")');
console.log('- created_at, updated_at: timestamp');
console.log('');

console.log('Contoh request yang HARUS berhasil:');
console.log(JSON.stringify({
  "dari": "PL001",
  "tujuan": "GD001", 
  "tabung": ["TB001", "TB002", "TB003"],
  "keterangan": "Refund tabung rusak",
  "activity": "Terima Tabung Dari Pelanggan",
  "status": "Refund"
}, null, 2));

console.log('');
console.log('Expected response:');
console.log(JSON.stringify({
  "message": "Sukses - Aktivitas berhasil disimpan (stok_tabung tidak diubah untuk status Refund)",
  "id": 42,
  "total_tabung": 3,
  "status": "Refund",
  "serah_terima": {
    "id": 1,
    "bast_id": "BASTxxxx",
    "kode_pelanggan": "GD001",
    "total_harga": null,
    "status": "Refund"
  }
}, null, 2));

console.log('');
console.log('Server is running on: http://localhost:3000');
console.log('Test endpoint: POST /api/tabung_activity');
console.log('');
console.log('Jika serah_terima masih null, cek:');
console.log('1. Pastikan activity exact match: "Terima Tabung Dari Pelanggan"');
console.log('2. Pastikan status exact match: "Refund"');
console.log('3. Cek server logs untuk debug output');
console.log('4. Cek apakah ada error dalam proses insert');