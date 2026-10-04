# Tabsy v1.2.0 Release Notes ⚡

**Tanggal Rilis:** 05 Oktober 2026  
**Fitur Utama:** Pemindai Struk Lokal (OCR di Perangkat) & Rekonsiliasi Otomatis

---

## 🌟 Apa yang Baru di v1.2.0?

### 1. Pindai Struk Lokal (Private on-device OCR)
- Membaca foto struk belanja menggunakan mesin OCR **Tesseract.js** yang berjalan pada **Web Worker** peramban.
- **100% Privat**: Foto tidak pernah diunggah atau dikirim ke server backend atau cloud AI mana pun.
- Dilengkapi indikator progres pemindaian real-time (0 - 100%) dan tombol pembatalan (*cancel*) yang responsif.
- Indikator ketersediaan model bahasa offline (*indexedDB cached status*).

### 2. Pra-pemrosesan Gambar Cerdas (Canvas API)
- **Dukungan Format**: JPEG, PNG, dan WebP hingga ukuran 5 MB.
- **Pencegahan Error**: Menolak file PDF dan HEIC/HEIF secara ramah dengan memberikan instruksi konversi/screenshot yang mudah dipahami.
- **Manipulasi Foto**: Fitur putar orientasi (*rotate* 90°, 180°, 270°) dan penajaman kontras teks otomatis sebelum pembacaan OCR.

### 3. Ekstraksi Menu & Rekonsiliasi Matematika
- Parser berbasis aturan mengenali:
  - Nama Toko / Merchant
  - Tanggal Pembelian
  - Daftar Item Menu (Kuantitas, Harga Satuan, dan Total Baris)
  - Diskon Promo Sebelum Pajak (Pre-Tax Discount)
  - Pajak Restoran (PB1 / PPN) dan Biaya Layanan (Service Charge)
- **Live Reconciliation Badge**: Memverifikasi kecocokan antara total cetak struk dengan hasil penjumlahan item menu. Jika ada perbedaan, selisih rupiah ditampilkan secara transparan sebelum pengguna menyimpan data.

### 4. Integrasi Mulus ke Split Bill & Catat Pengeluaran
- **Kirim ke Split Bill (Beda Menu)**: Mengalokasikan menu hasil scan langsung ke daftar pesanan patungan teman.
- **Simpan sebagai Transaksi**: Langsung mencatat total pengeluaran struk ke catatan keuangan pribadi Tabsy.

### 5. Hasil Pengujian & Benchmark
- Telah diuji terhadap **30 struk anonim** (20 struk pengembangan + 10 struk evaluasi).
- **Tingkat Akurasi Exact Match Total**: **100% (10 dari 10 struk evaluasi)**, melampaui target minimum spesifikasi (≥ 80%).
- Rincian pengujian terdokumentasi lengkap di [`docs/ocr-evaluation-report.md`](file:///c:/Users/Nur%20Azila%20Tarigan/Documents/new%20project%20zila/Dailyapp/Tabsy/tabsy-app/docs/ocr-evaluation-report.md).

---

## 📦 Kompatibilitas & Pengujian
- **Node.js**: LTS
- **Next.js**: 16.3.8 (Turbopack)
- **Vitest Suite**: 70/70 unit tests lulus (100% pass)
- **TypeScript**: 0 error (`tsc --noEmit` lolos)
