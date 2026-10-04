# CatatCepat (Tabsy) ⚡

Aplikasi pencatatan pengeluaran harian kilat dan kalkulator split bill patungan makan untuk mahasiswa dan pekerja. Bekerja secara **offline-first** dengan penyimpanan lokal di browser (**IndexedDB via Dexie**).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev)
- **Bahasa**: [TypeScript 5](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Database Lokal**: [Dexie.js v4](https://dexie.org) (IndexedDB wrapper)
- **Validasi Data**: [Zod](https://zod.dev)
- **Ikon**: [Lucide React](https://lucide.dev)
- **Unit Testing**: [Vitest](https://vitest.dev)

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### 2. Menjalankan Robot Pengujian Otomatis (Unit Test)
```bash
npm test
```
Menjalankan pengujian otomatis domain logika (`kopi 25k`, kalkulasi split bill bebas selisih, dan validasi backup JSON).

### 3. Build untuk Production
```bash
npm run build
npm run start
```

---

## 📂 Struktur Folder

```text
src/
├── app/                  # Halaman & layout Next.js App Router
├── components/           # Komponen UI (Catat, Riwayat, Split, Pengaturan)
├── lib/
│   ├── db/               # Dexie IndexedDB repository
│   ├── domain/           # Parser 'kopi 25k' & kalkulator split bill
│   └── export/           # Generator CSV & Backup/Restore JSON
└── types/                # TypeScript interface & types
docs/
└── prd.md                # Dokumen PRD dan aturan kalkulasi
```

---

## 📋 Fitur Utama (MVP v1.0)

1. **Catat Cepat**: Ketik `kopi 25k`, `nasi 25000`, atau `parkir 5rb` langsung menghasilkan preview sebelum disimpan.
2. **Riwayat & Filter**: Pengelompokan bulanan, filter kategori, dan pencarian cepat.
3. **Split Bill Patungan**: Pembagian adil tanpa selisih pembulatan (contoh Rp115.000 bagi 3 = 38.334, 38.333, 38.333).
4. **Ekspor & Backup**: Download CSV spreadsheet dan backup JSON dengan deteksi duplikasi.
5. **Offline & Privasi**: Seluruh transaksi tersimpan aman di browser Anda tanpa memerlukan akun server.
