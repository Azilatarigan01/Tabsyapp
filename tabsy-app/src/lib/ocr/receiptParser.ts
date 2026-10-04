import { ReceiptItem, ReceiptParseResult } from '@/types/ocr';

/**
 * Normalizes number string from Indonesian / International receipts.
 * Handles dots and commas:
 * - "25.000" -> 25000
 * - "25,000" -> 25000
 * - "18.500,00" -> 18500
 * - "18,500.00" -> 18500
 * - "(5.000)" -> 5000 (discounts)
 * - "-5.000" -> 5000
 */
export function parseReceiptNumber(raw: string): number {
  if (!raw) return 0;
  let clean = raw.trim();

  // Strip currency prefixes and parenthesis
  clean = clean.replace(/^[-\(]?\s*(?:Rp|IDR)?\s*/i, '');
  clean = clean.replace(/[\)\s]/g, '');

  if (!clean) return 0;

  // Handle decimal cents like .00 or ,00 at the end
  if (/[,\.]00$/.test(clean)) {
    clean = clean.slice(0, -3);
  }

  // If format is like 25.000 or 1.250.000
  if (/^\d{1,3}(?:\.\d{3})+$/.test(clean)) {
    return parseInt(clean.replace(/\./g, ''), 10);
  }

  // If format is like 25,000 or 1,250,000
  if (/^\d{1,3}(?:,\d{3})+$/.test(clean)) {
    return parseInt(clean.replace(/,/g, ''), 10);
  }

  // Plain integers like 25000
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }

  // General fallback: replace all non-digits
  const onlyDigits = clean.replace(/\D/g, '');
  if (!onlyDigits) return 0;
  return parseInt(onlyDigits, 10);
}

/**
 * Parse date from receipt text
 */
export function extractReceiptDate(text: string): string {
  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dateRegexDmy = /\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.](20\d\d|\d\d)\b/;
  const matchDmy = text.match(dateRegexDmy);
  if (matchDmy) {
    let day = matchDmy[1].padStart(2, '0');
    let month = matchDmy[2].padStart(2, '0');
    let year = matchDmy[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Pattern 2: YYYY/MM/DD or YYYY-MM-DD
  const dateRegexYmd = /\b(20\d\d)[\/\-\.](0?[1-9]|1[012])[\/\-\.](0?[1-9]|[12]\d|3[01])\b/;
  const matchYmd = text.match(dateRegexYmd);
  if (matchYmd) {
    let year = matchYmd[1];
    let month = matchYmd[2].padStart(2, '0');
    let day = matchYmd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Pattern 3: DD Mon YYYY (e.g., 25 Jan 2026, 05 Okt 2026)
  const monthMap: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    mei: '05',
    may: '05',
    jun: '06',
    jul: '07',
    agu: '08',
    aug: '08',
    sep: '09',
    okt: '10',
    oct: '10',
    nop: '11',
    nov: '11',
    des: '12',
    dec: '12',
  };

  const textLower = text.toLowerCase();
  const dateRegexNamed = /\b(0?[1-9]|[12]\d|3[01])\s+([a-z]{3,9})\s+(20\d\d)\b/i;
  const matchNamed = textLower.match(dateRegexNamed);
  if (matchNamed) {
    const day = matchNamed[1].padStart(2, '0');
    const monthStr = matchNamed[2].slice(0, 3);
    const year = matchNamed[3];
    if (monthMap[monthStr]) {
      return `${year}-${monthMap[monthStr]}-${day}`;
    }
  }

  return ''; // Empty if not detected
}

/**
 * Extracts merchant name from the header lines of the receipt
 */
export function extractMerchantName(lines: string[]): string {
  const ignoreKeywords = [
    'telp',
    'phone',
    'fax',
    'jl.',
    'jalan',
    'street',
    'kota',
    'struk',
    'receipt',
    'bill',
    'invoice',
    'cashier',
    'kasir',
    'tanggal',
    'date',
    'meja',
    'table',
    'npwp',
    'pajak',
    'waktu',
    'time',
    'pos',
    'order',
    'pembayaran',
    'welcome',
    'selamat datang',
  ];

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.length < 3) continue;

    const lower = rawLine.toLowerCase();
    const hasIgnored = ignoreKeywords.some((kw) => lower.includes(kw));
    // If line is mostly numbers or symbols, skip
    if (hasIgnored || /^[0-9\W]+$/.test(rawLine)) {
      continue;
    }

    // Clean up decorative symbols like === or ***
    const cleaned = rawLine.replace(/^[=*\-_#\s]+|[=*\-_#\s]+$/g, '').trim();
    if (cleaned.length >= 3) {
      return cleaned;
    }
  }

  return '';
}

/**
 * Checks if a line is a summary/total line that shouldn't be parsed as an item
 */
function isSummaryOrFooterLine(line: string): boolean {
  const lower = line.toLowerCase();
  const keywords = [
    'subtotal',
    'sub total',
    'total',
    'grand total',
    'diskon',
    'discount',
    'promo',
    'potongan',
    'pajak',
    'tax',
    'pb1',
    'ppn',
    'service',
    'servis',
    'tunai',
    'cash',
    'kembali',
    'change',
    'kembalian',
    'qris',
    'debit',
    'kartu',
    'card',
    'bca',
    'mandiri',
    'terima kasih',
    'thank you',
    'wifi',
    'password',
    'pin',
    'kasir',
    'cashier',
    'meja',
    'table',
    'dine in',
    'take away',
  ];

  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Extracts line items from receipt text
 */
export function extractReceiptItems(lines: string[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  let currentItemCandidate: { name: string; lineIndex: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if we hit the summary section
    if (isSummaryOrFooterLine(line)) {
      // Check if this line is specifically Subtotal/Total/Tax/Discount
      const lower = line.toLowerCase();
      if (
        lower.startsWith('subtotal') ||
        lower.startsWith('sub total') ||
        lower.startsWith('total') ||
        lower.startsWith('grand total')
      ) {
        break; // Stop parsing items once total section begins
      }
    }

    // Pattern 1: Multi-line quantity/price e.g.:
    // Line 1: "Nasi Goreng Spesial"
    // Line 2: "2 x 25.000 = 50.000" or "2 @ 25.000" or "2 x 25.000"
    const multiLineMatch = line.match(/^(\d+)\s*(?:x|@)\s*([\d\.,]+)(?:\s*=\s*([\d\.,]+))?/i);
    if (multiLineMatch && currentItemCandidate) {
      const qty = parseInt(multiLineMatch[1], 10);
      const unitPrice = parseReceiptNumber(multiLineMatch[2]);
      const lineTotal = multiLineMatch[3] ? parseReceiptNumber(multiLineMatch[3]) : qty * unitPrice;

      if (qty > 0 && unitPrice > 0) {
        items.push({
          id: `item-${items.length + 1}-${Date.now()}`,
          name: currentItemCandidate.name,
          quantity: qty,
          price: unitPrice,
          total: lineTotal || qty * unitPrice,
        });
        currentItemCandidate = null;
        continue;
      }
    }

    // Pattern 2: Single line with quantity prefix: "2x Ayam Bakar 35.000" or "2 Ayam Bakar 70.000"
    const singleLineWithQtyMatch = line.match(/^(\d+)\s*(?:x\s*)?([a-zA-Z0-9\s\.\-_&']{2,})\s+([\d\.,]{4,})$/i);
    if (singleLineWithQtyMatch) {
      const qty = parseInt(singleLineWithQtyMatch[1], 10);
      const name = singleLineWithQtyMatch[2].trim();
      const amount = parseReceiptNumber(singleLineWithQtyMatch[3]);

      if (!isSummaryOrFooterLine(name) && amount > 0 && qty > 0) {
        // If amount is total, compute unit price
        const unitPrice = Math.round(amount / qty);
        items.push({
          id: `item-${items.length + 1}-${Date.now()}`,
          name,
          quantity: qty,
          price: unitPrice,
          total: amount,
        });
        currentItemCandidate = null;
        continue;
      }
    }

    // Pattern 3: Single line without qty (implied 1x): "Es Teh Manis 5.000"
    const singleLineMatch = line.match(/^([a-zA-Z0-9\s\.\-_&']{2,})\s+([\d\.,]{4,})$/i);
    if (singleLineMatch) {
      const name = singleLineMatch[1].trim();
      const amount = parseReceiptNumber(singleLineMatch[2]);

      if (!isSummaryOrFooterLine(name) && amount > 0) {
        items.push({
          id: `item-${items.length + 1}-${Date.now()}`,
          name,
          quantity: 1,
          price: amount,
          total: amount,
        });
        currentItemCandidate = null;
        continue;
      }
    }

    // If it's a potential item name on its own line
    if (!isSummaryOrFooterLine(line) && line.length > 2 && !/^\d+$/.test(line)) {
      currentItemCandidate = { name: line, lineIndex: i };
    }
  }

  return items;
}

/**
 * Extracts numeric financial fields: Subtotal, Discount, Tax, Service, and Total
 */
export function extractFinancialFields(lines: string[]): {
  subtotal: number;
  discount: number;
  tax: number;
  service: number;
  total: number;
} {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  let service = 0;
  let total = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // 1. Discount (Diskon, Promo, Voucher, Potongan)
    if (
      lower.includes('diskon') ||
      lower.includes('discount') ||
      lower.includes('promo') ||
      lower.includes('potongan') ||
      lower.includes('voucher') ||
      lower.includes('hemat')
    ) {
      const numMatch = line.match(/[-\(]?\s*(?:Rp|IDR)?\s*([\d\.,]{3,})\)?/i);
      if (numMatch) {
        const val = parseReceiptNumber(numMatch[1]);
        if (val > 0) discount = val;
      }
      continue;
    }

    // 2. Tax (Pajak, Tax, PPN, PB1, PB 1)
    if (
      lower.includes('tax') ||
      lower.includes('pajak') ||
      lower.includes('ppn') ||
      lower.includes('pb1') ||
      lower.includes('pb 1')
    ) {
      const numMatch = line.match(/(?:Rp|IDR)?\s*([\d\.,]{3,})/i);
      if (numMatch) {
        const val = parseReceiptNumber(numMatch[1]);
        if (val > 0) tax = val;
      }
      continue;
    }

    // 3. Service (Service, Servis, Layanan)
    if (
      lower.includes('service') ||
      lower.includes('servis') ||
      lower.includes('layanan') ||
      lower.includes('service charge')
    ) {
      const numMatch = line.match(/(?:Rp|IDR)?\s*([\d\.,]{3,})/i);
      if (numMatch) {
        const val = parseReceiptNumber(numMatch[1]);
        if (val > 0) service = val;
      }
      continue;
    }

    // 4. Subtotal (Subtotal, Sub Total, Jumlah Jual, Sub-total)
    if (
      lower.startsWith('subtotal') ||
      lower.startsWith('sub total') ||
      lower.startsWith('sub-total') ||
      lower.includes('subtotal') ||
      lower.includes('sub total')
    ) {
      const numMatch = line.match(/(?:Rp|IDR)?\s*([\d\.,]{3,})/i);
      if (numMatch) {
        const val = parseReceiptNumber(numMatch[1]);
        if (val > 0) subtotal = val;
      }
      continue;
    }

    // 5. Grand Total (Total, Grand Total, Total Bayar, Tagihan, Net Total)
    if (
      (lower.includes('total') || lower.includes('tagihan') || lower.includes('net total')) &&
      !lower.includes('sub') &&
      !lower.includes('item') &&
      !lower.includes('qty') &&
      !lower.includes('tunai') &&
      !lower.includes('kembali')
    ) {
      const numMatch = line.match(/(?:Rp|IDR)?\s*([\d\.,]{3,})/i);
      if (numMatch) {
        const val = parseReceiptNumber(numMatch[1]);
        if (val > 0) total = val;
      }
      continue;
    }
  }

  return { subtotal, discount, tax, service, total };
}

/**
 * Main parser function to convert raw OCR receipt text to ReceiptParseResult
 */
export function parseReceiptText(rawText: string, confidenceScore?: number): ReceiptParseResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const merchantName = extractMerchantName(lines);
  const date = extractReceiptDate(rawText);
  const items = extractReceiptItems(lines);
  const financial = extractFinancialFields(lines);

  let subtotal = financial.subtotal;
  const itemsSum = items.reduce((sum, item) => sum + item.total, 0);

  // If subtotal was not explicitly found on receipt, default to items sum
  if (subtotal === 0 && itemsSum > 0) {
    subtotal = itemsSum;
  }

  // Calculated total: items sum - discount + tax + service
  const calculatedTotal = Math.max(0, (itemsSum > 0 ? itemsSum : subtotal) - financial.discount + financial.tax + financial.service);

  // If printed total wasn't detected, but calculatedTotal > 0, we can report discrepancy against 0
  const printedTotal = financial.total;
  const discrepancy = printedTotal > 0 ? calculatedTotal - printedTotal : 0;
  const isReconciled = printedTotal > 0 ? discrepancy === 0 : false;

  return {
    merchantName,
    date,
    items,
    subtotal,
    discount: financial.discount,
    tax: financial.tax,
    service: financial.service,
    total: printedTotal,
    calculatedTotal,
    discrepancy,
    isReconciled,
    rawText,
    confidenceScore,
  };
}
