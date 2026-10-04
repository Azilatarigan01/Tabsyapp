import { describe, it, expect } from 'vitest';
import { parseQuickInput, suggestCategory } from '../parser';
import { calculateSplitBill, formatRupiah } from '../calculator';

describe('Domain: Quick Input Parser (F02)', () => {
  it('parses "kopi 25k" correctly', () => {
    const result = parseQuickInput('kopi 25k');
    expect(result.isValid).toBe(true);
    expect(result.description.toLowerCase()).toBe('kopi');
    expect(result.amountRupiah).toBe(25000);
    expect(result.suggestedCategory).toBe('makan');
  });

  it('parses "nasi 25000" correctly', () => {
    const result = parseQuickInput('nasi 25000');
    expect(result.isValid).toBe(true);
    expect(result.description.toLowerCase()).toBe('nasi');
    expect(result.amountRupiah).toBe(25000);
    expect(result.suggestedCategory).toBe('makan');
  });

  it('parses "parkir 5rb" correctly', () => {
    const result = parseQuickInput('parkir 5rb');
    expect(result.isValid).toBe(true);
    expect(result.description.toLowerCase()).toBe('parkir');
    expect(result.amountRupiah).toBe(5000);
    expect(result.suggestedCategory).toBe('transport');
  });

  it('handles formatted rupiah "bensin 20.000"', () => {
    const result = parseQuickInput('bensin 20.000');
    expect(result.isValid).toBe(true);
    expect(result.description.toLowerCase()).toBe('bensin');
    expect(result.amountRupiah).toBe(20000);
    expect(result.suggestedCategory).toBe('transport');
  });

  it('handles decimal "kopi 18.5k"', () => {
    const result = parseQuickInput('kopi 18.5k');
    expect(result.isValid).toBe(true);
    expect(result.amountRupiah).toBe(18500);
  });
});

describe('Domain: Split Bill Calculator (F05)', () => {
  it('PRD Acceptance Test: Rp100.000 subtotal, 10% tax, 5% service, 3 participants', () => {
    const result = calculateSplitBill({
      subtotal: 100000,
      taxType: 'percent',
      taxValue: 10,
      serviceType: 'percent',
      serviceValue: 5,
      participants: ['A', 'B', 'C'],
    });

    expect(result.subtotal).toBe(100000);
    expect(result.taxAmount).toBe(10000);
    expect(result.serviceAmount).toBe(5000);
    expect(result.total).toBe(115000);

    // Sum of shares must equal total
    const sumShares = result.shares.reduce((acc, cur) => acc + cur.finalAmount, 0);
    expect(sumShares).toBe(115000);

    // Participant A gets remainder (38.334), B and C get base (38.333)
    expect(result.shares[0].name).toBe('A');
    expect(result.shares[0].finalAmount).toBe(38334);

    expect(result.shares[1].name).toBe('B');
    expect(result.shares[1].finalAmount).toBe(38333);

    expect(result.shares[2].name).toBe('C');
    expect(result.shares[2].finalAmount).toBe(38333);
  });

  it('formats Rupiah correctly', () => {
    expect(formatRupiah(115000)).toBe('Rp115.000');
    expect(formatRupiah(25000)).toBe('Rp25.000');
  });
});
