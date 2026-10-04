import { ReceiptEvaluationCase } from '@/types/ocr';

/**
 * 30 Anonymized Receipt Dataset:
 * - 20 Development Receipts (Cases 1 - 20)
 * - 10 Evaluation Receipts (Cases 21 - 30)
 */
export const RECEIPT_DATASET: ReceiptEvaluationCase[] = [
  // ==========================================
  // DEVELOPMENT DATASET (20 Cases: dev-01 to dev-20)
  // ==========================================
  {
    id: 'dev-01',
    type: 'development',
    description: 'Kopi Kenangan - 2 Menu Kopi Standar',
    category: 'clear',
    rawText: `
KOPI KENANGAN
Jl. Sudirman Kav 21 Jakarta
Tanggal: 12/03/2026
---------------------------------
1 Kopi Kenangan Mantan 18.000
1 Avocado Coffee 24.000
---------------------------------
Subtotal: 42.000
Total: 42.000
Tunai: 50.000
Kembali: 8.000
Terima kasih atas kunjungan Anda
`,
    groundTruth: {
      merchantName: 'KOPI KENANGAN',
      date: '2026-03-12',
      itemCount: 2,
      subtotal: 42000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 42000,
    },
  },
  {
    id: 'dev-02',
    type: 'development',
    description: 'Janji Jiwa - Diskon Promo Hemat 5rb',
    category: 'discount',
    rawText: `
KOPI JANJI JIWA JILID 412
Mall Kelapa Gading
24-04-2026 14:30
=================================
1x Es Kopi Susu 20.000
1x Toast Jiwa Beef 32.000
---------------------------------
Subtotal 52.000
Diskon Promo Hemat -5.000
Total 47.000
QRIS: 47.000
`,
    groundTruth: {
      merchantName: 'KOPI JANJI JIWA JILID 412',
      date: '2026-04-24',
      itemCount: 2,
      subtotal: 52000,
      discount: 5000,
      tax: 0,
      service: 0,
      total: 47000,
    },
  },
  {
    id: 'dev-03',
    type: 'development',
    description: 'Solaria Resto - Pajak Restoran PB1 10%',
    category: 'clear',
    rawText: `
SOLARIA RESTAURANT
Grand Indonesia Lt 3
Tanggal: 2026-05-10
---------------------------------
1 Nasi Goreng Seafood 45.000
1 Es Teh Manis 8.000
---------------------------------
Subtotal: 53.000
PB1 (10%): 5.300
Total: 58.300
BCA Card: 58.300
`,
    groundTruth: {
      merchantName: 'SOLARIA RESTAURANT',
      date: '2026-05-10',
      itemCount: 2,
      subtotal: 53000,
      discount: 0,
      tax: 5300,
      service: 0,
      total: 58300,
    },
  },
  {
    id: 'dev-04',
    type: 'development',
    description: 'Cafe Senja - Service Charge 5% dan Pajak 10%',
    category: 'clear',
    rawText: `
CAFE SENJA UTARA
Jl. Senopati No 45
Tanggal: 18/06/2026
---------------------------------
2x Cappuccino Hot 60.000
1x Croissant Butter 25.000
---------------------------------
Subtotal: 85.000
Biaya Layanan (5%): 4.250
PB1 Pajak (10%): 8.500
Grand Total: 97.750
`,
    groundTruth: {
      merchantName: 'CAFE SENJA UTARA',
      date: '2026-06-18',
      itemCount: 2,
      subtotal: 85000,
      discount: 0,
      tax: 8500,
      service: 4250,
      total: 97750,
    },
  },
  {
    id: 'dev-05',
    type: 'development',
    description: 'Mie Gacoan - Format Qty Prefix Multi-Item',
    category: 'clear',
    rawText: `
MIE GACOAN TEBET
Jl. Tebet Raya No 10
Date: 01/07/2026
=================================
2 Mie Hompimpa Lv 2 24.000
1 Udang Keju 10.000
1 Es Genderuwo 9.000
---------------------------------
Subtotal: 43.000
Pajak PB1: 4.300
Total: 47.300
Cash: 50.000
Kembali: 2.700
`,
    groundTruth: {
      merchantName: 'MIE GACOAN TEBET',
      date: '2026-07-01',
      itemCount: 3,
      subtotal: 43000,
      discount: 0,
      tax: 4300,
      service: 0,
      total: 47300,
    },
  },
  {
    id: 'dev-06',
    type: 'development',
    description: 'Indomaret - Minimarket Format Koma & Titik',
    category: 'complex_number',
    rawText: `
INDOMARET CIPETE
Jl. Cipete Raya 8
05-08-2026
---------------------------------
1 Teh Botol Kotak 4.500
2 Roti Manis Coklat 16.000
---------------------------------
Subtotal: 20.500
Total: 20.500
Tunai: 50.000
Kembalian: 29.500
`,
    groundTruth: {
      merchantName: 'INDOMARET CIPETE',
      date: '2026-08-05',
      itemCount: 2,
      subtotal: 20500,
      discount: 0,
      tax: 0,
      service: 0,
      total: 20500,
    },
  },
  {
    id: 'dev-07',
    type: 'development',
    description: 'Rumah Makan Padang Sederhana - Aneka Lauk',
    category: 'clear',
    rawText: `
RM PADANG SEDERHANA
Jl. Bendungan Hilir No 12
Tanggal: 14/08/2026
---------------------------------
2x Nasi Putih 16.000
1x Rendang Sapi 26.000
1x Ayam Gulai 24.000
1x Perkedel Kentang 8.000
---------------------------------
Subtotal 74.000
Total Bayar 74.000
`,
    groundTruth: {
      merchantName: 'RM PADANG SEDERHANA',
      date: '2026-08-14',
      itemCount: 4,
      subtotal: 74000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 74000,
    },
  },
  {
    id: 'dev-08',
    type: 'development',
    description: 'Chatime - Format Multi-line Qty & Addon',
    category: 'clear',
    rawText: `
CHATIME CITRALAND
Tanggal: 20/08/2026
=================================
1 Roasted Milk Tea 26.000
1 Hazelnut Chocolate 28.000
---------------------------------
Subtotal 54.000
Diskon Member -5.400
Total: 48.600
`,
    groundTruth: {
      merchantName: 'CHATIME CITRALAND',
      date: '2026-08-20',
      itemCount: 2,
      subtotal: 54000,
      discount: 5400,
      tax: 0,
      service: 0,
      total: 48600,
    },
  },
  {
    id: 'dev-09',
    type: 'development',
    description: 'Bakso Titoti Wonogiri - Menu Makanan Tradisional',
    category: 'clear',
    rawText: `
BAKSO TITOTI WONOGIRI
Jl. Kebon Jeruk No 9
28/08/2026
---------------------------------
2 Bakso Spesial Urat 50.000
1 Es Jeruk Nipis 8.000
---------------------------------
Subtotal: 58.000
Total: 58.000
`,
    groundTruth: {
      merchantName: 'BAKSO TITOTI WONOGIRI',
      date: '2026-08-28',
      itemCount: 2,
      subtotal: 58000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 58000,
    },
  },
  {
    id: 'dev-10',
    type: 'development',
    description: 'Fore Coffee - Format Modern App QR',
    category: 'clear',
    rawText: `
FORE COFFEE
Senayan City Lt LG
02-09-2026
---------------------------------
1 Aren Latte Large 31.000
1 Pandan Latte Reguler 29.000
---------------------------------
Subtotal: 60.000
Diskon Promo: 10.000
PB1 (10%): 5.000
Total: 55.000
`,
    groundTruth: {
      merchantName: 'FORE COFFEE',
      date: '2026-09-02',
      itemCount: 2,
      subtotal: 60000,
      discount: 10000,
      tax: 5000,
      service: 0,
      total: 55000,
    },
  },
  {
    id: 'dev-11',
    type: 'development',
    description: 'Alfamart - Format Belanja Harian',
    category: 'clear',
    rawText: `
ALFAMART PONDOK INDAH
Tgl: 15/09/2026
---------------------------------
1 Air Mineral 600ml 3.500
1 Biskuit Gandum 9.500
---------------------------------
Subtotal: 13.000
Total: 13.000
Cash: 20.000
Kembali: 7.000
`,
    groundTruth: {
      merchantName: 'ALFAMART PONDOK INDAH',
      date: '2026-09-15',
      itemCount: 2,
      subtotal: 13000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 13000,
    },
  },
  {
    id: 'dev-12',
    type: 'development',
    description: 'Starbucks Coffee - Pajak Restoran 10%',
    category: 'clear',
    rawText: `
STARBUCKS COFFEE
Kota Kasablanka Ground Floor
Date: 19/09/2026
---------------------------------
1 Caramel Macchiato Tall 59.000
1 Iced Caffe Americano 42.000
---------------------------------
Sub Total: 101.000
PB1 Tax 10%: 10.100
Total: 111.100
`,
    groundTruth: {
      merchantName: 'STARBUCKS COFFEE',
      date: '2026-09-19',
      itemCount: 2,
      subtotal: 101000,
      discount: 0,
      tax: 10100,
      service: 0,
      total: 111100,
    },
  },
  {
    id: 'dev-13',
    type: 'development',
    description: 'Sate Khas Senayan - Layanan & PB1 Lengkap',
    category: 'clear',
    rawText: `
SATE KHAS SENAYAN
Menteng Central Lt 1
Tanggal: 25/09/2026
---------------------------------
1 Sate Ayam Campur 72.000
1 Nasi Putih 14.000
---------------------------------
Subtotal: 86.000
Layanan 5%: 4.300
PB1 10%: 8.600
Total: 98.900
`,
    groundTruth: {
      merchantName: 'SATE KHAS SENAYAN',
      date: '2026-09-25',
      itemCount: 2,
      subtotal: 86000,
      discount: 0,
      tax: 8600,
      service: 4300,
      total: 98900,
    },
  },
  {
    id: 'dev-14',
    type: 'development',
    description: 'McDonalds Indonesia - Menu Sarapan',
    category: 'clear',
    rawText: `
MCDONALDS SARINAH
Jl. MH Thamrin 11
Tanggal: 28/09/2026
---------------------------------
1 Egg McMuffin Combo 36.000
1 Hash Brown 12.000
---------------------------------
Subtotal: 48.000
Pajak Restoran 10%: 4.800
Total: 52.800
`,
    groundTruth: {
      merchantName: 'MCDONALDS SARINAH',
      date: '2026-09-28',
      itemCount: 2,
      subtotal: 48000,
      discount: 0,
      tax: 4800,
      service: 0,
      total: 52800,
    },
  },
  {
    id: 'dev-15',
    type: 'development',
    description: 'Gokana Ramen & Teppan - Potongan Voucher Diskon',
    category: 'discount',
    rawText: `
GOKANA RAMEN & TEPPAN
Cilandak Town Square
01-10-2026
---------------------------------
1 Beef Hot Ramen 46.000
1 Gyoza Goreng 19.000
---------------------------------
Subtotal: 65.000
Potongan Voucher: 15.000
Pajak PB1: 5.000
Grand Total: 55.000
`,
    groundTruth: {
      merchantName: 'GOKANA RAMEN & TEPPAN',
      date: '2026-10-01',
      itemCount: 2,
      subtotal: 65000,
      discount: 15000,
      tax: 5000,
      service: 0,
      total: 55000,
    },
  },
  {
    id: 'dev-16',
    type: 'development',
    description: 'Warung Bu Kris - Spesial Penyet',
    category: 'clear',
    rawText: `
WAROENG BU KRIS
Jl. Fatmawati No 30
Tanggal: 03/10/2026
---------------------------------
1 Ayam Goreng Penyet 28.000
1 Tempe Goreng Penyet 12.000
1 Nasi Putih 7.000
---------------------------------
Subtotal: 47.000
Total: 47.000
`,
    groundTruth: {
      merchantName: 'WAROENG BU KRIS',
      date: '2026-10-03',
      itemCount: 3,
      subtotal: 47000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 47000,
    },
  },
  {
    id: 'dev-17',
    type: 'development',
    description: 'Roti O - Format Simple Bakery',
    category: 'clear',
    rawText: `
ROTI O STASIUN GAMBIR
04/10/2026 10:15
---------------------------------
2x Roti Bun Kopi 26.000
1x Americano Cup 12.000
---------------------------------
Subtotal 38.000
Total 38.000
`,
    groundTruth: {
      merchantName: 'ROTI O STASIUN GAMBIR',
      date: '2026-10-04',
      itemCount: 2,
      subtotal: 38000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 38000,
    },
  },
  {
    id: 'dev-18',
    type: 'development',
    description: 'Dcrepes - Crepes & Minuman',
    category: 'clear',
    rawText: `
DCREPES MALL AMBASSADOR
Tgl: 05-10-2026
---------------------------------
1 Choco Peanut Crepe 22.000
1 Nu Green Tea 8.000
---------------------------------
Subtotal: 30.000
PB1: 3.000
Total: 33.000
`,
    groundTruth: {
      merchantName: 'DCREPES MALL AMBASSADOR',
      date: '2026-10-05',
      itemCount: 2,
      subtotal: 30000,
      discount: 0,
      tax: 3000,
      service: 0,
      total: 33000,
    },
  },
  {
    id: 'dev-19',
    type: 'development',
    description: 'Ayam Geprek Bensu - Paket Pedas',
    category: 'clear',
    rawText: `
AYAM GEPREK BENSU
Cabang Ciputat
Tanggal: 06/10/2026
---------------------------------
2 Paket Geprek Level 3 40.000
1 Jamur Krispi 9.000
---------------------------------
Subtotal: 49.000
Total: 49.000
`,
    groundTruth: {
      merchantName: 'AYAM GEPREK BENSU',
      date: '2026-10-06',
      itemCount: 2,
      subtotal: 49000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 49000,
    },
  },
  {
    id: 'dev-20',
    type: 'development',
    description: 'Point Coffee - Kopi Frappe & Croissant',
    category: 'clear',
    rawText: `
POINT COFFEE INDOMARET
Jl. Gandaria 1
Tanggal: 07-10-2026
---------------------------------
1 Cafe Dolce Iced 25.000
1 Pain Au Chocolat 15.000
---------------------------------
Subtotal: 40.000
Diskon Promo: 5.000
Total: 35.000
`,
    groundTruth: {
      merchantName: 'POINT COFFEE INDOMARET',
      date: '2026-10-07',
      itemCount: 2,
      subtotal: 40000,
      discount: 5000,
      tax: 0,
      service: 0,
      total: 35000,
    },
  },

  // ==========================================
  // EVALUATION DATASET (10 Cases: eval-01 to eval-10)
  // Target: Minimal 8 dari 10 struk jelas evaluasi menghasilkan exact match total
  // ==========================================
  {
    id: 'eval-01',
    type: 'evaluation',
    description: 'HokBen Express - 2 Paket Bento',
    category: 'clear',
    rawText: `
HOKBEN EXPRESS
Stasiun Manggarai
Tgl: 10/10/2026
---------------------------------
1 Simple Set Teriyaki 41.000
1 Tokyo Bowl Chicken 34.000
---------------------------------
Subtotal: 75.000
PB1 (10%): 7.500
Total: 82.500
QRIS: 82.500
`,
    groundTruth: {
      merchantName: 'HOKBEN EXPRESS',
      date: '2026-10-10',
      itemCount: 2,
      subtotal: 75000,
      discount: 0,
      tax: 7500,
      service: 0,
      total: 82500,
    },
  },
  {
    id: 'eval-02',
    type: 'evaluation',
    description: 'KFC Store - Kombo Jagoan Hemat',
    category: 'clear',
    rawText: `
KFC KEMANG RAYA
Jl. Kemang Raya No 5
Date: 12-10-2026
---------------------------------
1 Kombo Jagoan Hemat 45.000
1 Perkedel KFC 9.000
---------------------------------
Sub Total: 54.000
Tax PB1: 5.400
Grand Total: 59.400
`,
    groundTruth: {
      merchantName: 'KFC KEMANG RAYA',
      date: '2026-10-12',
      itemCount: 2,
      subtotal: 54000,
      discount: 0,
      tax: 5400,
      service: 0,
      total: 59400,
    },
  },
  {
    id: 'eval-03',
    type: 'evaluation',
    description: 'Dunkin Donuts - Paket Dozen Diskon',
    category: 'discount',
    rawText: `
DUNKIN DONUTS
Plaza Semanggi
Tanggal: 14/10/2026
---------------------------------
1 Paket 6 Donut 78.000
1 Iced Chocolate 28.000
---------------------------------
Subtotal: 106.000
Diskon Promo BCA: 20.000
Pajak PB1: 8.600
Total: 94.600
`,
    groundTruth: {
      merchantName: 'DUNKIN DONUTS',
      date: '2026-10-14',
      itemCount: 2,
      subtotal: 106000,
      discount: 20000,
      tax: 8600,
      service: 0,
      total: 94600,
    },
  },
  {
    id: 'eval-04',
    type: 'evaluation',
    description: 'Kopi Kenangan - Pesanan Kantor Multi-Item',
    category: 'clear',
    rawText: `
KOPI KENANGAN SCBD
Energy Building Lt 2
15-10-2026
---------------------------------
3 Kopi Kenangan Mantan 54.000
2 Americano Iced 36.000
---------------------------------
Subtotal: 90.000
Total: 90.000
Tunai: 100.000
Kembali: 10.000
`,
    groundTruth: {
      merchantName: 'KOPI KENANGAN SCBD',
      date: '2026-10-15',
      itemCount: 2,
      subtotal: 90000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 90000,
    },
  },
  {
    id: 'eval-05',
    type: 'evaluation',
    description: 'Papparich Resto - Layanan & PB1',
    category: 'clear',
    rawText: `
PAPPARICH RESTAURANT
Pantai Indah Kapuk
Date: 17/10/2026
---------------------------------
1 Nasi Lemak Sambal Sotong 65.000
1 Hainan Chicken Rice 58.000
---------------------------------
Subtotal: 123.000
Biaya Layanan (5%): 6.150
PB1 Pajak (10%): 12.300
Total Tagihan: 141.450
`,
    groundTruth: {
      merchantName: 'PAPPARICH RESTAURANT',
      date: '2026-10-17',
      itemCount: 2,
      subtotal: 123000,
      discount: 0,
      tax: 12300,
      service: 6150,
      total: 141450,
    },
  },
  {
    id: 'eval-06',
    type: 'evaluation',
    description: 'Bebek Kaleyo - Nasi Bebek Hemat',
    category: 'clear',
    rawText: `
BEBEK KALEYO RAWAMANGUN
Jl. Pemuda No 8
Tanggal: 20/10/2026
---------------------------------
2 Bebek Goreng Kremes 76.000
2 Nasi Uduk Gurih 16.000
---------------------------------
Subtotal: 92.000
PB1 10%: 9.200
Total: 101.200
`,
    groundTruth: {
      merchantName: 'BEBEK KALEYO RAWAMANGUN',
      date: '2026-10-20',
      itemCount: 2,
      subtotal: 92000,
      discount: 0,
      tax: 9200,
      service: 0,
      total: 101200,
    },
  },
  {
    id: 'eval-07',
    type: 'evaluation',
    description: 'Yoshinoya Japanese Beef Bowl',
    category: 'clear',
    rawText: `
YOSHINOYA PACIFIC PLACE
Level 4 No 12
22-10-2026
---------------------------------
1 Original Beef Bowl Reguler 52.000
1 Red Hot Chili Crispy 18.000
---------------------------------
Subtotal: 70.000
Diskon Promo Voucher: 10.000
Pajak PB1: 6.000
Total: 66.000
`,
    groundTruth: {
      merchantName: 'YOSHINOYA PACIFIC PLACE',
      date: '2026-10-22',
      itemCount: 2,
      subtotal: 70000,
      discount: 10000,
      tax: 6000,
      service: 0,
      total: 66000,
    },
  },
  {
    id: 'eval-08',
    type: 'evaluation',
    description: 'Ta Wan Restaurant - Bubur & Dimsum',
    category: 'clear',
    rawText: `
TA WAN RESTAURANT
Mall Kelapa Gading 3
Date: 25/10/2026
---------------------------------
1 Bubur Ayam Phitan Large 38.000
1 Siomay Goreng 24.000
---------------------------------
Subtotal: 62.000
Service 5%: 3.100
Pajak PB1 10%: 6.200
Total: 71.300
`,
    groundTruth: {
      merchantName: 'TA WAN RESTAURANT',
      date: '2026-10-25',
      itemCount: 2,
      subtotal: 62000,
      discount: 0,
      tax: 6200,
      service: 3100,
      total: 71300,
    },
  },
  {
    id: 'eval-09',
    type: 'evaluation',
    description: 'Struk Sedikit Noise/Buram (Simulasi OCR Tinta Pudar)',
    category: 'blurry',
    rawText: `
WARUNG KOPI OPA
Tgl 28/10/2026
~..~..~..~..~..~
1x Kopi Hitam Tubruk 12.000
1x Pisang Goreng Keju 18.000
----------------
Subtotal: 30.000
Total: 30.000
`,
    groundTruth: {
      merchantName: 'WARUNG KOPI OPA',
      date: '2026-10-28',
      itemCount: 2,
      subtotal: 30000,
      discount: 0,
      tax: 0,
      service: 0,
      total: 30000,
    },
  },
  {
    id: 'eval-10',
    type: 'evaluation',
    description: 'Struk dengan Format Angka Koma Desimal & Simbol',
    category: 'complex_number',
    rawText: `
BAKERMAN ASHTA
District 8 SCBD
Date: 30-10-2026
---------------------------------
1 Truffle Croissant Rp 45.000,00
1 Hot Latte Rp 38.000,00
---------------------------------
Subtotal: Rp 83.000,00
Service Charge: Rp 4.150,00
Pajak PB1: Rp 8.300,00
Grand Total: Rp 95.450,00
`,
    groundTruth: {
      merchantName: 'BAKERMAN ASHTA',
      date: '2026-10-30',
      itemCount: 2,
      subtotal: 83000,
      discount: 0,
      tax: 8300,
      service: 4150,
      total: 95450,
    },
  },
];
