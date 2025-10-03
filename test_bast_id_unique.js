// Test generateBastId untuk memastikan tidak ada duplikasi
function generateBastId() {
  // Kombinasi timestamp presisi tinggi + process.hrtime untuk uniqueness
  const hrTime = process.hrtime.bigint().toString();
  const timestamp = Date.now().toString();
  const random1 = Math.random().toString(36).substr(2, 8);
  const random2 = Math.random().toString(36).substr(2, 8);
  
  // Gabungkan semua dan ambil 8 karakter unik
  const combined = (hrTime + timestamp + random1 + random2).replace(/[^A-Z0-9]/gi, '');
  let result = '';
  
  // Pilih 8 karakter acak dari kombinasi untuk memastikan tidak ada duplikasi
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * combined.length);
    result += combined[randomIndex].toUpperCase();
  }
  
  return result;
}

console.log('=== TEST GENERATE BAST ID UNIK ===');
console.log('');

// Generate 50 BAST ID untuk test duplikasi
const bastIds = new Set();
const duplicates = [];

for (let i = 0; i < 50; i++) {
  const id = generateBastId();
  if (bastIds.has(id)) {
    duplicates.push(id);
  }
  bastIds.add(id);
  console.log(`${i + 1}. ${id}`);
}

console.log('');
console.log(`Total generated: 50`);
console.log(`Unique IDs: ${bastIds.size}`);
console.log(`Duplicates: ${duplicates.length}`);

if (duplicates.length > 0) {
  console.log('Duplicate IDs found:', duplicates);
} else {
  console.log('✅ Semua ID unik, tidak ada duplikasi!');
}

console.log('');
console.log('Karakteristik BAST ID:');
console.log('- Panjang: 8 karakter');
console.log('- Format: Huruf besar dan angka');
console.log('- Menggunakan: process.hrtime + timestamp + random');
console.log('- Kemungkinan duplikasi: Sangat rendah');