import { describe, it, expect } from 'vitest';
import { calculateSafeToSpendToday, calculateDaysToPayday } from '../safeToSpend';

describe('Dynamic Safe-to-Spend Today', () => {
  it('calculates correct daily quota and remaining today', () => {
    // Sisa anggaran 1.700.000, 20 hari tersisa -> Kuota harian = 85.000
    // Belanja hari ini 35.000 -> Sisa hari ini = 50.000 (status: safe)
    const result = calculateSafeToSpendToday({
      monthlyBudget: 3000000,
      totalSpentMonth: 1300000, // Sisa = 1.700.000
      spentToday: 35000,
      paydayDate: 25,
      currentDate: new Date('2026-10-05T00:00:00Z'), // 20 days until 25th
    });

    expect(result.remainingBudgetTotal).toBe(1700000);
    expect(result.daysRemainingToPayday).toBe(20);
    expect(result.dailySafeQuota).toBe(85000); // 1.700.000 / 20 = 85.000
    expect(result.remainingQuotaToday).toBe(50000); // 85.000 - 35.000
    expect(result.status).toBe('safe');
  });

  it('detects overspending and warns about shrunk future daily quota', () => {
    // Kuota harian = 85.000, Belanja hari ini = 120.000 (overspend 35.000)
    const result = calculateSafeToSpendToday({
      monthlyBudget: 3000000,
      totalSpentMonth: 1300000,
      spentToday: 120000,
      paydayDate: 25,
      currentDate: new Date('2026-10-05T00:00:00Z'),
    });

    expect(result.dailySafeQuota).toBe(85000);
    expect(result.remainingQuotaToday).toBe(-35000);
    expect(result.status).toBe('overspent');
    expect(result.insightMessage).toContain('overspend');
  });

  it('calculates days to payday across month boundaries', () => {
    // Tanggal 28 Okt, gajian tanggal 25 Nov -> 28 hari
    const date = new Date('2026-10-28T00:00:00Z');
    const days = calculateDaysToPayday(date, 25);
    expect(days).toBeGreaterThan(0);
  });
});
