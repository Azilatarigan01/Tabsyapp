import { ExpenseCategory } from '@/types';

export interface QuickParseResult {
  raw: string;
  description: string;
  amountRupiah: number | null;
  suggestedCategory?: ExpenseCategory;
  isValid: boolean;
  ambiguousReason?: string;
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
  return 'makan';
}

export function parseQuickInput(input: string): QuickParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { raw: input, description: '', amountRupiah: null, isValid: false };
  }

  // Check for ambiguous pattern: numbers with only 1 or 2 digits after dot without suffix (e.g. 25.00 or 25.5 without k)
  // Indonesian thousands separator requires groups of 3 digits: e.g. 25.000 or 1.500.000
  const ambiguousDecimalDot = /(?:^|\s)(\d+\.\d{1,2})(?:\s|$)(?!k|rb|ribu|jt|juta)/i;
  if (ambiguousDecimalDot.test(trimmed)) {
    return {
      raw: input,
      description: trimmed,
      amountRupiah: null,
      isValid: false,
      ambiguousReason: 'Format nominal ambigu (separator ribuan harus 3 digit, contoh: 25.000 atau 25k).',
    };
  }

  // Regex patterns to capture amounts
  // 1. With suffix: 25k, 25.5k, 25,5k, 5rb, 5 ribu, 1.5jt
  const suffixPattern = /(?<=\s|^)(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta)(?=\s|$)/gi;
  // 2. Formatted thousands: 25.000, 150.000, 1.000.000
  const thousandsPattern = /(?<=\s|^)(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+)(?=\s|$)/gi;
  // 3. Plain standalone integer (3 to 9 digits): 25000, 5000, 500
  const plainIntPattern = /(?<=\s|^)(?:rp\.?\s*)?(\b\d{3,9}\b)(?=\s|$)/gi;

  const detectedMatches: { rawMatch: string; value: number }[] = [];

  // Match suffixes
  let m: RegExpExecArray | null;
  while ((m = suffixPattern.exec(trimmed)) !== null) {
    const rawMatch = m[0];
    let numStr = m[1].replace(',', '.');
    const suffix = (m[2] || '').toLowerCase();
    let val = parseFloat(numStr);
    if (!isNaN(val)) {
      if (suffix === 'k' || suffix === 'rb' || suffix === 'ribu') val = Math.round(val * 1000);
      else if (suffix === 'jt' || suffix === 'juta') val = Math.round(val * 1000000);
      if (val > 0 && Number.isSafeInteger(val) && val <= 1000000000) {
        detectedMatches.push({ rawMatch, value: val });
      }
    }
  }

  // Match formatted thousands (only if no suffix match already)
  if (detectedMatches.length === 0) {
    while ((m = thousandsPattern.exec(trimmed)) !== null) {
      const rawMatch = m[0];
      const numStr = m[1].replace(/\./g, '');
      const val = parseInt(numStr, 10);
      if (!isNaN(val) && val > 0 && Number.isSafeInteger(val) && val <= 1000000000) {
        detectedMatches.push({ rawMatch, value: val });
      }
    }
  }

  // Match plain integers (only if no matches yet)
  if (detectedMatches.length === 0) {
    while ((m = plainIntPattern.exec(trimmed)) !== null) {
      const rawMatch = m[0];
      const val = parseInt(m[1], 10);
      if (!isNaN(val) && val > 0 && Number.isSafeInteger(val) && val <= 1000000000) {
        detectedMatches.push({ rawMatch, value: val });
      }
    }
  }

  // Reject ambiguous inputs with multiple distinct amounts (e.g. "kopi 25k 30k")
  if (detectedMatches.length > 1) {
    const values = new Set(detectedMatches.map((d) => d.value));
    if (values.size > 1) {
      return {
        raw: input,
        description: trimmed,
        amountRupiah: null,
        isValid: false,
        ambiguousReason: 'Terdapat lebih dari satu nominal dalam satu input. Harap masukkan satu transaksi.',
      };
    }
  }

  if (detectedMatches.length === 0) {
    return { raw: input, description: trimmed, amountRupiah: null, isValid: false };
  }

  const chosen = detectedMatches[0];
  let remainingText = trimmed.replace(chosen.rawMatch, ' ').trim();
  remainingText = remainingText.replace(/\s+/g, ' ').slice(0, 100);

  const suggested = remainingText ? suggestCategory(remainingText) : undefined;

  return {
    raw: input,
    description: remainingText,
    amountRupiah: chosen.value,
    suggestedCategory: suggested,
    isValid: Boolean(remainingText && chosen.value > 0),
  };
}
