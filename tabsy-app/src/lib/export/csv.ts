import { Transaction, CATEGORIES } from '@/types';

export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

  // CSV headers: Tanggal, Deskripsi, Kategori, Nominal (Rp), Dibuat Pada
  const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Nominal', 'ID Transaksi'];

  const rows = transactions.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    `"${categoryMap[t.category] || t.category}"`,
    t.amountRupiah,
    t.id,
  ]);

  // Prepend UTF-8 BOM so Excel opens UTF-8 Indonesian accents cleanly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `catatcepat_transaksi_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
