# API DETAIL TRANSAKSI - DENGAN HARGA PELANGGAN

## ✅ IMPLEMENTASI BERHASIL (WITH JOIN)

### File: `src/routes/detail_transaksi.js`
🔗 **Routes**: `/api/detail-transaksi` dan `/api/list-detail-transaksi`

---

## 📊 ENDPOINT 1: GET DETAIL TRANSAKSI

### URL
```
GET /api/detail-transaksi/:trx_id
```

### Authentication
- **Required**: JWT Token (kepala_gudang atau driver)
- **Header**: `Authorization: Bearer <token>`

### Parameters
- **trx_id** (path parameter): ID transaksi yang ingin dilihat

### Response Success (200)
```json
{
  "message": "Detail transaksi berhasil ditemukan",
  "data": {
    "id": 1,
    "trx_id": "TRX-ABC123",
    "tabung": "[{\"kode_tabung\":\"TB001\",\"volume\":15.0},{\"kode_tabung\":\"TB002\",\"volume\":15.5}]",
    "tabung_parsed": [
      {
        "kode_tabung": "TB001",
        "volume": 15.0
      },
      {
        "kode_tabung": "TB002", 
        "volume": 15.5
      }
    ],
    "tabung_count": 2,
    "harga_per_tabung": 5000.00,
    "total_harga": 152500.00,
    "customer_info": {
      "customer_id": 45,
      "kode_pelanggan": "PL001",
      "nama_pelanggan": "PT ABC Corporation",
      "harga_tabung": 5000.00
    },
    "created_at": "2025-10-06T10:30:00.000Z",
    "updated_at": "2025-10-06T10:30:00.000Z"
  }
}
```

### Response Error (404)
```json
{
  "message": "Detail transaksi tidak ditemukan",
  "trx_id": "TRX-NOTFOUND"
}
```

---

## 📋 ENDPOINT 2: GET LIST DETAIL TRANSAKSI

### URL
```
GET /api/list-detail-transaksi
```

### Authentication
- **Required**: JWT Token (kepala_gudang atau driver)
- **Header**: `Authorization: Bearer <token>`

### Query Parameters
- **page** (optional): Halaman (default: 1)
- **limit** (optional): Jumlah per halaman (default: 10)
- **trx_id** (optional): Filter berdasarkan trx_id (LIKE search)

### Example Request
```
GET /api/list-detail-transaksi?page=1&limit=5&trx_id=TRX-ABC
```

### Response Success (200)
```json
{
  "message": "List detail transaksi berhasil diambil",
  "data": [
    {
      "id": 1,
      "trx_id": "TRX-ABC123",
      "tabung": "[{\"kode_tabung\":\"TB001\",\"volume\":15.0},{\"kode_tabung\":\"TB002\",\"volume\":15.5}]",
      "tabung_parsed": [
        {
          "kode_tabung": "TB001",
          "volume": 15.0
        },
        {
          "kode_tabung": "TB002",
          "volume": 15.5
        }
      ],
      "tabung_count": 2,
      "harga_per_tabung": 5000.00,
      "total_harga": 152500.00,
      "customer_info": {
        "customer_id": 45,
        "kode_pelanggan": "PL001",
        "nama_pelanggan": "PT ABC Corporation",
        "harga_tabung": 5000.00
      },
      "created_at": "2025-10-06T10:30:00.000Z",
      "updated_at": "2025-10-06T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 5,
    "total_records": 15,
    "total_pages": 3
  }
}
```

---

## 🔍 FITUR UTAMA (WITH HARGA)

### 1. JOIN Query dengan 3 Tabel
- ✅ **detail_transaksi**: Data utama transaksi
- ✅ **transactions**: Penghubung melalui `trx_id` → `customer_id`
- ✅ **pelanggans**: Sumber `harga_tabung` melalui `id` = `customer_id`

### 2. Kolom Harga yang Ditampilkan
- ✅ **harga_per_tabung**: Harga per m³ dari kolom `harga_tabung` tabel pelanggans
- ✅ **total_harga**: Kalkulasi otomatis (volume × harga_per_tabung) untuk semua tabung
- ✅ **customer_info**: Info lengkap pelanggan termasuk harga

### 3. Kalkulasi Harga Otomatis
```javascript
// Logic kalkulasi:
totalHarga = tabungData.reduce((sum, tabung) => {
  const volume = parseFloat(tabung.volume || 0);
  return sum + (volume * hargaPerTabung);
}, 0);
```

### 4. Data Pelanggan Lengkap
- ✅ **customer_id**: ID pelanggan dari transactions
- ✅ **kode_pelanggan**: Kode unik pelanggan
- ✅ **nama_pelanggan**: Nama lengkap pelanggan
- ✅ **harga_tabung**: Harga per m³ untuk pelanggan tersebut

---

## 🧮 CONTOH KALKULASI HARGA

### Data Tabung:
```json
[
  {"kode_tabung": "TB001", "volume": 15.0},
  {"kode_tabung": "TB002", "volume": 15.5}
]
```

### Harga Pelanggan: Rp 5.000/m³

### Kalkulasi:
- TB001: 15.0 m³ × Rp 5.000 = Rp 75.000
- TB002: 15.5 m³ × Rp 5.000 = Rp 77.500
- **Total**: Rp 152.500

---

## 🔗 STRUKTUR JOIN

```sql
SELECT 
  dt.*,                    -- Dari detail_transaksi
  t.customer_id,           -- Dari transactions
  p.harga_tabung,          -- Dari pelanggans ⭐
  p.kode_pelanggan,        -- Dari pelanggans
  p.nama_pelanggan         -- Dari pelanggans
FROM detail_transaksi dt
LEFT JOIN transactions t ON dt.trx_id = t.trx_id
LEFT JOIN pelanggans p ON t.customer_id = p.id
WHERE dt.trx_id = ?
```

---

## 🧪 TESTING

### Test GET Detail Transaksi
```bash
curl -X GET "http://localhost:3000/api/detail-transaksi/TRX-ABC123" \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test GET List Detail Transaksi
```bash
curl -X GET "http://localhost:3000/api/list-detail-transaksi?page=1&limit=10" \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ✅ KEUNGGULAN UPDATE

1. **💰 Harga Pelanggan**: Menampilkan harga sesuai kontrak pelanggan
2. **🧮 Auto Calculation**: Total harga dihitung otomatis berdasarkan volume
3. **👤 Customer Info**: Info lengkap pelanggan dalam response
4. **📊 Accurate Pricing**: Harga akurat sesuai dengan tabel pelanggans
5. **🔗 Proper JOIN**: JOIN yang benar melalui transactions sebagai bridge
6. **📄 Pagination**: Tetap support pagination dengan JOIN

---

## ✅ STATUS IMPLEMENTATION

- ✅ **JOIN Added**: 3 tabel dijoin dengan benar
- ✅ **Harga Displayed**: `harga_tabung` dari pelanggans ditampilkan
- ✅ **Auto Calculation**: Total harga dihitung otomatis
- ✅ **Customer Info**: Data pelanggan lengkap
- ✅ **Server Running**: Tanpa error di port 3000
- ✅ **Ready for Use**: Production ready

**🚀 API dengan harga pelanggan siap digunakan!**