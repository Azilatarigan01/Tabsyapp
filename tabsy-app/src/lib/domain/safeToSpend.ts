import { formatRupiah } from './calculator';

export interface SafeToSpendResult {
  monthlyBudget: number;
  totalSpentThisCycle: number;
  remainingBudgetTotal: number;
  daysRemainingToPayday: number;
  dailySafeQuota: number;       // Batas Aman Belanja Hari Ini: A / D
  spentToday: number;           // Yang sudah dibelanjakan hari ini
  remainingQuotaToday: number;  // Sisa kuota hari ini (bisa negatif jika overspent)
  percentageUsedToday: number;  // 0 - 100%+
  status: 'safe' | 'warning' | 'overspent';
  statusLabel: string;
  insightMessage: string;
}

/**
 * Menghitung hari tersisa menuju tanggal gajian berikutnya
 */
export function calculateDaysToPayday(now: Date = new Date(), paydayDate: number = 25): number {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();

  // Clamp paydayDate between 1 and 28 (to be safe across all months)
  const safePayday = Math.max(1, Math.min(28, Math.round(paydayDate)));

  let targetPayday: Date;

  if (currentDay < safePayday) {
    // Gajian di bulan yang sama
    targetPayday = new Date(currentYear, currentMonth, safePayday);
  } else {
    // Gajian di bulan berikutnya
    targetPayday = new Date(currentYear, currentMonth + 1, safePayday);
  }

  const diffTime = targetPayday.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Minimal 1 hari
  return Math.max(1, diffDays);
}

/**
 * Dynamic "Safe-to-Spend" Today Calculator
 * 
 * Rumus:
 * Batas Hari Ini = Sisa Anggaran / Sisa Hari Menuju Gajian
 */
export function calculateSafeToSpendToday(params: {
  monthlyBudget: number;
  totalSpentMonth: number;
  spentToday: number;
  paydayDate?: number;
  currentDate?: Date;
}): SafeToSpendResult {
  const {
    monthlyBudget = 3500000,
    totalSpentMonth = 0,
    spentToday = 0,
    paydayDate = 25,
    currentDate = new Date(),
  } = params;

  const remainingBudgetTotal = Math.max(0, monthlyBudget - totalSpentMonth);
  const daysRemaining = calculateDaysToPayday(currentDate, paydayDate);

  // Kuota Harian Dinamis = Sisa Anggaran / Sisa Hari
  const dailySafeQuota = daysRemaining > 0 ? Math.floor(remainingBudgetTotal / daysRemaining) : remainingBudgetTotal;

  const remainingQuotaToday = dailySafeQuota - spentToday;
  const percentageUsedToday = dailySafeQuota > 0 ? Math.min(100, Math.round((spentToday / dailySafeQuota) * 100)) : 100;

  let status: 'safe' | 'warning' | 'overspent' = 'safe';
  let statusLabel = 'Aman & Terkendali ✨';
  let insightMessage = '';

  if (dailySafeQuota <= 0) {
    status = 'overspent';
    statusLabel = 'Anggaran Habis 🚨';
    insightMessage = `Anggaran bulanan telah terpakai semua. Tahan pengeluaran selama ${daysRemaining} hari ke depan hingga gajian.`;
  } else if (spentToday > dailySafeQuota) {
    status = 'overspent';
    statusLabel = 'Melebihi Kuota Harian ⚠️';
    const overspendAmount = spentToday - dailySafeQuota;
    const impactPerDay = daysRemaining > 1 ? Math.round(overspendAmount / (daysRemaining - 1)) : overspendAmount;
    insightMessage = `Kamu overspend ${formatRupiah(overspendAmount)} hari ini. Batas harian untuk ${daysRemaining - 1} hari berikutnya otomatis menyusut ~${formatRupiah(impactPerDay)}/hari agar akhir bulan tetap aman.`;
  } else if (percentageUsedToday >= 80) {
    status = 'warning';
    statusLabel = 'Mendekati Batas Hari Ini 🟡';
    insightMessage = `Tersisa ${formatRupiah(remainingQuotaToday)} untuk sisa hari ini. Simpan sisa kuotamu untuk menambah jatah belanja esok hari!`;
  } else {
    status = 'safe';
    statusLabel = 'Bagus! Dalam Batas Aman 🟢';
    const potentialBonus = Math.round(remainingQuotaToday / Math.max(1, daysRemaining - 1));
    insightMessage = `Batas aman belanjamu hari ini adalah ${formatRupiah(dailySafeQuota)}. Masih sisa ${formatRupiah(remainingQuotaToday)}!`;
  }

  return {
    monthlyBudget,
    totalSpentThisCycle: totalSpentMonth,
    remainingBudgetTotal,
    daysRemainingToPayday: daysRemaining,
    dailySafeQuota,
    spentToday,
    remainingQuotaToday,
    percentageUsedToday,
    status,
    statusLabel,
    insightMessage,
  };
}
