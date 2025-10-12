# API Laporan Pelanggan - Dokumentasi Lengkap

## Overview
API ini menyediakan fungsionalitas untuk melihat laporan pelanggan dari tabel `laporan_pelanggan` berdasarkan `kode_pelanggan` dengan berbagai fitur seperti pagination, filtering, statistics, dan detail laporan.

## Base URL
```
http://localhost:3000/api/laporan-pelanggan
```

## Authentication
Semua endpoint memerlukan JWT token dalam header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. GET /api/laporan-pelanggan/:kode_pelanggan
Mendapatkan laporan pelanggan berdasarkan kode pelanggan dengan pagination dan filtering.

#### Path Parameters:
- `kode_pelanggan` (string, required) - Kode pelanggan yang diminta

#### Query Parameters:
- `page` (integer, default: 1) - Halaman yang diminta
- `limit` (integer, default: 10) - Jumlah record per halaman
- `start_date` (date, optional) - Filter tanggal mulai (YYYY-MM-DD)
- `end_date` (date, optional) - Filter tanggal akhir (YYYY-MM-DD)
- `sort_by` (string, default: 'created_at') - Kolom untuk sorting
- `sort_order` (string, default: 'DESC') - Urutan sorting (ASC/DESC)

#### Contoh Request:
```http
GET /api/laporan-pelanggan/CUST001?page=1&limit=5&start_date=2024-10-01&end_date=2024-10-31
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Laporan pelanggan berhasil diambil",
  "kode_pelanggan": "CUST001",
  "nama_pelanggan": "John Doe",
  "data": [
    {
      "id": 1,
      "tanggal": "2024-10-12",
      "kode_pelanggan": "CUST001",
      "keterangan": "Kembali",
      "tabung": 3,
      "harga": "150000.00",
      "tambahan_deposit": "0.00",
      "pengurangan_deposit": "0.00",
      "sisa_deposit": "500000.00",
      "konfirmasi": 0,
      "id_bast_invoice": "TRX123456",
      "created_at": "2024-10-12T10:30:00.000Z",
      "updated_at": null,
      "list_tabung": ["TB001", "TB002", "TB003"],
      "total_tabung_in_list": 3
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 5,
    "total_records": 15,
    "total_pages": 3,
    "has_next_page": true,
    "has_prev_page": false
  },
  "filters": {
    "start_date": "2024-10-01",
    "end_date": "2024-10-31",
    "sort_by": "created_at",
    "sort_order": "DESC"
  }
}
```

### 2. GET /api/laporan-pelanggan/detail/:id
Mendapatkan detail laporan berdasarkan ID dengan informasi pelanggan.

#### Path Parameters:
- `id` (integer, required) - ID laporan yang diminta

#### Contoh Request:
```http
GET /api/laporan-pelanggan/detail/1
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Detail laporan berhasil diambil",
  "data": {
    "id": 1,
    "tanggal": "2024-10-12",
    "kode_pelanggan": "CUST001",
    "keterangan": "Kembali",
    "tabung": 3,
    "harga": "150000.00",
    "tambahan_deposit": "0.00",
    "pengurangan_deposit": "0.00",
    "sisa_deposit": "500000.00",
    "konfirmasi": 0,
    "id_bast_invoice": "TRX123456",
    "created_at": "2024-10-12T10:30:00.000Z",
    "updated_at": null,
    "nama_pelanggan": "John Doe",
    "alamat": "Jl. Contoh No. 123",
    "no_telepon": "081234567890",
    "list_tabung": ["TB001", "TB002", "TB003"],
    "total_tabung_in_list": 3
  }
}
```

### 3. GET /api/laporan-pelanggan/statistik/:kode_pelanggan
Mendapatkan statistik laporan pelanggan dalam periode tertentu.

#### Path Parameters:
- `kode_pelanggan` (string, required) - Kode pelanggan yang diminta

#### Query Parameters:
- `periode` (integer, default: 30) - Periode dalam hari untuk statistik

#### Contoh Request:
```http
GET /api/laporan-pelanggan/statistik/CUST001?periode=30
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Statistik laporan pelanggan berhasil diambil",
  "kode_pelanggan": "CUST001",
  "nama_pelanggan": "John Doe",
  "periode": "30 hari terakhir",
  "statistik": {
    "total": {
      "total_laporan": 15,
      "total_tabung": "45",
      "total_harga": "2250000.00",
      "total_tambahan": "100000.00",
      "total_pengurangan": "50000.00",
      "sisa_deposit_terakhir": "500000.00"
    },
    "per_keterangan": [
      {
        "keterangan": "Kembali",
        "jumlah": 10,
        "total_tabung": "30",
        "total_harga": "1500000.00"
      },
      {
        "keterangan": "Beli",
        "jumlah": 5,
        "total_tabung": "15",
        "total_harga": "750000.00"
      }
    ],
    "trend_harian": [
      {
        "tanggal": "2024-10-12",
        "jumlah_laporan": 2,
        "total_tabung": "6",
        "total_harga": "300000.00"
      },
      {
        "tanggal": "2024-10-11",
        "jumlah_laporan": 1,
        "total_tabung": "3",
        "total_harga": "150000.00"
      }
    ]
  }
}
```

### 4. GET /api/laporan-pelanggan/semua/all
Mendapatkan semua laporan pelanggan (untuk admin) dengan pagination dan search.

#### Query Parameters:
- `page` (integer, default: 1) - Halaman yang diminta
- `limit` (integer, default: 10) - Jumlah record per halaman
- `search` (string, optional) - Pencarian berdasarkan kode pelanggan, nama, atau keterangan
- `start_date` (date, optional) - Filter tanggal mulai (YYYY-MM-DD)
- `end_date` (date, optional) - Filter tanggal akhir (YYYY-MM-DD)
- `sort_by` (string, default: 'created_at') - Kolom untuk sorting
- `sort_order` (string, default: 'DESC') - Urutan sorting (ASC/DESC)

#### Contoh Request:
```http
GET /api/laporan-pelanggan/semua/all?page=1&limit=10&search=John&start_date=2024-10-01
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Semua laporan pelanggan berhasil diambil",
  "data": [
    {
      "id": 1,
      "tanggal": "2024-10-12",
      "kode_pelanggan": "CUST001",
      "keterangan": "Kembali",
      "tabung": 3,
      "harga": "150000.00",
      "tambahan_deposit": "0.00",
      "pengurangan_deposit": "0.00",
      "sisa_deposit": "500000.00",
      "konfirmasi": 0,
      "id_bast_invoice": "TRX123456",
      "created_at": "2024-10-12T10:30:00.000Z",
      "nama_pelanggan": "John Doe",
      "list_tabung": ["TB001", "TB002", "TB003"],
      "total_tabung_in_list": 3
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total_records": 25,
    "total_pages": 3,
    "has_next_page": true,
    "has_prev_page": false
  },
  "filters": {
    "search": "John",
    "start_date": "2024-10-01",
    "end_date": null,
    "sort_by": "lp.created_at",
    "sort_order": "DESC"
  }
}
```

## Struktur Database

### Tabel laporan_pelanggan:
```sql
CREATE TABLE laporan_pelanggan (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  tanggal date NOT NULL,
  kode_pelanggan varchar(255) NOT NULL,
  keterangan text,
  tabung int DEFAULT NULL,
  harga decimal(20,2) DEFAULT NULL,
  tambahan_deposit decimal(20,2) DEFAULT NULL,
  pengurangan_deposit decimal(20,2) DEFAULT NULL,
  sisa_deposit decimal(20,2) DEFAULT NULL,
  konfirmasi tinyint DEFAULT NULL,
  list_tabung json DEFAULT NULL,
  id_bast_invoice varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT NULL,
  updated_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id)
);
```

### Format JSON kolom list_tabung:
```json
["TB001", "TB002", "TB003"]
```

## Error Handling

### Response Error Format:
```json
{
  "message": "Error message",
  "error": "Detailed error information"
}
```

### Common HTTP Status Codes:
- `200` - OK (Success)
- `400` - Bad Request (Invalid parameters)
- `401` - Unauthorized (Invalid/missing token)
- `404` - Not Found (Data not found)
- `500` - Internal Server Error

## Fitur Utama

### 1. **Pagination**
- Mendukung pagination dengan `page` dan `limit`
- Menyediakan informasi lengkap tentang total pages, next/prev page

### 2. **Date Range Filtering**
- Filter berdasarkan tanggal laporan
- Format tanggal: YYYY-MM-DD
- Mendukung filter start_date dan end_date terpisah

### 3. **Flexible Sorting**
- Sort berdasarkan berbagai kolom (id, tanggal, tabung, harga, sisa_deposit, created_at)
- Mendukung ascending dan descending order

### 4. **Comprehensive Statistics**
- Total laporan dan nilai dalam periode
- Breakdown per keterangan laporan
- Trend harian untuk analisis
- Informasi deposit terakhir

### 5. **JSON Data Processing**
- Otomatis parse kolom `list_tabung` dari JSON
- Menghitung total tabung dari list
- Error handling untuk data JSON yang corrupt

### 6. **Customer Information**
- JOIN dengan tabel pelanggans untuk informasi lengkap
- Nama pelanggan, alamat, dan nomor telepon
- Search berdasarkan nama pelanggan

## Penggunaan Praktis

### Skenario 1: Monitoring Laporan Pelanggan Tertentu
```http
GET /api/laporan-pelanggan/CUST001?page=1&limit=20&sort_by=created_at&sort_order=DESC
```

### Skenario 2: Laporan Bulanan Pelanggan
```http
GET /api/laporan-pelanggan/CUST001?start_date=2024-10-01&end_date=2024-10-31
```

### Skenario 3: Statistik Performa Pelanggan
```http
GET /api/laporan-pelanggan/statistik/CUST001?periode=90
```

### Skenario 4: Search All Customer Reports
```http
GET /api/laporan-pelanggan/semua/all?search=John&limit=50
```

### Skenario 5: Detail Report Analysis
```http
GET /api/laporan-pelanggan/detail/123
```

## Keamanan & Validasi

### 1. **Authentication Required**
- Semua endpoint memerlukan JWT token valid
- Role-based access dapat ditambahkan sesuai kebutuhan

### 2. **Input Validation**
- Validasi kode_pelanggan tidak boleh kosong
- Validasi ID harus berupa angka
- Validasi format tanggal

### 3. **SQL Injection Prevention**
- Menggunakan prepared statements
- Parameter binding untuk semua query

### 4. **Error Handling**
- Comprehensive error handling untuk database errors
- JSON parsing error handling
- Graceful degradation untuk missing data

API ini menyediakan solusi lengkap untuk manajemen dan monitoring laporan pelanggan dengan performa yang optimal dan fleksibilitas yang tinggi.