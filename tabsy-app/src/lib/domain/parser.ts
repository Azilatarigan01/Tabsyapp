import { ExpenseCategory } from '@/types';

export interface QuickParseResult {
  raw: string;
  description: string;
  amountRupiah: number | null;
  suggestedCategory?: ExpenseCategory;
  isValid: boolean;
}

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  makan: ['kopi', 'coffee', 'nasi', 'mie', 'bakso', 'ayam', 'sate', 'makan', 'minum', 'snack', 'cafe', 'teh', 'boba', 'roti', 'sarapan', 'lunch', 'dinner'],
  transport: ['bensin', 'pertalite', 'pertamax', 'parkir', 'ojol', 'gojek', 'grab', 'maxim', 'tol', 'kereta', 'krl', 'mrt', 'bus', 'angkot'],
  belanja: ['pasar', 'indomaret', 'alfamart', 'supermarket', 'baju', 'kaos', 'sepatu', 'tas', 'skincare', 'sabun', 'shampoo'],
  tagihan: ['wifi', 'listrik', 'pln', 'air', 'pdam', 'pulsa', 'kuota', 'sewa', 'kos', 'kontrakan', 'iuran', 'bpjs'],
  hiburan: ['nonton', 'bioskop', 'game', 'steam', 'netflix', 'spotify', 'karaoke', 'wisata', 'liburan'],
  kesehatan: ['obat', 'apotek', 'dokter', 'klinik', 'vitamin', 'masker'],
  pendidikan: ['buku', 'kursus', 'fotocopy', 'print', 'alat tulis', 'pulpen', 'kuliah', 'spp'],
  lainnya: [],
};

export function suggestCategory(description: string): ExpenseCategory {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category as ExpenseCategory;
    }
  }
  return 'makan'; // Default category for quick expenses if unspecified
}

export function parseQuickInput(input: string): QuickParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { raw: input, description: '', amountRupiah: null, isValid: false };
  }

  // Regex patterns to capture amounts with k, rb, ribu, jt, juta, or plain numbers
  // Examples: "25k", "25.5k", "5rb", "5 ribu", "25000", "25.000", "1.5jt"
  // Look for amount at the end or anywhere with suffix
  const patterns = [
    // Number with suffix: 25k, 25.5k, 5rb, 5 ribu, 1.5jt, 2 juta
    /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta)(?:\s|$)/i,
    // Formatted rupiah like 25.000 or 150.000
    /(?:^|\s)(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+)(?:\s|$)/i,
    // Plain number like 25000 or 5000 (at least 3 digits or explicitly standalone number)
    /(?:^|\s)(?:rp\.?\s*)?(\d{3,9})(?:\s|$)/i,
    // Smaller plain numbers at end: e.g. "parkir 2000" or "permen 500"
    /(?:^|\s)(?:rp\.?\s*)?(\d+)(?:\s|$)/i,
  ];

  let detectedAmount: number | null = null;
  let remainingText = trimmed;

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const fullMatch = match[0];
      const suffix = (match[2] || '').toLowerCase();
      let numStr = match[1];
      if (suffix) {
        // Decimal with suffix: 18.5k or 18,5k -> 18.5
        numStr = numStr.replace(',', '.');
      } else {
        // Thousands separator without suffix: 25.000 -> 25000
        numStr = numStr.replace(/\./g, '').replace(',', '.');
      }

      let val = parseFloat(numStr);
      if (isNaN(val)) continue;

      if (suffix === 'k' || suffix === 'rb' || suffix === 'ribu') {
        val = Math.round(val * 1000);
      } else if (suffix === 'jt' || suffix === 'juta') {
        val = Math.round(val * 1000000);
      } else {
        val = Math.round(val);
      }

      if (val > 0 && Number.isSafeInteger(val) && val <= 1000000000) {
        detectedAmount = val;
        // Remove the matched amount token from description
        remainingText = (trimmed.slice(0, match.index!) + ' ' + trimmed.slice(match.index! + fullMatch.length)).trim();
        // Clean up double spaces
        remainingText = remainingText.replace(/\s+/g, ' ');
        break;
      }
    }
  }

  // If no remaining text, description might be empty
  const description = remainingText.slice(0, 100).trim();
  const suggested = description ? suggestCategory(description) : undefined;

  return {
    raw: input,
    description,
    amountRupiah: detectedAmount,
    suggestedCategory: suggested,
    isValid: Boolean(description && detectedAmount && detectedAmount > 0),
  };
}
