const bcrypt = require('bcrypt');
let hash = '$2y$12$1oLIASnwlsxlI9JgHulT4uakgJCIwKBDvSDE9kTl9FljvdCxr4jJG'; // hash dari database
const password = 'gudang'; // password asli

if (hash.startsWith('$2y$')) {
  hash = '$2b$' + hash.slice(4);
}

bcrypt.compare(password, hash)
  .then(match => {
    if (match) {
      console.log('Password cocok');
    } else {
      console.log('Password salah');
    }
  });