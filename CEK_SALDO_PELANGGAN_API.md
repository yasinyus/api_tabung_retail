# API CEK SALDO PELANGGAN

## ✅ IMPLEMENTASI BERHASIL

### File Baru: `src/routes/cek_saldo_pelanggan.js`
🔗 **Routes**: Terdaftar di `index.js` dengan prefix `/api`

---

## 📊 ENDPOINT 1: GET SALDO BY KODE PELANGGAN

### URL
```
GET /api/saldo/:kode_pelanggan
```

### Authentication
- **Required**: JWT Token
- **Header**: `Authorization: Bearer <token>`

### Parameters
- **kode_pelanggan** (path parameter): Kode pelanggan (exact match)

### Response Success (200)
```json
{
  "message": "Saldo pelanggan berhasil ditemukan",
  "data": {
    "saldo_info": {
      "saldo_id": 15,
      "saldo": 2500000.00,
      "currency": "IDR",
      "last_updated": "2025-10-06T10:30:00.000Z",
      "created_at": "2025-09-15T08:00:00.000Z"
    },
    "pelanggan_info": {
      "pelanggan_id": 45,
      "kode_pelanggan": "PL001",
      "nama_pelanggan": "PT ABC Corporation",
      "alamat": "Jl. Sudirman No. 123, Jakarta",
      "telepon": "081234567890",
      "harga_tabung": 5000.00,
      "created_at": "2025-08-01T09:00:00.000Z"
    }
  }
}
```

### Response Error (404)
```json
{
  "message": "Saldo pelanggan tidak ditemukan",
  "kode_pelanggan": "PL999"
}
```

---

## 🔍 ENDPOINT 2: SEARCH SALDO PELANGGAN

### URL
```
GET /api/saldo/search/:query
```

### Authentication
- **Required**: JWT Token
- **Header**: `Authorization: Bearer <token>`

### Parameters
- **query** (path parameter): Search term (nama_pelanggan atau kode_pelanggan)
- **limit** (query parameter, optional): Limit hasil (default: 10)

### Example Request
```
GET /api/saldo/search/ABC?limit=5
```

### Response Success (200)
```json
{
  "message": "Search saldo pelanggan berhasil",
  "query": "ABC",
  "total_found": 2,
  "data": [
    {
      "saldo_info": {
        "saldo_id": 15,
        "saldo": 2500000.00,
        "currency": "IDR",
        "last_updated": "2025-10-06T10:30:00.000Z",
        "created_at": "2025-09-15T08:00:00.000Z"
      },
      "pelanggan_info": {
        "pelanggan_id": 45,
        "kode_pelanggan": "PL001",
        "nama_pelanggan": "PT ABC Corporation",
        "alamat": "Jl. Sudirman No. 123, Jakarta",
        "telepon": "081234567890",
        "harga_tabung": 5000.00,
        "created_at": "2025-08-01T09:00:00.000Z"
      }
    },
    {
      "saldo_info": {
        "saldo_id": 16,
        "saldo": 1800000.00,
        "currency": "IDR",
        "last_updated": "2025-10-05T15:20:00.000Z",
        "created_at": "2025-09-10T10:00:00.000Z"
      },
      "pelanggan_info": {
        "pelanggan_id": 46,
        "kode_pelanggan": "PL002",
        "nama_pelanggan": "CV ABC Trading",
        "alamat": "Jl. Thamrin No. 456, Jakarta",
        "telepon": "081234567891",
        "harga_tabung": 4800.00,
        "created_at": "2025-08-02T11:00:00.000Z"
      }
    }
  ]
}
```

---

## 📋 ENDPOINT 3: LIST SEMUA SALDO PELANGGAN

### URL
```
GET /api/saldo-list
```

### Authentication
- **Required**: JWT Token
- **Header**: `Authorization: Bearer <token>`

### Query Parameters
- **page** (optional): Halaman (default: 1)
- **limit** (optional): Jumlah per halaman (default: 20)
- **sort_by** (optional): Field untuk sorting (default: 'nama_pelanggan')
  - Allowed: `nama_pelanggan`, `kode_pelanggan`, `saldo`, `saldo_created_at`
- **order** (optional): Urutan sorting (default: 'ASC')
  - Allowed: `ASC`, `DESC`

### Example Request
```
GET /api/saldo-list?page=1&limit=10&sort_by=saldo&order=DESC
```

### Response Success (200)
```json
{
  "message": "List saldo pelanggan berhasil diambil",
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total_records": 25,
    "total_pages": 3
  },
  "summary": {
    "total_pelanggan": 25,
    "total_saldo": 45250000.00,
    "currency": "IDR"
  },
  "sort_info": {
    "sort_by": "saldo",
    "order": "DESC"
  },
  "data": [
    {
      "saldo_info": {
        "saldo_id": 15,
        "saldo": 2500000.00,
        "currency": "IDR",
        "last_updated": "2025-10-06T10:30:00.000Z",
        "created_at": "2025-09-15T08:00:00.000Z"
      },
      "pelanggan_info": {
        "pelanggan_id": 45,
        "kode_pelanggan": "PL001",
        "nama_pelanggan": "PT ABC Corporation",
        "alamat": "Jl. Sudirman No. 123, Jakarta",
        "telepon": "081234567890",
        "harga_tabung": 5000.00,
        "created_at": "2025-08-01T09:00:00.000Z"
      }
    }
  ]
}
```

---

## 🔍 FITUR UTAMA

### 1. Multi-Search Capability
- ✅ **Search by kode_pelanggan**: Exact match atau LIKE search
- ✅ **Search by nama_pelanggan**: LIKE search (partial match)
- ✅ **Flexible query**: Satu endpoint untuk kedua jenis pencarian

### 2. Complete Customer Data
- ✅ **Saldo Info**: ID, amount, currency, timestamps
- ✅ **Customer Info**: ID, kode, nama, alamat, telepon, harga
- ✅ **JOIN Query**: Efficient join antara saldo_pelanggans dan pelanggans

### 3. Advanced List Features
- ✅ **Pagination**: Full pagination support
- ✅ **Sorting**: Multi-field sorting dengan order ASC/DESC
- ✅ **Summary**: Total pelanggan dan total saldo
- ✅ **Security**: SQL injection protection dengan parameterized queries

### 4. Data Formatting
- ✅ **Currency**: Formatted float dengan 2 decimal places
- ✅ **Timestamps**: ISO format untuk konsistensi
- ✅ **Structure**: Organized dalam saldo_info dan pelanggan_info

---

## 🧪 TESTING

### Test Get Saldo by Kode
```bash
curl -X GET "http://localhost:3000/api/saldo/PL001" \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Search by Nama
```bash
curl -X GET "http://localhost:3000/api/saldo/search/ABC" \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Search by Kode
```bash
curl -X GET "http://localhost:3000/api/saldo/search/PL001" \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test List dengan Sorting
```bash
curl -X GET "http://localhost:3000/api/saldo-list?sort_by=saldo&order=DESC&limit=5" \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 QUERY YANG DIGUNAKAN

### Join Query:
```sql
SELECT 
  sp.id as saldo_id,
  sp.kode_pelanggan,
  sp.saldo,
  sp.created_at as saldo_created_at,
  sp.updated_at as saldo_updated_at,
  p.id as pelanggan_id,
  p.nama_pelanggan,
  p.alamat,
  p.telepon,
  p.harga_tabung,
  p.created_at as pelanggan_created_at
FROM saldo_pelanggans sp
JOIN pelanggans p ON sp.kode_pelanggan = p.kode_pelanggan
```

### Search Conditions:
```sql
WHERE p.nama_pelanggan LIKE ? OR p.kode_pelanggan LIKE ?
```

---

## 🛡️ SECURITY FEATURES

### 1. Authentication
- ✅ **JWT Required**: Semua endpoint memerlukan valid JWT token
- ✅ **Role Agnostic**: Dapat diakses oleh semua role yang terautentikasi

### 2. Input Validation
- ✅ **Parameter Validation**: Required parameters divalidasi
- ✅ **SQL Injection Protection**: Parameterized queries
- ✅ **Sort Field Validation**: Whitelist allowed sort fields

### 3. Error Handling
- ✅ **Graceful Errors**: Proper error messages dan status codes
- ✅ **Logging**: Console error logging untuk debugging
- ✅ **Data Sanitization**: Safe data handling

---

## ✅ STATUS IMPLEMENTATION

- ✅ **File Created**: `src/routes/cek_saldo_pelanggan.js`
- ✅ **Routes Registered**: Di `index.js` dengan prefix `/api`
- ✅ **Server Running**: Port 3000 tanpa error
- ✅ **JWT Authentication**: Implemented dan tested
- ✅ **Multi-search**: By nama_pelanggan dan kode_pelanggan
- ✅ **Pagination**: Full pagination support
- ✅ **Join Query**: Efficient database operations
- ✅ **Ready for Production**: Complete error handling

**🚀 API Cek Saldo Pelanggan siap digunakan!**