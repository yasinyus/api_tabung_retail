# API Detail Aktivitas Tabung - Dokumentasi Lengkap

## Overview
API ini menyediakan fungsionalitas untuk menampilkan detail aktivitas tabung berdasarkan ID, daftar aktivitas dengan pagination, dan statistik aktivitas tabung.

## Base URL
```
http://localhost:3000/api/aktivitas-tabung
```

## Authentication
Semua endpoint memerlukan JWT token dalam header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. GET /api/aktivitas-tabung/:id
Mendapatkan detail lengkap aktivitas tabung berdasarkan ID dengan informasi relasi.

#### Path Parameters:
- `id` (integer, required) - ID aktivitas tabung yang diminta

#### Contoh Request:
```http
GET /api/aktivitas-tabung/48
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Detail aktivitas tabung berhasil diambil",
  "data": {
    "id": 48,
    "dari": "PA0001",
    "tujuan": "GD001",
    "tabung": ["TB0001", "TB0002"],
    "keterangan": "Terima tabung rusak dari agen",
    "nama_petugas": "John Doe",
    "id_user": 1,
    "total_tabung": 2,
    "tanggal": "2025-10-09",
    "waktu": "2025-10-09T10:30:00.000Z",
    "nama_aktivitas": "Terima Tabung Dari Agen",
    "status": "Rusak",
    "created_at": "2025-10-09T10:30:00.000Z",
    "updated_at": null,
    "total_tabung_actual": 2,
    "tabung_details": [
      {
        "kode_tabung": "TB0001",
        "tabung_info": {
          "kode_tabung": "TB0001",
          "seri_tabung": "SERIES-001",
          "tahun": 2025,
          "siklus": 5,
          "tabung_keterangan": "Tabung gas 12kg",
          "current_status": "Rusak",
          "current_lokasi": "GD001",
          "current_volume": "0.00",
          "tanggal_update": "2025-10-09T10:30:00.000Z"
        }
      },
      {
        "kode_tabung": "TB0002",
        "tabung_info": {
          "kode_tabung": "TB0002",
          "seri_tabung": "SERIES-002",
          "tahun": 2025,
          "siklus": 3,
          "tabung_keterangan": "Tabung gas 12kg",
          "current_status": "Rusak",
          "current_lokasi": "GD001",
          "current_volume": "0.00",
          "tanggal_update": "2025-10-09T10:30:00.000Z"
        }
      }
    ],
    "dari_info": {
      "type": "pelanggan",
      "kode_pelanggan": "PA0001",
      "nama_pelanggan": "Agen Pertamina 001",
      "alamat": "Jl. Sudirman No. 123"
    },
    "tujuan_info": {
      "type": "gudang",
      "kode_gudang": "GD001",
      "nama_gudang": "Gudang Utama",
      "alamat": "Jl. Industrial No. 456"
    },
    "user_info": {
      "id": 1,
      "username": "admin",
      "name": "John Doe",
      "role": "kepala_gudang"
    },
    "serah_terima_info": {
      "id": 25,
      "bast_id": "N25145T4",
      "kode_pelanggan": "PA0001",
      "tabung": ["TB0001", "TB0002"],
      "total_harga": null,
      "status": "Rusak",
      "created_at": "2025-10-09T10:30:00.000Z",
      "updated_at": "2025-10-09T10:30:00.000Z"
    }
  }
}
```

### 2. GET /api/aktivitas-tabung/list/all
Mendapatkan daftar aktivitas tabung dengan pagination dan filtering.

#### Query Parameters:
- `page` (integer, default: 1) - Halaman yang diminta
- `limit` (integer, default: 10) - Jumlah record per halaman
- `search` (string, optional) - Pencarian berdasarkan dari, tujuan, keterangan, atau nama petugas
- `status` (string, optional) - Filter berdasarkan status (Kosong/Isi/Rusak)
- `nama_aktivitas` (string, optional) - Filter berdasarkan nama aktivitas
- `tanggal_dari` (date, optional) - Filter tanggal mulai (YYYY-MM-DD)
- `tanggal_sampai` (date, optional) - Filter tanggal akhir (YYYY-MM-DD)
- `sort_by` (string, default: 'waktu') - Kolom untuk sorting
- `sort_order` (string, default: 'DESC') - Urutan sorting (ASC/DESC)

#### Contoh Request:
```http
GET /api/aktivitas-tabung/list/all?page=1&limit=5&status=Rusak&nama_aktivitas=Terima&sort_order=DESC
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Daftar aktivitas tabung berhasil diambil",
  "data": [
    {
      "id": 48,
      "dari": "PA0001",
      "tujuan": "GD001",
      "tabung": ["TB0001", "TB0002"],
      "keterangan": "Terima tabung rusak dari agen",
      "nama_petugas": "John Doe",
      "id_user": 1,
      "total_tabung": 2,
      "tanggal": "2025-10-09",
      "waktu": "2025-10-09T10:30:00.000Z",
      "nama_aktivitas": "Terima Tabung Dari Agen",
      "status": "Rusak",
      "created_at": "2025-10-09T10:30:00.000Z",
      "total_tabung_actual": 2
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 5,
    "total_records": 25,
    "total_pages": 5,
    "has_next_page": true,
    "has_prev_page": false
  },
  "filters": {
    "search": null,
    "status": "Rusak",
    "nama_aktivitas": "Terima",
    "tanggal_dari": null,
    "tanggal_sampai": null,
    "sort_by": "waktu",
    "sort_order": "DESC"
  }
}
```

### 3. GET /api/aktivitas-tabung/statistik/summary
Mendapatkan statistik aktivitas tabung dalam periode tertentu.

#### Query Parameters:
- `periode` (integer, default: 30) - Periode dalam hari untuk statistik

#### Contoh Request:
```http
GET /api/aktivitas-tabung/statistik/summary?periode=30
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Statistik aktivitas tabung berhasil diambil",
  "periode": "30 hari terakhir",
  "statistik": {
    "total": {
      "total_aktivitas": 125,
      "total_tabung_processed": 450
    },
    "per_status": [
      {
        "status": "Isi",
        "jumlah": 80,
        "total_tabung": 300
      },
      {
        "status": "Kosong",
        "jumlah": 30,
        "total_tabung": 120
      },
      {
        "status": "Rusak",
        "jumlah": 15,
        "total_tabung": 30
      }
    ],
    "per_aktivitas": [
      {
        "nama_aktivitas": "Terima Tabung Dari Pelanggan",
        "jumlah": 45,
        "total_tabung": 180
      },
      {
        "nama_aktivitas": "Kirim Tabung Ke Agen",
        "jumlah": 35,
        "total_tabung": 140
      },
      {
        "nama_aktivitas": "Terima Tabung Dari Agen",
        "jumlah": 25,
        "total_tabung": 100
      }
    ],
    "petugas_aktif": [
      {
        "nama_petugas": "John Doe",
        "jumlah_aktivitas": 45,
        "total_tabung": 180
      },
      {
        "nama_petugas": "Jane Smith",
        "jumlah_aktivitas": 35,
        "total_tabung": 140
      }
    ],
    "trend_harian": [
      {
        "tanggal": "2025-10-09",
        "jumlah_aktivitas": 8,
        "total_tabung": 32
      },
      {
        "tanggal": "2025-10-08",
        "jumlah_aktivitas": 12,
        "total_tabung": 48
      }
    ]
  }
}
```

## Fitur Utama

### 1. **Detail Lengkap dengan Relasi**
- Informasi lengkap aktivitas tabung
- Detail setiap tabung dari tabel `tabungs` dan `stok_tabung`
- Informasi pelanggan/gudang dari dan tujuan
- Data user yang melakukan aktivitas
- Informasi serah terima tabung jika ada

### 2. **Advanced Filtering & Pagination**
- Filter berdasarkan status, nama aktivitas, tanggal
- Pencarian teks di multiple kolom
- Pagination dengan informasi lengkap
- Flexible sorting

### 3. **Comprehensive Statistics**
- Total aktivitas dan tabung yang diproses
- Breakdown per status dan jenis aktivitas
- Petugas paling aktif
- Trend harian aktivitas

### 4. **Data Integrity**
- Validasi ID yang valid
- Error handling yang komprehensif
- JSON parsing yang aman
- Relasi data yang akurat

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
- `400` - Bad Request (Invalid ID)
- `401` - Unauthorized (Invalid/missing token)
- `404` - Not Found (Aktivitas not found)
- `500` - Internal Server Error

## Struktur Database

### Tabel aktivitas_tabung:
```sql
CREATE TABLE aktivitas_tabung (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  dari varchar(255) NOT NULL,
  tujuan varchar(255) NOT NULL,
  tabung json NOT NULL,
  keterangan text,
  nama_petugas varchar(255),
  id_user bigint unsigned,
  total_tabung int,
  tanggal varchar(255),
  waktu timestamp,
  nama_aktivitas varchar(255),
  status enum('Kosong','Isi','Rusak'),
  created_at timestamp NULL DEFAULT NULL,
  updated_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id)
);
```

## Penggunaan Praktis

### Skenario 1: Monitoring Detail Aktivitas
```http
GET /api/aktivitas-tabung/48
```

### Skenario 2: Laporan Aktivitas Harian
```http
GET /api/aktivitas-tabung/list/all?tanggal_dari=2025-10-09&tanggal_sampai=2025-10-09
```

### Skenario 3: Tracking Tabung Rusak
```http
GET /api/aktivitas-tabung/list/all?status=Rusak&limit=50
```

### Skenario 4: Dashboard Statistics
```http
GET /api/aktivitas-tabung/statistik/summary?periode=7
```

### Skenario 5: Audit Trail Petugas
```http
GET /api/aktivitas-tabung/list/all?search=John%20Doe&sort_by=waktu
```

API ini menyediakan solusi lengkap untuk monitoring dan analisis aktivitas tabung dengan performa optimal dan informasi relasi yang komprehensif.