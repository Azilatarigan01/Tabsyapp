# Tabsy ⚡ — Personal Productivity & Smart Finance Ledger

> **Platform Terpadu Manajemen Rutinitas Harian & Finansial Cerdas dengan Jaminan Privasi 100% Lokal.**

![Tabsy Banner](./tabsy-app/public/tabsy_mascot_hero.jpg)

---

## 🌟 Tentang Tabsy
Tabsy dirancang untuk membantu profesional muda, fresh graduate, mahasiswa, dan siapa saja yang ingin membangun **kebiasaan hidup konsisten** sekaligus **mengelola keuangan pribadi secara rapi tanpa ribet**.

Berbeda dengan aplikasi lain yang menjual data Anda ke pihak ketiga, Tabsy mengusung filosofi **Local-First & Client-Side Privacy**. Seluruh data keuangan, riwayat patungan, dan jadwal kerja Anda tersimpan aman secara privat di perangkat Anda sendiri.

---

## 🚀 Fitur Utama

### 1. ⚡ Pencatatan Pengeluaran & Safe-to-Spend Dinamis
* **Input Cepat & Alami**: Cukup tulis pengeluaran harian, otomatis terdeteksi kategori dan nominalnya.
* **Batas Aman Belanja Harian (Safe-to-Spend)**: Menghitung secara dinamis berapa batas belanja aman per hari berdasarkan sisa hari hingga tanggal gajian berikutnya agar Anda tidak boncos di akhir bulan.
* **Kategori Finansial Lengkap**: Makanan, Transportasi, Hiburan, Belanja, Tagihan, dan Lainnya.

### 2. 👥 Kalkulator Bagi Tagihan & Patungan (Split Bill Kilat)
* **Mode Bagi Rata (Sederhana)**: Pembagian tagihan cepat untuk kelompok.
* **Mode Rinci per Menu (Itemized)**: Alokasi pesanan makanan spesifik tiap orang.
* **Proporsional Presisi**: Perhitungan diskon promo restoran, pajak PPN, dan service charge secara proporsional dengan jaminan **Rp0 selisih pembulatan**.
* **Tautan Ringkas & Rekap WhatsApp**: Bagikan rincian tagihan langsung ke teman via WhatsApp atau tautan pendek `/b/[id]`.

### 3. 📅 Agenda Time-Blocking & Habit Tracker
* **Kustomisasi Bebas**: Rancang jadwal harian terstruktur dari bangun pagi hingga malam.
* **Persona Templates**: Rekomendasi jadwal cerdas sesuai status (Pelajar, Mahasiswa, Fresh Graduate, Pekerja, atau Wirausaha).
* **Streak Konsistensi (🔥)**: Melacak kedisiplinan harian Anda tanpa putus.

### 4. 🎮 Gamifikasi Disiplin (Level, EXP & Toko Hadiah)
* Dapatkan EXP setiap menyelesaikan habit (+25 EXP), agenda (+30 EXP), transaksi (+20 EXP), atau split bill (+40 EXP).
* Kumpulkan **Gems (💎)** untuk ditukarkan dengan Avatar Eksklusif, Perisai Pelindung Streak, dan kustomisasi persona.

### 5. 🔒 Privasi 100% & Autentikasi Aman
* **Local-First Database**: Data tersimpan di browser via IndexedDB dan LocalStorage.
* **Verifikasi Reset Password OTP 6-Digit**: Proteksi akun dari manipulasi pihak lain saat lupa kata sandi.
* **Cadangkan & Pulihkan (JSON/CSV)**: Ekspor laporan transaksi ke Microsoft Excel / Google Sheets kapan saja.

---

## 🛠️ Teknologi yang Digunakan
* **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS Micro-animations
* **Icons**: [Lucide React](https://lucide.dev/)
* **Testing**: [Vitest](https://vitest.dev/) (44 Unit Tests)
* **Storage**: IndexedDB (idb-keyval) & LocalStorage (Local-First Architecture)

---

## 💻 Panduan Menjalankan di Komputer Lokal

```bash
# 1. Masuk ke direktori aplikasi
cd tabsy-app

# 2. Install dependensi
npm install

# 3. Jalankan server pengembangan
npm run dev

# 4. Buka di peramban
http://localhost:3000
```

---

## 🌐 Panduan Publikasi ke Vercel (Online Deployment)
Untuk mempublikasikan Tabsy agar bisa diakses online oleh siapa saja:

1. Buat repositori baru di [GitHub](https://github.com/new) (misal: `tabsy`).
2. Hubungkan repositori lokal Anda:
   ```bash
   git remote add origin https://github.com/<username-github>/tabsy.git
   git push -u origin main
   ```
3. Buka [Vercel](https://vercel.com/) dan login dengan akun GitHub Anda.
4. Klik **Add New Project** lalu pilih repositori **tabsy**.
5. Pada bagian **Root Directory**, pilih: `tabsy-app`.
6. Klik tombol **Deploy**!
7. Aplikasi Tabsy Anda akan langsung online dengan domain publik gratis (misal: `https://tabsy.vercel.app`).

---

## 📄 Lisensi
Dilisensikan di bawah [MIT License](LICENSE). Dibuat dengan cinta untuk kemudahan finansial dan produktivitas harian.
