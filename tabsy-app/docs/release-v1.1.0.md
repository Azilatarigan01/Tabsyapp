# Catatan Rilis Tabsy v1.1.0 (Tahap 10: Pembagian Per Item & Pelunasan Peserta)

**Tanggal Rilis:** 05 Oktober 2026  
**Status:** Stabil & Terverifikasi (32 Unit Tests Lolos 100%)  
**Target Tahap Berikutnya:** Tahap 11 — OCR Struk & Ekstraksi AI

---

## 🎯 Ringkasan Rilis v1.1.0
Rilis **v1.1.0** menghadirkan pembaruan arsitektur besar untuk kalkulator split bill Tabsy: model data berbasis item (`BillDraft`, `BillItem`, `Participant`, `Payment`), alokasi diskon sebelum pajak & servis dengan metode *Largest Remainder*, pencatatan pembayaran nyata multi-peserta, saldo individual, serta rekomendasi transfer pelunasan otomatis. 

Modul ini dirancang secara modular dan **100% siap menerima hasil ekstraksi OCR struk belanja**.

---

## 🚀 Fitur & Peningkatan Utama

### 1. Model Data Multi-Item & Draft Lokal (`BillDraft`)
* **Struktur Data Komprehensif:**
  * `Participant`: Identitas peserta `{ id, name }`.
  * `BillItem`: Item menu dengan nama, harga, kuantitas integer, dan alokasi peserta `assignedParticipantIds`.
  * `Payment`: Catatan pembayaran riil `{ id, participantId, amountPaid, note, paidAt }`.
  * `BillDraft`: Draft tagihan lengkap tersimpan di IndexedDB browser.
* **Migrasi Database Dexie (Versi 2):**
  * Penambahan object store `billDrafts: 'id, date, title, isFinalized, updatedAt'`.
  * Migrasi skema otomatis yang mempertahankan 100% transaksi pengguna yang sudah ada sebelumnya.

### 2. Aturan Bisnis & Alokasi Presisi
* **Item Tanpa Peserta Menghalangi Finalisasi:**
  * Setiap item wajib dialokasikan minimal ke 1 peserta. Sistem memberikan indikator visual peringatan merah dan memblokir status finalisasi jika ada item yang belum ditentukan penikmatnya.
* **Diskon Nominal Sebelum Pajak & Servis:**
  * Diskon promo (cth: voucher Rp20.000) diterapkan langsung ke subtotal kotor sebelum penghitungan pajak (PPN/PB1) dan service charge.
* **Alokasi Largest Remainder (Hamilton-Hare Method):**
  * Diskon, pajak, dan service charge dialokasikan ke masing-masing orang secara proporsional. Selisih pembulatan rupiah didistribusikan deterministik berdasarkan sisa pecahan terbesar, menjamin jumlah total bagian per orang **sama persis 100% dengan total tagihan kasir**.

### 3. Saldo Peserta & Rencana Pelunasan Multi-Pembayar
* **Pencatatan Pembayaran:**
  * Pengguna dapat mencatat siapa yang membayar ke kasir (misal: Asep membayar Rp100.000, Budi mentransfer Rp30.000).
* **Status Pembayaran Real-Time:**
  * Jika pembayaran belum lengkap: Menampilkan status **"Belum Selesai (Kurang RpX)"**.
  * Jika pembayaran pas: Menampilkan status **"Lunas & Selesai"**.
  * Jika berlebih: Menampilkan status **"Kelebihan Bayar"**.
* **Rencana Pelunasan Otomatis:**
  * Ketika pembayaran selesai, Tabsy menghitung rute transfer paling ringkas (siapa transfer ke siapa dan berapa nominalnya) sehingga seluruh saldo peserta menjadi Rp0.
* **Format Berbagi WhatsApp & Teks:**
  * Ringkasan tagihan yang rapi dan elegan, siap disalin atau dikirim langsung ke grup WhatsApp teman/kantor.

### 4. Adapter Backup V1 Backward-Compatible
* Format backup JSON kini mencakup skema versi 2 (`BackupDataV2`).
* File backup lama versi 1 (`BackupDataV1`) tetap dapat dipulihkan secara instan tanpa error; adapter secara otomatis memigrasikannya ke struktur v2.

---

## 🧪 Hasil Verifikasi & Pengujian
Seluruh modul telah diuji melalui Vitest dengan **32 pengujian unit berhasil lolos 100%**:
* `distributeLargestRemainder`: Pembagian adil tanpa sisa desimal.
* `validateBillDraftForFinalization`: Penolakan item tanpa penikmat menu.
* `calculateItemSplit`: Diskon sebelum pajak, presisi pembulatan rupiah, dan pelunasan multi-pembayar.
* `BackupAdapter`: Pengujian migrasi file backup legacy v1 ke v2.

```bash
✓ src/lib/domain/__tests__/domain.test.ts (12 tests)
✓ src/lib/db/__tests__/db.test.ts (7 tests)
✓ src/lib/domain/__tests__/itemSplit.test.ts (11 tests)
✓ src/lib/domain/__tests__/backup.test.ts (2 tests)

Test Files: 4 passed (4)
Tests:      32 passed (32)
```

---

## 📦 Kesiapan Tahap Selanjutnya (OCR & AI)
Arsitektur `BillItem` dan `BillDraft` di v1.1.0 ini dirancang khusus agar komponen OCR kamera struk di Tahap 11 dapat langsung memetakan teks struk yang terbaca (nama menu, qty, harga) menjadi daftar `BillItem[]` secara otomatis.
