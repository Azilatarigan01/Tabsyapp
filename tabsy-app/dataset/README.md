# Dataset Struk Tabsy (CORD & SROIE Benchmark) 🧾

Folder ini berisi kumpulan file foto struk belanja asli yang digunakan untuk pengujian dan evaluasi modul **Scan Struk Lokal (OCR)** pada Tabsy v1.2.0.

## 📂 Daftar File Struk di Folder Ini
1. **`receipt_kopi_kenangan.jpg`**
   - **Gerai**: KOPI KENANGAN (Kafe Jakarta)
   - **Tanggal**: 12/03/2026
   - **Menu**: Kopi Kenangan Mantan (Rp18.000), Avocado Coffee Large (Rp24.000)
   - **Subtotal**: Rp42.000 | **Total**: Rp42.000

2. **`receipt_mie_gacoan.jpg`**
   - **Gerai**: MIE GACOAN TEBET (Restoran Mie & Dimsum)
   - **Tanggal**: 01/07/2026
   - **Menu**: 2x Mie Hompimpa Lv 2 (Rp24.000), 1x Udang Keju (Rp10.000), 1x Es Genderuwo (Rp9.000)
   - **Subtotal**: Rp43.000 | **PB1 (10%)**: Rp4.300 | **Total**: Rp47.300

3. **`receipt_janji_jiwa.jpg`**
   - **Gerai**: KOPI JANJI JIWA
   - **Tanggal**: 24/04/2026
   - **Menu**: 1x Es Kopi Susu (Rp20.000), 1x Toast Jiwa Beef (Rp32.000)
   - **Subtotal**: Rp52.000 | **Diskon Promo**: -Rp5.000 | **Total**: Rp47.000

4. **`receipt_indah.jpg` / `sroie_001.jpg`**
   - **Gerai**: INDAH GIFT & HOME DECO (Dataset ICDAR-2019-SROIE)
   - **Tanggal**: 19/10/2018
   - **Item**: ST-Privilege Card (10.00), GF-Table Lamp/Stitch (55.90 - Disc 5.59)
   - **Total**: 60.30

---

## 🐍 Cara Mengunduh Tambahan dari Hugging Face
Gunakan script `load_dataset.py` yang ada di folder ini:
```bash
python load_dataset.py
```
Script tersebut menggunakan library `datasets` untuk menarik sample terbaru dari **`naver-clova-ix/cord-v2`** (CORD Indonesian Consolidated Receipt Dataset).
