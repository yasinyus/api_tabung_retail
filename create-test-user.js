const db = require('./src/db');
const bcrypt = require('bcrypt');

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      ['Test Kepala Gudang', 'test@gudang.com', hashedPassword, 'kepala_gudang']
    );
    
    console.log('Test user created/updated:', result);
    
    // Test login
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', ['test@gudang.com']);
    console.log('User found:', users[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();