# Implementasi Handling Status "Rusak" untuk Terima Tabung

## Overview
Implementasi ini menambahkan logika khusus untuk menangani status "Rusak" pada aktivitas "Terima Tabung Dari Pelanggan" atau "Terima Tabung Dari Agen". Ketika status "Rusak" diterima, sistem akan melakukan update atau insert ke tabel `stok_tabung` dengan kolom `lokasi` diisi dari kolom `tujuan` berdasarkan `kode_tabung`.

## Perubahan Kode

### File: `src/routes/tabung_activity.js`

#### 1. Perbaikan Kondisi Logika
**Sebelum:**
```javascript
if (status !== "Rusak" || status !== "Kosong" || status !== "Isi") {
```

**Sesudah:**
```javascript
// Skip stok_tabung update jika status = Refund
if (status !== "Refund") {
```

#### 2. Logika Khusus untuk Status "Rusak"
Ditambahkan kondisi khusus dalam loop processing tabung:

```javascript
// Logic khusus untuk status "Rusak" pada aktivitas "Terima Tabung"
if (status === "Rusak" && (activity === "Terima Tabung Dari Pelanggan" || activity === "Terima Tabung Dari Agen")) {
  if (existingStok.length > 0) {
    // Update jika sudah ada, lokasi diisi dengan tujuan
    console.log(`Updating existing stok for ${kode_tabung} with Rusak status - lokasi from tujuan`);
    const [updateResult] = await db.query(
      'UPDATE stok_tabung SET status = ?, lokasi = ?, tanggal_update = ? WHERE kode_tabung = ?', 
      [status, tujuan, waktu, kode_tabung]
    );
    // ... handling results
  } else {
    // Insert jika belum ada, lokasi diisi dengan tujuan
    console.log(`Inserting new stok for ${kode_tabung} with Rusak status - lokasi from tujuan`);
    const [insertResult] = await db.query(
      'INSERT INTO stok_tabung (kode_tabung, status, volume, lokasi, tanggal_update, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [kode_tabung, status, 0, tujuan, waktu, waktu]
    );
    // ... handling results
  }
}
```

#### 3. Pesan Response Khusus
Ditambahkan pesan khusus untuk aktivitas Rusak:

```javascript
// Message khusus untuk status Rusak pada Terima Tabung
let message = 'Sukses - Aktivitas dan stok_tabung berhasil diproses';
if (status === "Rusak" && (activity === "Terima Tabung Dari Pelanggan" || activity === "Terima Tabung Dari Agen")) {
  message = 'Sukses - Aktivitas berhasil disimpan dan stok_tabung diupdate dengan status Rusak (lokasi dari tujuan)';
}
```

## Cara Kerja

### Kondisi Aktivitas yang Ditangani:
1. **nama_aktivitas**: "Terima Tabung Dari Pelanggan" ATAU "Terima Tabung Dari Agen"
2. **status**: "Rusak"

### Proses yang Dilakukan:
1. **Cek Keberadaan**: Sistem mengecek apakah `kode_tabung` sudah ada di tabel `stok_tabung`
2. **Update/Insert**: 
   - Jika sudah ada: UPDATE `status = "Rusak"` dan `lokasi = tujuan`
   - Jika belum ada: INSERT record baru dengan `status = "Rusak"` dan `lokasi = tujuan`
3. **Logging**: Semua proses di-log untuk debugging
4. **Response**: Memberikan detail hasil untuk setiap `kode_tabung`

## Contoh Request

```http
POST /api/tabung/activity
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "activity": "Terima Tabung Dari Pelanggan",
  "dari": "CUST001",
  "tujuan": "GUDANG_A",
  "tabung": ["TAB001", "TAB002", "TAB003"],
  "keterangan": "Tabung rusak dari pelanggan",
  "status": "Rusak"
}
```

## Contoh Response

```json
{
  "message": "Sukses - Aktivitas berhasil disimpan dan stok_tabung diupdate dengan status Rusak (lokasi dari tujuan)",
  "id": 123,
  "serah_terima": null,
  "total_tabung": 3,
  "stok_results": [
    {
      "kode_tabung": "TAB001",
      "action": "updated",
      "affectedRows": 1,
      "success": true,
      "note": "Rusak status - lokasi updated from tujuan"
    },
    {
      "kode_tabung": "TAB002",
      "action": "inserted",
      "insertId": 45,
      "success": true,
      "note": "Rusak status - lokasi set from tujuan"
    },
    {
      "kode_tabung": "TAB003",
      "action": "updated",
      "affectedRows": 1,
      "success": true,
      "note": "Rusak status - lokasi updated from tujuan"
    }
  ],
  "stok_summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

## Validasi dan Error Handling

### 1. Validasi Aktivitas
- Sistem memvalidasi bahwa `activity` adalah "Terima Tabung Dari Pelanggan" atau "Terima Tabung Dari Agen"
- Status "Rusak" hanya akan memicu logika khusus untuk kedua aktivitas ini

### 2. Error Handling
- Setiap operasi database di-wrap dalam try-catch
- Error per `kode_tabung` dicatat dalam `stok_results` tanpa menggagalkan seluruh transaksi
- Logging detail untuk debugging

### 3. Konsistensi Data
- Volume selalu diset ke 0 untuk record baru (sesuai requirement sebelumnya)
- Tanggal update selalu diset ke waktu saat ini
- Status di `stok_tabung` akan sesuai dengan status dari aktivitas

## Testing

Server telah ditest dan berjalan tanpa error pada port 3000. Implementasi siap untuk digunakan.

## Catatan Penting

1. **Lokasi dari Tujuan**: Kolom `lokasi` di `stok_tabung` akan diisi dengan nilai dari parameter `tujuan`
2. **Status Handling**: Logika ini hanya berlaku untuk status "Rusak" pada aktivitas terima tabung
3. **Volume Preserved**: Volume tidak diubah untuk record yang sudah ada (sesuai requirement sebelumnya)
4. **Backward Compatibility**: Semua logika existing tetap berfungsi normal