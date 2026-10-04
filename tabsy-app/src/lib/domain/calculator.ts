import { SplitBillInput, SplitBillResult, ParticipantShare } from '@/types';

export const MAX_SAFE_NOMINAL = 1_000_000_000; // Rp1.000.000.000

/**
 * Format integer amount to Indonesian Rupiah representation: Rp115.000
 */
export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) return 'Rp0';
  const rounded = Math.round(amount);
  return 'Rp' + rounded.toLocaleString('id-ID');
}

/**
 * Convert percentage (e.g. 10 or 10.5) to basis points (1000 or 1050)
 * Max 2 decimal places, 0 to 100%
 */
export function percentToBps(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round(clamped * 100);
}

/**
 * Round half-up to nearest integer (standard Indonesian tax/commercial rounding)
 */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * Calculate Split Bill with deterministic remainder distribution
 */
export function calculateSplitBill(input: SplitBillInput): SplitBillResult {
  const { subtotal, taxType, taxValue, serviceType, serviceValue, participants } = input;

  if (subtotal <= 0 || !Number.isSafeInteger(subtotal) || subtotal > MAX_SAFE_NOMINAL) {
    throw new Error('Subtotal harus bilangan bulat positif maksimal Rp1.000.000.000');
  }

  const validParticipants = participants.map((p) => p.trim()).filter(Boolean);
  if (validParticipants.length === 0) {
    throw new Error('Minimal harus ada 1 peserta dengan nama yang jelas');
  }

  // Calculate Tax based on subtotal
  let taxAmount = 0;
  if (taxType === 'percent') {
    const bps = percentToBps(taxValue);
    taxAmount = roundHalfUp((subtotal * bps) / 10000);
  } else {
    taxAmount = Math.max(0, Math.min(MAX_SAFE_NOMINAL, Math.round(taxValue || 0)));
  }

  // Calculate Service based on subtotal
  let serviceAmount = 0;
  if (serviceType === 'percent') {
    const bps = percentToBps(serviceValue);
    serviceAmount = roundHalfUp((subtotal * bps) / 10000);
  } else {
    serviceAmount = Math.max(0, Math.min(MAX_SAFE_NOMINAL, Math.round(serviceValue || 0)));
  }

  const total = subtotal + taxAmount + serviceAmount;

  if (!Number.isSafeInteger(total)) {
    throw new Error('Total perhitungan melebihi batas safe integer');
  }

  const numPeople = validParticipants.length;
  const baseShare = Math.floor(total / numPeople);
  const remainder = total % numPeople;

  const shares: ParticipantShare[] = validParticipants.map((name, index) => {
    const getsExtra = index < remainder;
    const extraRemainder = getsExtra ? 1 : 0;
    const finalAmount = baseShare + extraRemainder;

    return {
      id: `p-${index + 1}`,
      name,
      baseAmount: baseShare,
      extraRemainder,
      finalAmount,
    };
  });

  return {
    subtotal,
    taxAmount,
    serviceAmount,
    total,
    shares,
  };
}
