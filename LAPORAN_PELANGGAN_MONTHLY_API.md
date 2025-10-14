# API Laporan Pelanggan Bulanan - Dokumentasi

## Overview
Endpoint baru untuk menampilkan laporan pelanggan berdasarkan kode pelanggan per bulan dengan struktur mirip `/pelanggan/riwayat/4/2025/10`.

## Endpoint Baru

### GET `/api/laporan-pelanggan/:kode_pelanggan/:tahun/:bulan`

Mendapatkan laporan pelanggan berdasarkan kode pelanggan, tahun, dan bulan dengan pengelompokan per tanggal.

#### Path Parameters:
- `kode_pelanggan` (string, required) - Kode pelanggan (ex: PA001)
- `tahun` (integer, required) - Tahun (2020-2030)
- `bulan` (integer, required) - Bulan (1-12)

#### Authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Request:
```http
GET /api/laporan-pelanggan/PA001/2025/10
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Contoh Response:
```json
{
  "message": "Laporan pelanggan bulanan berhasil diambil",
  "kode_pelanggan": "PA001",
  "nama_pelanggan": "Jaya Sanjaya",
  "periode": "Oktober 2025",
  "tahun": 2025,
  "bulan": 10,
  "nama_bulan": "Oktober",
  "summary": {
    "total_laporan": 5,
    "total_tabung": 15,
    "total_harga": 16625000.00,
    "total_tambahan_deposit": 0.00,
    "total_pengurangan_deposit": 0.00,
    "sisa_deposit_terakhir": 500000.00,
    "total_hari_aktif": 3
  },
  "data": [
    {
      "tanggal": "2025-10-09",
      "total_laporan_hari": 3,
      "total_tabung_hari": 9,
      "total_harga_hari": 5625000,
      "laporan": [
        {
          "id": 24,
          "keterangan": "Tagihan",
          "tabung": 3,
          "harga": 1875000,
          "tambahan_deposit": 0.00,
          "pengurangan_deposit": 0.00,
          "sisa_deposit": 500000.00,
          "konfirmasi": 0,
          "list_tabung": ["TB001", "TB002", "TB003"],
          "total_tabung_in_list": 3,
          "id_bast_invoice": "TRX-MGILYATHF0XFH513S",
          "waktu": "10:30:00",
          "created_at": "2025-10-09T10:30:00.000Z"
        },
        {
          "id": 23,
          "keterangan": "Tagihan",
          "tabung": 3,
          "harga": 1875000,
          "tambahan_deposit": 0.00,
          "pengurangan_deposit": 0.00,
          "sisa_deposit": 500000.00,
          "konfirmasi": 0,
          "list_tabung": [],
          "total_tabung_in_list": 0,
          "id_bast_invoice": null,
          "waktu": "09:15:00",
          "created_at": "2025-10-09T09:15:00.000Z"
        }
      ]
    },
    {
      "tanggal": "2025-10-08", 
      "total_laporan_hari": 1,
      "total_tabung_hari": 3,
      "total_harga_hari": 10000000,
      "laporan": [
        {
          "id": 25,
          "keterangan": "Refund",
          "tabung": 3,
          "harga": 10000000,
          "tambahan_deposit": 0.00,
          "pengurangan_deposit": 0.00,
          "sisa_deposit": 500000.00,
          "konfirmasi": 1,
          "list_tabung": ["TB004", "TB005", "TB006"],
          "total_tabung_in_list": 3,
          "id_bast_invoice": "BASTMG7L",
          "waktu": "14:20:00",
          "created_at": "2025-10-08T14:20:00.000Z"
        }
      ]
    }
  ]
}
```

#### Response jika tidak ada data:
```json
{
  "message": "Tidak ada laporan pada bulan tersebut",
  "kode_pelanggan": "PA001",
  "nama_pelanggan": "Jaya Sanjaya",
  "periode": "Oktober 2025",
  "total_laporan": 0,
  "total_tabung": 0,
  "total_harga": 0,
  "data": []
}
```

## Struktur Data

### Pengelompokan per Tanggal
Data dikelompokkan berdasarkan tanggal dengan struktur:
- **tanggal**: Tanggal laporan (YYYY-MM-DD)
- **total_laporan_hari**: Jumlah laporan pada tanggal tersebut
- **total_tabung_hari**: Total tabung pada tanggal tersebut
- **total_harga_hari**: Total harga pada tanggal tersebut
- **laporan**: Array berisi detail laporan pada tanggal tersebut

### Detail Laporan
Setiap item laporan berisi:
- **id**: ID laporan
- **keterangan**: Jenis laporan (Tagihan, Refund, dll)
- **tabung**: Jumlah tabung
- **harga**: Nominal harga
- **tambahan_deposit**: Tambahan deposit
- **pengurangan_deposit**: Pengurangan deposit  
- **sisa_deposit**: Sisa deposit
- **konfirmasi**: Status konfirmasi (0/1)
- **list_tabung**: Array kode tabung dari JSON
- **total_tabung_in_list**: Jumlah tabung dalam list
- **id_bast_invoice**: ID BAST/Invoice
- **waktu**: Waktu transaksi (HH:MM:SS)
- **created_at**: Timestamp lengkap

### Summary Statistics
- **total_laporan**: Total semua laporan dalam bulan
- **total_tabung**: Total semua tabung
- **total_harga**: Total semua harga
- **total_tambahan_deposit**: Total tambahan deposit
- **total_pengurangan_deposit**: Total pengurangan deposit
- **sisa_deposit_terakhir**: Sisa deposit terbaru
- **total_hari_aktif**: Jumlah hari ada transaksi

## Error Handling

### Validasi Parameter:
- **400 Bad Request**: Parameter tidak lengkap
- **400 Bad Request**: Format tahun tidak valid (2020-2030)
- **400 Bad Request**: Format bulan tidak valid (1-12)
- **404 Not Found**: Pelanggan tidak ditemukan

### Error Response Format:
```json
{
  "message": "Error message",
  "error": "Detailed error information",
  "kode_pelanggan": "PA001",
  "periode": "Oktober 2025"
}
```

## Perbedaan dengan `/pelanggan/riwayat/:customer_id/:tahun/:bulan`

| Aspek | Laporan Pelanggan | Riwayat Pelanggan |
|-------|------------------|-------------------|
| **Source Table** | `laporan_pelanggan` | `transactions` + `detail_transaksi` |
| **Parameter** | `kode_pelanggan` (string) | `customer_id` (integer) |
| **Authentication** | `authUser` (general) | `authPelanggan` (khusus pelanggan) |
| **Data Fields** | Deposit, konfirmasi, BAST | TRX ID, payment method, notes |
| **JSON Field** | `list_tabung` | `detail_tabung` |
| **Summary** | Financial summary | Transaction summary |

## Kegunaan Praktis

### 1. Monitoring Bulanan
```http
GET /api/laporan-pelanggan/PA001/2025/10
```

### 2. Analisis Tahunan
```http
GET /api/laporan-pelanggan/PA001/2025/1   # Januari
GET /api/laporan-pelanggan/PA001/2025/12  # Desember
```

### 3. Perbandingan Bulan
```http
GET /api/laporan-pelanggan/PA001/2025/9   # September
GET /api/laporan-pelanggan/PA001/2025/10  # Oktober
```

## Test Results

✅ **Database Query**: Berhasil mengambil data dari `laporan_pelanggan`  
✅ **Date Grouping**: Data berhasil dikelompokkan per tanggal  
✅ **JSON Parsing**: `list_tabung` berhasil di-parse dari JSON  
✅ **Statistics**: Summary calculations working correctly  
✅ **Error Handling**: Validasi parameter dan pelanggan tidak ditemukan  
✅ **Response Format**: Struktur mirip dengan `/pelanggan/riwayat`  

**Test Data**: PA001 - 5 laporan di Oktober 2025, total 15 tabung, Rp 16.625.000

## Endpoint URL Examples

```
GET /api/laporan-pelanggan/PA001/2025/10    # Oktober 2025
GET /api/laporan-pelanggan/PU001/2025/9     # September 2025 
GET /api/laporan-pelanggan/PU002/2024/12    # Desember 2024
```

API ini menyediakan cara yang konsisten untuk mengakses laporan pelanggan per bulan dengan format yang familiar seperti endpoint riwayat yang sudah ada.