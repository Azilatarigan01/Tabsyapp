import { Transaction, CATEGORIES } from '@/types';

/**
 * Sanitize cell values against CSV/Spreadsheet Formula Injection
 * Prepends a single quote if string starts with dangerous characters (=, +, -, @, \t, \r)
 */
export function sanitizeCSVCell(value: string): string {
  let cleaned = value.replace(/\r\n|\r|\n/g, ' '); // Replace newlines with spaces
  const dangerousPrefixes = ['=', '+', '-', '@', '\t'];

  if (dangerousPrefixes.some((p) => cleaned.startsWith(p))) {
    cleaned = `'${cleaned}`;
  }

  // Escape double quotes by doubling them
  return `"${cleaned.replace(/"/g, '""')}"`;
}

export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

  // CSV headers
  const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Nominal (Rp)', 'ID Transaksi', 'Dibuat Pada'];

  const rows = transactions.map((t) => [
    t.date,
    sanitizeCSVCell(t.description),
    sanitizeCSVCell(categoryMap[t.category] || t.category),
    t.amountRupiah,
    sanitizeCSVCell(t.id),
    t.createdAt,
  ]);

  // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows/Mac opens UTF-8 Indonesian accents cleanly
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
