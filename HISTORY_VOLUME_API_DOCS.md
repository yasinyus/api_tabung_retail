# API History Volume Pengisian - Dokumentasi Lengkap

## Overview
API ini menyediakan fungsionalitas untuk melihat history pengisian volume tabung pada tabel `volume_tabungs` dengan berbagai fitur seperti pagination, filtering, statistics, dan export data.

## Base URL
```
http://localhost:3000/api/history-volume
```

## Authentication
Semua endpoint memerlukan JWT token dalam header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. GET /api/history-volume/all
Mendapatkan daftar history pengisian volume dengan pagination dan filtering.

#### Query Parameters:
- `page` (integer, default: 1) - Halaman yang diminta
- `limit` (integer, default: 10) - Jumlah record per halaman
- `search` (string, optional) - Pencarian berdasarkan nama atau keterangan
- `lokasi` (string, optional) - Filter berdasarkan lokasi
- `status` (string, optional) - Filter berdasarkan status (isi/kosong)
- `tanggal_dari` (date, optional) - Filter tanggal mulai (YYYY-MM-DD)
- `tanggal_sampai` (date, optional) - Filter tanggal akhir (YYYY-MM-DD)
- `sort_by` (string, default: 'created_at') - Kolom untuk sorting
- `sort_order` (string, default: 'DESC') - Urutan sorting (ASC/DESC)

#### Contoh Request:
```http
GET /api/history-volume/all?page=1&limit=5&status=isi&sort_by=created_at&sort_order=DESC
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "History pengisian volume berhasil diambil",
  "data": [
    {
      "id": 25,
      "tanggal": "2025-10-07T00:00:00.000Z",
      "lokasi": "GD002",
      "nama": "Nama Operator",
      "volume_total": "100.00",
      "status": "isi",
      "keterangan": "Pengisian rutin",
      "created_at": "2025-10-07T06:05:55.000Z",
      "tabung": [
        {
          "kode_tabung": "TB0001",
          "volume": 25
        },
        {
          "kode_tabung": "TB0002", 
          "volume": 25
        }
      ],
      "total_tabung": 4
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 5,
    "total_records": 11,
    "total_pages": 3,
    "has_next_page": true,
    "has_prev_page": false
  },
  "filters": {
    "search": null,
    "lokasi": null,
    "status": "isi",
    "tanggal_dari": null,
    "tanggal_sampai": null,
    "sort_by": "created_at",
    "sort_order": "DESC"
  }
}
```

### 2. GET /api/history-volume/detail/:id
Mendapatkan detail lengkap history pengisian berdasarkan ID dengan informasi tabung.

#### Path Parameters:
- `id` (integer, required) - ID record yang diminta

#### Contoh Request:
```http
GET /api/history-volume/detail/25
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Detail history pengisian berhasil diambil",
  "data": {
    "id": 25,
    "tanggal": "2025-10-07T00:00:00.000Z",
    "lokasi": "GD002",
    "nama": "Nama Operator",
    "volume_total": "100.00",
    "status": "isi",
    "keterangan": "Pengisian rutin",
    "created_at": "2025-10-07T06:05:55.000Z",
    "tabung": [
      {
        "kode_tabung": "TB0001",
        "volume": 25
      },
      {
        "kode_tabung": "TB0002",
        "volume": 25
      }
    ],
    "total_tabung": 4,
    "tabung_details": [
      {
        "kode_tabung": "TB0001",
        "volume_saat_pengisian": 25,
        "tabung_info": {
          "kode_tabung": "TB0001",
          "seri_tabung": "SERIES-001",
          "tahun": 2025,
          "siklus": 5,
          "current_status": "Isi",
          "current_lokasi": "GD002",
          "current_volume": "25.00",
          "tanggal_update": "2025-10-07T06:05:55.000Z"
        }
      }
    ]
  }
}
```

### 3. GET /api/history-volume/statistik
Mendapatkan statistik pengisian volume dalam periode tertentu.

#### Query Parameters:
- `periode` (integer, default: 30) - Periode dalam hari untuk statistik

#### Contoh Request:
```http
GET /api/history-volume/statistik?periode=30
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Statistik pengisian volume berhasil diambil",
  "periode": "30 hari terakhir",
  "statistik": {
    "total": {
      "total_pengisian": 11,
      "total_volume": "4500.00",
      "rata_rata_volume": "409.090909"
    },
    "per_status": [
      {
        "status": "isi",
        "jumlah": 10,
        "total_volume": "4000.00"
      },
      {
        "status": "kosong",
        "jumlah": 1,
        "total_volume": "500.00"
      }
    ],
    "per_lokasi": [
      {
        "lokasi": "GD002",
        "jumlah": 8,
        "total_volume": "3200.00"
      },
      {
        "lokasi": "GD001",
        "jumlah": 3,
        "total_volume": "1300.00"
      }
    ],
    "trend_harian": [
      {
        "tanggal": "2025-10-07",
        "jumlah_pengisian": 2,
        "total_volume": "200.00"
      }
    ],
    "petugas_aktif": [
      {
        "nama": "Nama Operator",
        "jumlah_pengisian": 8,
        "total_volume": "3200.00"
      }
    ]
  }
}
```

### 4. GET /api/history-volume/export
Export data history pengisian dalam format JSON atau CSV.

#### Query Parameters:
- `format` (string, default: 'json') - Format export (json/csv)
- `tanggal_dari` (date, optional) - Filter tanggal mulai
- `tanggal_sampai` (date, optional) - Filter tanggal akhir  
- `lokasi` (string, optional) - Filter lokasi
- `status` (string, optional) - Filter status

#### Contoh Request JSON:
```http
GET /api/history-volume/export?format=json&status=isi
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Request CSV:
```http
GET /api/history-volume/export?format=csv&tanggal_dari=2025-10-01&tanggal_sampai=2025-10-07
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response JSON:
```json
{
  "message": "Data export berhasil diambil",
  "total_records": 10,
  "filters": {
    "tanggal_dari": null,
    "tanggal_sampai": null,
    "lokasi": null,
    "status": "isi"
  },
  "data": [
    {
      "id": 25,
      "tanggal": "2025-10-07T00:00:00.000Z",
      "lokasi": "GD002",
      "nama": "Nama Operator",
      "volume_total": "100.00",
      "status": "isi",
      "keterangan": "Pengisian rutin",
      "created_at": "2025-10-07T06:05:55.000Z",
      "total_tabung": 4,
      "kode_tabung_list": "TB0001, TB0002, TB0003, TB0004",
      "tabung_detail": "[{\"kode_tabung\":\"TB0001\",\"volume\":25}]"
    }
  ]
}
```

#### Response CSV:
```csv
ID,Tanggal,Lokasi,Nama Petugas,Volume Total,Status,Total Tabung,Kode Tabung,Keterangan,Created At
25,"2025-10-07","GD002","Nama Operator",100.00,"isi",4,"TB0001, TB0002, TB0003, TB0004","Pengisian rutin","2025-10-07T06:05:55.000Z"
```

## Struktur Database

### Tabel volume_tabungs:
```sql
CREATE TABLE volume_tabungs (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  tanggal date NOT NULL,
  lokasi varchar(255) NOT NULL,
  tabung json NOT NULL,
  volume_total decimal(10,2) DEFAULT NULL,
  nama varchar(255) DEFAULT NULL,
  status varchar(50) DEFAULT NULL,
  keterangan text,
  created_at timestamp NULL DEFAULT NULL,
  updated_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id)
);
```

### Format JSON kolom tabung:
```json
[
  {
    "kode_tabung": "TB0001",
    "volume": 25.5
  },
  {
    "kode_tabung": "TB0002", 
    "volume": 25.5
  }
]
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

### 2. **Advanced Filtering** 
- Filter berdasarkan lokasi, status, tanggal, dan nama
- Pencarian teks dalam nama petugas dan keterangan
- Kombinasi multiple filters

### 3. **Flexible Sorting**
- Sort berdasarkan berbagai kolom (id, tanggal, lokasi, nama, volume_total, status, created_at)
- Mendukung ascending dan descending order

### 4. **Comprehensive Statistics**
- Total pengisian dan volume
- Breakdown per status dan lokasi
- Trend harian dan petugas paling aktif
- Periode dapat disesuaikan

### 5. **Data Export**
- Export dalam format JSON dan CSV
- Filter data yang akan diexport
- Ready untuk integrasi dengan Excel/spreadsheet

### 6. **Detail Information**
- Detail lengkap setiap pengisian
- Informasi current status tabung dari tabel stok_tabung
- Relasi dengan tabel tabungs untuk informasi seri dan siklus

## Penggunaan Praktis

### Skenario 1: Monitoring Harian Operator
```http
GET /api/history-volume/all?tanggal_dari=2025-10-07&tanggal_sampai=2025-10-07&sort_by=created_at&sort_order=DESC
```

### Skenario 2: Laporan Bulanan Lokasi Tertentu
```http
GET /api/history-volume/all?lokasi=GD002&tanggal_dari=2025-10-01&tanggal_sampai=2025-10-31&limit=50
```

### Skenario 3: Export Data untuk Analisis
```http
GET /api/history-volume/export?format=csv&tanggal_dari=2025-10-01&tanggal_sampai=2025-10-07
```

### Skenario 4: Dashboard Statistics
```http
GET /api/history-volume/statistik?periode=7
```

API ini menyediakan solusi lengkap untuk manajemen dan monitoring history pengisian volume tabung dengan performa yang optimal dan fleksibilitas yang tinggi.