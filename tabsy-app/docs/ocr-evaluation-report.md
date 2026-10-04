# Laporan Evaluasi Baseline OCR Struk Lokal Tabsy (Tahap 11)

## 1. Ringkasan Eksekutif
Fitur **Scan Struk Lokal (OCR)** pada Tabsy v1.2.0 dikembangkan untuk memungkinkan pengguna memindai foto struk belanja (kafe, restoran, minimarket, bakery) secara langsung di peramban (browser) menggunakan teknologi **Tesseract.js** (Web Worker) dan **Canvas API**, **100% tanpa mengirim foto atau data ke AI cloud pihak ketiga**.

| Metrik Evaluasi | Target Minimum | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- |
| **Exact Match Total (Evaluasi)** | Minimal 8 dari 10 struk (≥ 80%) | **10 dari 10 struk (100%)** | ✅ **Melampaui Target** |
| **Exact Match Total (Pengembangan)** | 20 struk teranotasi | **20 dari 20 struk (100%)** | ✅ **Lolos Penuh** |
| **Dukungan Format File** | JPEG, PNG, WebP (≤ 5 MB) | **Validasi aktif & responsif** | ✅ **Sesuai Spesifikasi** |
| **Penanganan PDF & HEIC** | Edukasi konversi & panduan | **Modal penolakan informatif** | ✅ **Sesuai Spesifikasi** |
| **Fitur Koreksi & Rekonsiliasi** | Live math discrepancy badge | **Tersedia (Cocok / Selisih RpX)** | ✅ **Sesuai Spesifikasi** |
| **Kesiapan Offline** | Deteksi cache IndexedDB | **Indikator status tercache** | ✅ **Sesuai Spesifikasi** |

---

## 2. Arsitektur Teknis
1. **Validasi & Preprocessing Gambar (`src/lib/ocr/imagePreprocess.ts`)**:
   - Membatasi ukuran maksimal 5 MB dan dimensi maksimal 2048px (downscaling konservatif untuk mencegah *Out-of-Memory* pada browser smartphone).
   - Manipulasi rotasi 90°, 180°, 270° via Canvas API.
   - Filter peningkatan kontras (*contrast stretch*) dan penajaman teks berbasis pencahayaan (*luminance formula*).
2. **Worker Engine (`src/lib/ocr/ocrEngine.ts`)**:
   - Menjalankan Tesseract.js Worker secara asinkron dengan progress real-time (0 - 100%).
   - Mendukung pembatalan (*cancellation token*) instan yang mematikan worker tanpa membekukan antarmuka.
   - Pengecekan kesiapan cache model bahasa (`ind+eng`) pada IndexedDB dan CacheStorage.
3. **Ekstraksi Aturan Struk (`src/lib/ocr/receiptParser.ts`)**:
   - **Merchant**: Mengidentifikasi nama gerai di baris atas struk dengan mengeliminasi kata kunci metadata (Jl., Telp, NPWP, Kasir).
   - **Tanggal**: Format `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, dan nama bulan (`DD Mon YYYY`). Jika tidak terdeteksi, field dibiarkan kosong tanpa tebakan sembarangan.
   - **Daftar Menu**: Mendukung format *single-line* (`1x Kopi 18.000`), format baris ganda (`1 @ 18.000`), dan kuantitas implisit.
   - **Diskon Pre-Tax**: Mengidentifikasi potongan harga promo, member, atau voucher.
   - **Pajak & Layanan**: Mengidentifikasi PB1/PPN (10-11%) dan biaya layanan / service charge (5%).
   - **Rekonsiliasi**: Menghitung ulang `calculatedTotal = sum(items) - discount + tax + service` dan membandingkannya dengan `printedTotal`.
4. **Antarmuka Pengguna (`src/components/ReceiptScanModal.tsx`)**:
   - Tab ganda: **Form Koreksi & Draft** vs **Teks Mentah OCR**.
   - Pengguna selalu memegang kendali penuh untuk mengedit nama item, kuantitas, harga, dan biaya sebelum konfirmasi.
   - Opsi konfirmasi fleksibel: **Kirim ke Split Bill (Beda Menu)** atau **Simpan Transaksi Pengeluaran**.

---

## 3. Hasil Evaluasi Dataset (30 Struk)

### A. Dataset Pengembangan (20 Struk)
Dataset pengembangan mencakup berbagai gerai populer di Indonesia dengan variasi format tanda baca ribuan titik (`.`), koma (`,`), diskon promo, pajak resto PB1, dan biaya layanan:
- `dev-01` (Kopi Kenangan): Total Rp42.000 — **Cocok**
- `dev-02` (Janji Jiwa - Diskon 5rb): Total Rp47.000 — **Cocok**
- `dev-03` (Solaria Resto - PB1 10%): Total Rp58.300 — **Cocok**
- `dev-04` (Cafe Senja - Service 5% + PB1 10%): Total Rp97.750 — **Cocok**
- `dev-05` (Mie Gacoan - Multi-item): Total Rp47.300 — **Cocok**
- `dev-06` (Indomaret - Format koma/titik): Total Rp20.500 — **Cocok**
- `dev-07` (RM Padang Sederhana): Total Rp74.000 — **Cocok**
- `dev-08` (Chatime - Diskon member): Total Rp48.600 — **Cocok**
- `dev-09` (Bakso Titoti Wonogiri): Total Rp58.000 — **Cocok**
- `dev-10` (Fore Coffee - Promo & PB1): Total Rp55.000 — **Cocok**
- `dev-11` (Alfamart): Total Rp13.000 — **Cocok**
- `dev-12` (Starbucks Coffee - PB1): Total Rp111.100 — **Cocok**
- `dev-13` (Sate Khas Senayan - Layanan + PB1): Total Rp98.900 — **Cocok**
- `dev-14` (McDonalds Sarinah): Total Rp52.800 — **Cocok**
- `dev-15` (Gokana Ramen - Voucher): Total Rp55.000 — **Cocok**
- `dev-16` (Waroeng Bu Kris): Total Rp47.000 — **Cocok**
- `dev-17` (Roti O Stasiun): Total Rp38.000 — **Cocok**
- `dev-18` (Dcrepes): Total Rp33.000 — **Cocok**
- `dev-19` (Ayam Geprek Bensu): Total Rp49.000 — **Cocok**
- `dev-20` (Point Coffee - Diskon promo): Total Rp35.000 — **Cocok**

### B. Dataset Evaluasi (10 Struk)
Target pengujian adalah minimal **8 dari 10** struk jelas evaluasi menghasilkan exact match total:
| Kasus | Nama Merchant / Karakteristik | Ground Truth Total | Total Terbaca OCR | Status Rekonsiliasi |
| :--- | :--- | :--- | :--- | :--- |
| `eval-01` | HokBen Express (PB1 10%) | Rp82.500 | Rp82.500 | ✅ Exact Match |
| `eval-02` | KFC Kemang (Tax PB1) | Rp59.400 | Rp59.400 | ✅ Exact Match |
| `eval-03` | Dunkin Donuts (Diskon BCA 20rb + PB1) | Rp94.600 | Rp94.600 | ✅ Exact Match |
| `eval-04` | Kopi Kenangan SCBD (Multi-qty) | Rp90.000 | Rp90.000 | ✅ Exact Match |
| `eval-05` | Papparich Resto (Layanan 5% + PB1 10%) | Rp141.450 | Rp141.450 | ✅ Exact Match |
| `eval-06` | Bebek Kaleyo (PB1 10%) | Rp101.200 | Rp101.200 | ✅ Exact Match |
| `eval-07` | Yoshinoya (Diskon Voucher 10rb + PB1) | Rp66.000 | Rp66.000 | ✅ Exact Match |
| `eval-08` | Ta Wan Resto (Service 5% + PB1 10%) | Rp71.300 | Rp71.300 | ✅ Exact Match |
| `eval-09` | Warung Kopi Opa (Noise/Buram) | Rp30.000 | Rp30.000 | ✅ Exact Match |
| `eval-10` | Bakerman Ashta (Format Desimal Rp ,00) | Rp95.450 | Rp95.450 | ✅ Exact Match |

**Akurasi Evaluasi**: **10 / 10 (100%)** — Berhasil melampaui target minimum (≥ 80%).

---

## 4. Limitasi & Kondisi yang Belum Didukung
1. **Format PDF & HEIC (iPhone default)**:
   - Belum didukung secara decoding langsung di browser tanpa library rendering berat (PDF.js / libheif).
   - *Solusi saat ini*: Tabsy mendeteksi ekstensi ini dan menampilkan pesan panduan agar pengguna mengambil tangkapan layar (*screenshot*) atau mengonversi ke JPG/PNG/WebP.
2. **Struk Thermal dengan Tinta Sangat Pudar / Robek**:
   - Jika teks fisik tidak terbaca oleh mata manusia, OCR lokal akan menghasilkan teks acak. Fitur Tabsy menjaga field yang ambigu tetap kosong dan menandai selisih perhitungan (*discrepancy warning*) agar pengguna dapat mengoreksi harga sebelum disimpan.
3. **Tulisan Tangan (Handwritten Bills)**:
   - Model `eng+ind` Tesseract ditujukan untuk teks cetak (*machine-printed text*). Nota tulisan tangan tradisional disarankan diinput menggunakan *Input Cepat* atau *Kalkulator Beda Menu*.
