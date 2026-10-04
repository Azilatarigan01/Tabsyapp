# Product Requirements Document (PRD) - CatatCepat (Tabsy)

## 1. Gambaran Proyek
**CatatCepat** membantu mahasiswa dan pekerja yang ingin mencatat pengeluaran kecil tanpa banyak langkah serta menghitung patungan makan (split bill).
- **Pencatatan Pribadi**: Fitur utama berbasis browser IndexedDB (offline-first).
- **Split Bill**: Alat pendamping independen tanpa otomatis mencatat transaksi pribadi pada v1.0.

| Bagian | Keputusan |
| :--- | :--- |
| **Pengguna Utama** | Mahasiswa dan pekerja yang mencatat pengeluaran harian serta patungan sederhana. |
| **Masalah** | Pencatatan terlalu banyak langkah; perhitungan tagihan dan pembulatan sulit diperiksa. |
| **Manfaat** | Input singkat, rincian tagihan jelas, data lokal, dan penggunaan offline. |
| **Platform** | Web responsif untuk HP (min. 360px) dan laptop, PWA offline-first. |
| **Mata Uang** | Rupiah dengan nominal bulat; maksimal aman Rp1.000.000.000. |
| **Penyimpanan** | IndexedDB browser pengguna via Dexie (tanpa database server di MVP). |

## 2. Kebutuhan Fungsional MVP (v1.0)
- **F01 Form Transaksi**: Deskripsi, nominal integer rupiah, kategori, tanggal (YYYY-MM-DD).
- **F02 Input Cepat**: `kopi 25k`, `nasi 25000`, `parkir 5rb` menghasilkan preview nama & nominal sebelum disimpan.
- **F03 Riwayat**: Lihat daftar, filter bulan & kategori, pencarian, edit, dan hapus transaksi.
- **F04 Ringkasan**: Total hari ini dan total bulan aktif.
- **F05 Split Bill**: Subtotal, pajak & service (persen bps atau nominal), pembagian rata dengan alokasi sisa modulo ke peserta teratas sehingga total peserta = total tagihan.
- **F06 Ekspor CSV**: CSV dengan format UTF-8 BOM untuk Microsoft Excel & Google Sheets.
- **F07 Backup JSON**: Ekspor/impor JSON formatVersion 1 dengan validasi Zod dan deteksi duplikasi UUID.
- **F08 Offline & PWA**: PWA manifest & service worker untuk akses tanpa koneksi internet.

## 3. Aturan Perhitungan & Validasi
- **Nominal**: Wajib bilangan bulat positif (`Number.isSafeInteger`), max Rp1.000.000.000.
- **Pajak & Service**: Dihitung dari Subtotal, persentase disimpan dalam basis points (0-100%, maks 2 desimal), dibulatkan dengan *half-up* ke rupiah terdekat.
- **Split Remainder**: `Total % Jumlah Peserta` dialokasikan 1 rupiah per peserta mulai dari urutan pertama.
