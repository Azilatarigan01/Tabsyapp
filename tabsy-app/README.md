# CatatCepat (Tabsy) ⚡ — v1.0.0

Aplikasi web responsif & PWA pencatatan pengeluaran kilat dan kalkulator split bill patungan makan untuk mahasiswa dan pekerja. Bekerja secara **100% offline-first** dengan penyimpanan lokal di browser (**IndexedDB via Dexie.js**), tanpa perlu registrasi akun atau biaya server.

---

## 🌟 Fitur Utama (MVP v1.0.0)

1. **⚡ Pencatatan Kilat (Quick Parser)**:
   - Ketik singkat satu baris: `kopi 25k`, `nasi 25000`, `parkir 5rb`, `bensin 20.000`, hingga desimal `25,5k` $\rightarrow$ langsung menghasilkan preview nama, nominal, dan rekomendasi kategori otomatis sebelum disimpan.
   - Proteksi format ambigu (menolak angka non-ribuan seperti `25.00` atau nominal ganda).
2. **📋 Riwayat & Ringkasan Dinamis**:
   - Ringkasan total pengeluaran hari ini dan bulan aktif yang reaktif seketika.
   - Filter per bulan, filter per kategori, dan pencarian cepat.
   - Modal edit transaksi (menjaga integritas UUID dan timestamp `createdAt`).
   - Modal konfirmasi hapus yang menyebutkan nama transaksi secara eksplisit + **Fitur Undo Delete**.
3. **👥 Kalkulator Bagi Tagihan (Split Bill)**:
   - **Mode 1: Bagi Rata**: Pembagian bulat presisi dengan distribusi sisa modulo satu per satu ke peserta teratas (contoh: Rp115.000 untuk 3 orang tepat Rp38.334, Rp38.333, Rp38.333 tanpa selisih 1 rupiah pun).
   - **Mode 2: Beda Menu (Per Item)**: Setiap peserta membayar menu yang dipesan masing-masing + pembagian menu *sharing*.
   - **Sakelar Resto Tanpa Pajak**: Toggle ON/OFF untuk pajak & service (bisa langsung Rp0).
   - **Berbagi Cepat**: Dukungan Web Share API native untuk membagikan rekap ke WhatsApp atau salin teks.
4. **💾 Ekspor & Cadangkan Data**:
   - Ekspor transaksi ke format **CSV Excel** dengan *UTF-8 BOM* dan proteksi *Formula Injection*.
   - Cadangkan dan pulihkan data **JSON** (skema `formatVersion 1`) tervalidasi Zod dengan transaksi atomik (anti duplikasi ID).
5. **📱 PWA & Offline-First**:
   - Web App Manifest dan Service Worker untuk akses instan tanpa koneksi internet.
   - Responsif dari lebar layar 360px ke atas dengan bilah navigasi bawah ramah satu jempol.

---

## 🛠️ Arsitektur & Teknologi

| Lapisan | Teknologi | Peran & Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 16 (App Router) + React 19 | Performa tinggi, App Router, static generation, dan kesiapan PWA. |
| **Bahasa** | TypeScript 5 | Menjamin tipe data uang aman (`Number.isSafeInteger`) dan mencegah floating point bug. |
| **Styling** | Tailwind CSS v4 | Desain mobile-first responsif, dark mode elegan, dan komponen modern. |
| **Database Lokal** | Dexie.js v4 (IndexedDB) | Penyimpanan database lokal di browser klien yang cepat dan tahan refresh. |
| **Validasi** | Zod | Validasi schema transaksi, file backup, dan input formulir. |
| **Unit Testing** | Vitest | Pengujian otomatis logika parser, kalkulasi split bill, dan database. |
| **Ikon** | Lucide React | Ikon modern, ringan, dan konsisten. |

---

## 🚀 Cara Menjalankan Proyek

### 1. Prasyarat
- Node.js LTS (v20 atau lebih baru)
- npm (v10 atau lebih baru)

### 2. Jalankan Mode Pengembangan (Dev)
```bash
cd tabsy-app
npm install
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### 3. Jalankan Pengujian Otomatis (Unit Test)
```bash
npm test
```
*Hasil: 21 dari 21 test case domain parser, kalkulator split bill, skema Zod, dan repository Dexie lolos 100%.*

### 4. Build untuk Production
```bash
npm run build
npm run start
```

---

## 🌐 Panduan Deploy ke Vercel (Production HTTPS)
1. Push repository ini ke GitHub.
2. Buka [Vercel](https://vercel.com) $\rightarrow$ **Add New Project** $\rightarrow$ Pilih repositori `tabsy`.
3. Set **Root Directory** ke `tabsy-app`.
4. Klik **Deploy** (Deployment instan gratis dengan sertifikat HTTPS otomatis).

---

## ⚠️ Keterbatasan & Roadmap Lanjutan

### Keterbatasan MVP v1.0:
- **Cakupan Penyimpanan**: Data transaksi tersimpan di memori browser perangkat lokal (IndexedDB) dan terikat pada *Origin/Domain*. Data tidak otomatis tersinkronisasi antarperangkat. Gunakan fitur *Cadangkan Data (JSON)* sebelum berganti HP atau domain.
- **Mata Uang**: Menggunakan Rupiah (IDR) dengan nominal bulat; belum multi-currency.

### Roadmap Rilis Berikutnya:
- **v1.1**: Saldo talangan multi-pembayar & rencana pelunasan utang patungan.
- **v1.2**: OCR lokal struk belanja via Web Worker Tesseract.js (bebas biaya API).
- **v2.0**: Integrasi AI cloud (Next.js Route Handlers + OpenAI Structured Outputs + Supabase Auth).
