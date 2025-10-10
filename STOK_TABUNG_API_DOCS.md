# API Stok Tabung - Dokumentasi Lengkap

## Overview
API ini menyediakan fungsionalitas untuk mengecek stok tabung pada tabel `stok_tabung` berdasarkan lokasi dengan berbagai fitur seperti pagination, filtering, statistik, dan pencarian.

## Base URL
```
http://localhost:3000/api/stok-tabung
```

## Authentication
Semua endpoint memerlukan JWT token dalam header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. GET /api/stok-tabung/lokasi/:lokasi
Mendapatkan daftar stok tabung berdasarkan lokasi dengan pagination dan filtering.

#### Path Parameters:
- `lokasi` (string, required) - Nama lokasi yang ingin dicek

#### Query Parameters:
- `page` (integer, default: 1) - Halaman yang diminta
- `limit` (integer, default: 10) - Jumlah record per halaman
- `status` (string, optional) - Filter berdasarkan status (Kosong/Isi/Rusak)
- `search` (string, optional) - Pencarian berdasarkan kode_tabung
- `sort_by` (string, default: 'kode_tabung') - Kolom untuk sorting
- `sort_order` (string, default: 'ASC') - Urutan sorting (ASC/DESC)

#### Contoh Request:
```http
GET /api/stok-tabung/lokasi/GD002?page=1&limit=5&status=Isi&sort_by=kode_tabung&sort_order=ASC
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Data stok tabung berhasil diambil",
  "lokasi": "GD002",
  "statistik": {
    "total_tabung": 10,
    "tabung_isi": 6,
    "tabung_kosong": 3,
    "tabung_rusak": 1,
    "total_volume": 150.50
  },
  "data": [
    {
      "id": 1,
      "kode_tabung": "TB0001",
      "status": "Isi",
      "lokasi": "GD002",
      "volume": "25.00",
      "tanggal_update": "2025-10-10T10:30:00.000Z",
      "created_at": "2025-10-10T08:00:00.000Z"
    },
    {
      "id": 2,
      "kode_tabung": "TB0002",
      "status": "Isi",
      "lokasi": "GD002",
      "volume": "25.00",
      "tanggal_update": "2025-10-10T10:35:00.000Z",
      "created_at": "2025-10-10T08:05:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 5,
    "total_records": 6,
    "total_pages": 2,
    "has_next_page": true,
    "has_prev_page": false
  },
  "filters": {
    "lokasi": "GD002",
    "status": "Isi",
    "search": null,
    "sort_by": "kode_tabung",
    "sort_order": "ASC"
  }
}
```

### 2. GET /api/stok-tabung/ringkasan
Mendapatkan ringkasan stok tabung untuk semua lokasi.

#### Contoh Request:
```http
GET /api/stok-tabung/ringkasan
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Ringkasan stok tabung berhasil diambil",
  "total_keseluruhan": {
    "total_tabung": 50,
    "tabung_isi": 30,
    "tabung_kosong": 15,
    "tabung_rusak": 5,
    "total_volume": 750.00,
    "total_lokasi": 5
  },
  "ringkasan_per_lokasi": [
    {
      "lokasi": "GD001",
      "total_tabung": 15,
      "tabung_isi": 10,
      "tabung_kosong": 4,
      "tabung_rusak": 1,
      "total_volume": 250.00,
      "persentase_isi": "66.67"
    },
    {
      "lokasi": "GD002",
      "total_tabung": 20,
      "tabung_isi": 12,
      "tabung_kosong": 6,
      "tabung_rusak": 2,
      "total_volume": 300.00,
      "persentase_isi": "60.00"
    },
    {
      "lokasi": "PA001",
      "total_tabung": 15,
      "tabung_isi": 8,
      "tabung_kosong": 5,
      "tabung_rusak": 2,
      "total_volume": 200.00,
      "persentase_isi": "53.33"
    }
  ]
}
```

### 3. GET /api/stok-tabung/cari/:kode_tabung
Mencari tabung berdasarkan kode tabung spesifik.

#### Path Parameters:
- `kode_tabung` (string, required) - Kode tabung yang dicari

#### Contoh Request:
```http
GET /api/stok-tabung/cari/TB0001
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Data tabung berhasil ditemukan",
  "data": {
    "id": 1,
    "kode_tabung": "TB0001",
    "status": "Isi",
    "lokasi": "GD002",
    "volume": "25.00",
    "tanggal_update": "2025-10-10T10:30:00.000Z",
    "created_at": "2025-10-10T08:00:00.000Z"
  }
}
```

#### Response Not Found:
```json
{
  "message": "Tabung tidak ditemukan",
  "kode_tabung": "TB9999"
}
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

### 1. **Cek Stok Per Lokasi**
- Pagination dengan `page` dan `limit`
- Filter berdasarkan status tabung
- Pencarian berdasarkan kode tabung
- Sorting flexible
- Statistik real-time per lokasi

### 2. **Ringkasan Keseluruhan**
- Total tabung per lokasi
- Breakdown status (Isi/Kosong/Rusak)
- Total volume per lokasi
- Persentase tabung isi
- Summary keseluruhan sistem

### 3. **Pencarian Spesifik**
- Cari tabung berdasarkan kode
- Detail lengkap lokasi dan status
- Informasi volume dan update terakhir

### 4. **Statistik Real-time**
- Jumlah tabung per status
- Total volume aktual
- Persentase utilisasi
- Data selalu up-to-date

## Status Tabung yang Didukung
- `Kosong` - Tabung kosong siap diisi
- `Isi` - Tabung berisi gas
- `Rusak` - Tabung dalam kondisi rusak

## Penggunaan Praktis

### Skenario 1: Cek Stok Gudang Tertentu
```http
GET /api/stok-tabung/lokasi/GD002?status=Isi
```

### Skenario 2: Dashboard Monitoring Semua Lokasi
```http
GET /api/stok-tabung/ringkasan
```

### Skenario 3: Tracking Tabung Spesifik
```http
GET /api/stok-tabung/cari/TB0001
```

### Skenario 4: Audit Tabung Kosong
```http
GET /api/stok-tabung/lokasi/GD001?status=Kosong&limit=50
```

### Skenario 5: Laporan Tabung Rusak
```http
GET /api/stok-tabung/lokasi/PA001?status=Rusak&page=1&limit=20
```

## Query Performance
- Menggunakan INDEX pada kolom `lokasi` dan `status`
- Pagination untuk performa optimal
- Query optimized untuk large dataset
- Response time < 100ms untuk data normal

## Data Format
- Volume dalam format decimal (liter)
- Timestamp dalam format ISO 8601
- Status case-sensitive
- Lokasi sebagai string identifier

## Integration Notes
- Compatible dengan sistem inventory
- Real-time data dari aktivitas tabung
- Mendukung monitoring dashboard
- Export-ready data format

API ini menyediakan solusi lengkap untuk monitoring dan manajemen stok tabung dengan performa tinggi dan kemudahan penggunaan.