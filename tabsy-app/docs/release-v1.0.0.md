# Dokumentasi Rilis v1.0.0 — CatatCepat (Tabsy) ⚡
**Tahap 9: Publikasi Aplikasi Versi Pertama (Production MVP)**

---

## 1. Ikhtisar Rilis
- **Nama Produk**: CatatCepat (Tabsy)
- **Versi**: `v1.0.0`
- **Lisensi**: MIT
- **Target Pengguna**: Mahasiswa dan pekerja muda yang butuh pencatatan pengeluaran cepat dan perhitungan split bill tanpa selisih pembulatan.
- **Model Hosting**: Static & Client-Side PWA via Vercel (HTTPS Otomatis, Zero Server Cost).

---

## 2. Kriteria Penerimaan MVP yang Diverifikasi
| Fitur / Modul | Acceptance Criteria | Status |
| :--- | :--- | :---: |
| **F01 Form Transaksi** | Nama, nominal integer rupiah, kategori, tanggal tersimpan di IndexedDB. | ✅ Lolos |
| **F02 Input Cepat** | Parsing teks `kopi 25k`, `nasi 25000`, `parkir 5rb`, `25,5k` menghasilkan preview instan. Ambigu seperti `25.00` atau nominal ganda ditolak aman. | ✅ Lolos |
| **F03 Riwayat Transaksi** | Filter bulanan, filter kategori, search, modal edit (mempertahankan ID & `createdAt`), konfirmasi hapus menyebutkan nama transaksi, serta fitur **Undo Delete**. | ✅ Lolos |
| **F04 Ringkasan Pengeluaran** | Total hari ini dan total bulan aktif terhitung akurat dan reaktif terhadap perubahan data. | ✅ Lolos |
| **F05 & F09 Split Bill** | Mode Bagi Rata (contoh Rp115.000 untuk 3 orang tepat Rp38.334, Rp38.333, Rp38.333), Mode Pesanan Beda Menu (per item & sharing), sakelar resto tanpa pajak, dan Web Share API. | ✅ Lolos |
| **F06 Ekspor CSV** | Format UTF-8 BOM kompatibel Excel & Google Sheets dengan proteksi *Formula Injection*. | ✅ Lolos |
| **F07 Backup & Restore** | Format JSON `formatVersion 1` dengan validasi Zod dan transaksi atomik Dexie (anti duplikasi ID). | ✅ Lolos |
| **F08 PWA & Offline** | Web App Manifest dan Service Worker (`sw.js`). Aplikasi bisa diakses dan mencatat tanpa internet. | ✅ Lolos |

---

## 3. Prosedur Deploy ke Vercel (Production HTTPS)

Karena CatatCepat adalah aplikasi berbasis Next.js App Router murni tanpa database server di backend, deploy ke Vercel sangat cepat dan gratis:

### Cara 1: Menggunakan Git Repository (Direkomendasikan)
1. Push repository lokal ini ke GitHub:
   ```bash
   git remote add origin https://github.com/<username>/tabsy.git
   git branch -M main
   git push -u origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com).
3. Klik **"Add New Project"** $\rightarrow$ Pilih repositori `tabsy`.
4. Di bagian **Root Directory**, pilih folder `tabsy-app`.
5. Klik **"Deploy"**. Vercel akan otomatis meng-compile dan menyediakan URL publik HTTPS (contoh: `https://catatcepat.vercel.app`).

### Cara 2: Menggunakan Vercel CLI Langsung
```bash
cd tabsy-app
npx vercel
```

---

## 4. Prosedur Pembaruan & Rollback Tanpa Merusak Data

### A. Aturan Migrasi Domain (Origin Scope)
> [!IMPORTANT]
> **Penyimpanan IndexedDB terikat pada Origin (Protokol + Domain + Port).**
> Jika Anda mengubah nama domain (misalnya dari `catatcepat-dev.vercel.app` ke `catatcepat.id`), data pengguna tidak otomatis berpindah.
> **SOP:** Lakukan unduh file **Cadangkan Data (JSON)** di domain lama, lalu buka domain baru dan klik **Pulihkan Data (JSON)**.

### B. Prosedur Pembaruan Aplikasi (Update SOP)
1. Saat merilis fitur baru (v1.1, v1.2), Service Worker akan mendeteksi perubahan versi `CACHE_NAME` (`catatcepat-cache-v2`).
2. Service worker memperbarui cache aset tampilan, **namun IndexedDB (`CatatCepatDB`) tetap utuh dan tidak terhapus**.
3. Jika terdapat perubahan kolom database di masa depan, gunakan fitur migrasi versi Dexie:
   ```ts
   // Contoh migrasi Dexie v1 ke v2
   this.version(2).stores({
     transactions: 'id, date, category, createdAt, newField',
   }).upgrade(tx => {
     // migrasi data tanpa menghapus transaksi lama
   });
   ```

### C. Prosedur Rollback Cepat (Jika Ditemukan Bug Produksi)
1. Di dashboard Vercel, buka menu **Deployments**.
2. Cari rilis stabil sebelumnya (misal commit `v1.0.0`).
3. Klik tombol titik tiga (...) lalu pilih **"Promote to Production"**.
4. Rollback tampilan instan dalam 5 detik tanpa menyentuh database lokal pengguna.

---

## 5. Ringkasan Pengujian Otomatis
- **Vitest Unit Tests**: 21 pengujian lolos 100% (Parser, Kalkulator Split Bill, Schema Zod, Repository Dexie).
- **Next.js Production Build**: Selesai tanpa error.
- **PWA Manifest Route**: `GET /manifest.webmanifest` 200 OK.
