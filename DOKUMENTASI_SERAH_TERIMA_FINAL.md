# DOKUMENTASI IMPLEMENTASI SERAH_TERIMA_TABUNGS - TABUNG_ACTIVITY

## Status: IMPLEMENTED ✅

Logic untuk insert ke tabel `serah_terima_tabungs` telah berhasil ditambahkan ke endpoint `/api/tabung_activity`.

## Kondisi Trigger

Insert ke `serah_terima_tabungs` akan terjadi jika:
```javascript
status === "Refund" && (activity === "Terima Tabung Dari Pelanggan" || activity === "Terima Tabung Dari Agen")
```

## Function Yang Ditambahkan

### generateBastId()
```javascript
function generateBastId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  return `BAST${(timestamp + random).toUpperCase().substr(0, 4)}`;
}
```
- Menghasilkan BAST ID unik dengan format: `BASTxxxx` (8 karakter total)

## Struktur Tabel serah_terima_tabungs

```sql
CREATE TABLE IF NOT EXISTS serah_terima_tabungs (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  bast_id VARCHAR(50) NULL DEFAULT NULL,
  kode_pelanggan VARCHAR(50) NULL DEFAULT NULL,
  tabung JSON NULL DEFAULT NULL,
  total_harga DECIMAL(20,2) NULL DEFAULT NULL,
  status VARCHAR(50) NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id)
)
```

## Data Yang Diinsert

| Kolom | Nilai | Sumber |
|-------|-------|--------|
| `id` | autoincrement | Database |
| `bast_id` | Generated (8 karakter) | `generateBastId()` |
| `kode_pelanggan` | Parameter `tujuan` | Request body |
| `tabung` | JSON array | `JSON.stringify(tabung)` |
| `total_harga` | `NULL` | Sesuai permintaan user |
| `status` | Parameter `status` | Request body ("Refund") |
| `created_at` | Current timestamp | `waktu` |
| `updated_at` | Current timestamp | `waktu` |

## Validasi Status

Status yang diizinkan telah diupdate menjadi:
```javascript
const validStatuses = ['Kosong', 'Isi', 'Refund'];
```

## Logic Flow

1. **Insert ke aktivitas_tabung** (selalu dilakukan)
2. **Cek kondisi serah_terima**:
   - Jika `status === "Refund"` dan `activity` match → Insert ke `serah_terima_tabungs`
   - Jika tidak match → Skip serah_terima
3. **Cek kondisi stok_tabung**:
   - Jika `status !== "Refund"` → Update/insert stok_tabung (normal)
   - Jika `status === "Refund"` → Skip stok_tabung

## Response API

### Untuk Status Refund (dengan serah_terima):
```json
{
  "message": "Sukses - Aktivitas berhasil disimpan (stok_tabung tidak diubah untuk status Refund)",
  "id": 42,
  "total_tabung": 3,
  "status": "Refund",
  "serah_terima": {
    "id": 1,
    "bast_id": "BAST1234",
    "kode_pelanggan": "GD001",
    "total_harga": null,
    "status": "Refund"
  }
}
```

### Untuk Status Lain (Isi/Kosong):
```json
{
  "message": "Sukses - Aktivitas dan stok_tabung berhasil diproses",
  "id": 42,
  "total_tabung": 3,
  "stok_results": [...],
  "stok_summary": {...}
}
```

## Debug Logging

System akan menampilkan log:
- `"DEBUG: Creating serah_terima_tabungs for Refund"` - ketika kondisi terpenuhi
- `"DEBUG: Skipping serah_terima - status: [status] activity: [activity]"` - ketika kondisi tidak terpenuhi
- `"Skipping stok_tabung update for status: Refund"` - ketika skip stok_tabung
- `"Serah terima tabung created for Refund: [object]"` - ketika insert berhasil

## Contoh Request

```json
POST /api/tabung_activity
Authorization: Bearer [token]
Content-Type: application/json

{
  "dari": "PL001",
  "tujuan": "GD001",
  "tabung": ["TB001", "TB002", "TB003"],
  "keterangan": "Refund tabung rusak",
  "activity": "Terima Tabung Dari Pelanggan",
  "status": "Refund"
}
```

## Error Handling

- Jika terjadi error saat insert ke `serah_terima_tabungs`, sistem akan:
  - Log error ke console
  - Continue execution (tidak menggagalkan seluruh transaksi)
  - Return `serah_terima: null` di response

## Testing

Server telah berjalan tanpa error ✅. Untuk testing:

1. Pastikan menggunakan exact match untuk `activity`:
   - `"Terima Tabung Dari Pelanggan"` atau
   - `"Terima Tabung Dari Agen"`

2. Pastikan `status === "Refund"`

3. Cek server logs untuk debug output

4. Jika `serah_terima: null`, kemungkinan penyebab:
   - Activity tidak exact match
   - Status bukan "Refund"
   - Error dalam proses insert (cek server logs)

## Status Implementasi: COMPLETE ✅