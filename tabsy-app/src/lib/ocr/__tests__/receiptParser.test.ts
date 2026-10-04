import { describe, it, expect } from 'vitest';
import {
  parseReceiptNumber,
  extractReceiptDate,
  extractMerchantName,
  extractReceiptItems,
  extractFinancialFields,
  parseReceiptText,
} from '../receiptParser';
import { validateReceiptImageFile } from '../imagePreprocess';
import { RECEIPT_DATASET } from '../receiptDataset';

describe('Receipt OCR Parser & Domain Logic', () => {
  describe('parseReceiptNumber', () => {
    it('handles Indonesian dot-separated thousands: 25.000 -> 25000', () => {
      expect(parseReceiptNumber('25.000')).toBe(25000);
      expect(parseReceiptNumber('1.250.000')).toBe(1250000);
    });

    it('handles comma-separated thousands: 25,000 -> 25000', () => {
      expect(parseReceiptNumber('25,000')).toBe(25000);
    });

    it('handles currency prefix and cents: Rp 45.000,00 -> 45000', () => {
      expect(parseReceiptNumber('Rp 45.000,00')).toBe(45000);
      expect(parseReceiptNumber('IDR 50.000.00')).toBe(50000);
    });

    it('handles discount with negative sign or parenthesis: -5.000 or (5.000) -> 5000', () => {
      expect(parseReceiptNumber('-5.000')).toBe(5000);
      expect(parseReceiptNumber('(5.000)')).toBe(5000);
    });

    it('returns 0 for empty or invalid string', () => {
      expect(parseReceiptNumber('')).toBe(0);
      expect(parseReceiptNumber('   ')).toBe(0);
    });
  });

  describe('extractReceiptDate', () => {
    it('detects DD/MM/YYYY format: 12/03/2026 -> 2026-03-12', () => {
      expect(extractReceiptDate('Tanggal: 12/03/2026')).toBe('2026-03-12');
    });

    it('detects DD-MM-YYYY format: 24-04-2026 -> 2026-04-24', () => {
      expect(extractReceiptDate('Date: 24-04-2026 14:30')).toBe('2026-04-24');
    });

    it('detects YYYY-MM-DD format: 2026-05-10 -> 2026-05-10', () => {
      expect(extractReceiptDate('Tgl: 2026-05-10')).toBe('2026-05-10');
    });

    it('detects named month: 25 Jan 2026 -> 2026-01-25', () => {
      expect(extractReceiptDate('Waktu: 25 Jan 2026')).toBe('2026-01-25');
    });

    it('returns empty string if no date detected', () => {
      expect(extractReceiptDate('No date here at all')).toBe('');
    });
  });

  describe('File Validation & Constraints', () => {
    it('accepts valid JPEG, PNG, and WebP files under 5MB', () => {
      const validJpeg = new File([new ArrayBuffer(1024)], 'struk.jpg', { type: 'image/jpeg' });
      const validPng = new File([new ArrayBuffer(1024)], 'struk.png', { type: 'image/png' });
      const validWebp = new File([new ArrayBuffer(1024)], 'struk.webp', { type: 'image/webp' });

      expect(validateReceiptImageFile(validJpeg).valid).toBe(true);
      expect(validateReceiptImageFile(validPng).valid).toBe(true);
      expect(validateReceiptImageFile(validWebp).valid).toBe(true);
    });

    it('rejects PDF and HEIC with specific conversion instructions', () => {
      const pdf = new File([new ArrayBuffer(1024)], 'invoice.pdf', { type: 'application/pdf' });
      const heic = new File([new ArrayBuffer(1024)], 'photo.heic', { type: 'image/heic' });

      const pdfRes = validateReceiptImageFile(pdf);
      expect(pdfRes.valid).toBe(false);
      expect(pdfRes.isUnsupportedHeicOrPdf).toBe(true);
      expect(pdfRes.error).toContain('PDF dan HEIC');

      const heicRes = validateReceiptImageFile(heic);
      expect(heicRes.valid).toBe(false);
      expect(heicRes.isUnsupportedHeicOrPdf).toBe(true);
    });

    it('rejects files larger than 5MB', () => {
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
      const res = validateReceiptImageFile(largeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Ukuran file terlalu besar');
    });
  });

  describe('Reconciliation & Math Verification', () => {
    it('flags reconciled when calculated matches printed total', () => {
      const sampleText = `
MIE GACOAN
Tanggal: 01/07/2026
1 Mie Hompimpa 10.000
1 Es Genderuwo 5.000
Subtotal: 15.000
Total: 15.000
`;
      const res = parseReceiptText(sampleText);
      expect(res.total).toBe(15000);
      expect(res.calculatedTotal).toBe(15000);
      expect(res.isReconciled).toBe(true);
      expect(res.discrepancy).toBe(0);
    });

    it('flags discrepancy when calculated total does not match printed total', () => {
      const sampleText = `
CAFE ERROR
Tanggal: 01/07/2026
1 Kopi Susu 10.000
Subtotal: 10.000
Total: 12.000
`;
      const res = parseReceiptText(sampleText);
      expect(res.total).toBe(12000);
      expect(res.calculatedTotal).toBe(10000);
      expect(res.isReconciled).toBe(false);
      expect(res.discrepancy).toBe(-2000);
    });
  });

  // ==========================================
  // 30 RECEIPT BENCHMARK EVALUATION
  // ==========================================
  describe('Dataset Evaluation: 20 Development Receipts', () => {
    const devCases = RECEIPT_DATASET.filter((c) => c.type === 'development');

    it('has exactly 20 development cases', () => {
      expect(devCases.length).toBe(20);
    });

    devCases.forEach((receiptCase) => {
      it(`matches exact total for [${receiptCase.id}] ${receiptCase.description}`, () => {
        const parsed = parseReceiptText(receiptCase.rawText);
        expect(parsed.total).toBe(receiptCase.groundTruth.total);
        if (receiptCase.groundTruth.discount > 0) {
          expect(parsed.discount).toBe(receiptCase.groundTruth.discount);
        }
        if (receiptCase.groundTruth.tax > 0) {
          expect(parsed.tax).toBe(receiptCase.groundTruth.tax);
        }
      });
    });
  });

  describe('Dataset Evaluation: 10 Evaluation Receipts', () => {
    const evalCases = RECEIPT_DATASET.filter((c) => c.type === 'evaluation');

    it('has exactly 10 evaluation cases', () => {
      expect(evalCases.length).toBe(10);
    });

    it('achieves exact match on at least 8 of 10 evaluation receipts (Requirement: >= 80%)', () => {
      let exactMatches = 0;
      const details: Array<{ id: string; expected: number; actual: number; matched: boolean }> = [];

      for (const c of evalCases) {
        const parsed = parseReceiptText(c.rawText);
        const matched = parsed.total === c.groundTruth.total;
        if (matched) exactMatches++;
        details.push({
          id: c.id,
          expected: c.groundTruth.total,
          actual: parsed.total,
          matched,
        });
      }

      console.log('Evaluation Results Summary:', {
        totalCases: evalCases.length,
        exactMatches,
        accuracyRate: `${(exactMatches / evalCases.length) * 100}%`,
        details,
      });

      // Target: minimal 8 dari 10 struk jelas evaluasi
      expect(exactMatches).toBeGreaterThanOrEqual(8);
    });
  });
});
