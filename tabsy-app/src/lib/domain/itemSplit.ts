import {
  BillDraft,
  BillItem,
  Participant,
  Payment,
  ParticipantItemBreakdown,
  SettlementTransfer,
  ItemSplitCalculationResult,
} from '@/types';
import { MAX_SAFE_NOMINAL, percentToBps, roundHalfUp } from './calculator';
import { simplifyGroupDebts } from './debtSimplifier';

/**
 * Largest Remainder Method (Hamilton-Hare method)
 * Distributes a discrete total amount across parties according to exact fractional shares
 * so that the sum of distributed integer amounts EXACTLY equals the target total.
 */
export function distributeLargestRemainder(
  totalToDistribute: number,
  weights: number[]
): number[] {
  if (totalToDistribute <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const sumWeights = weights.reduce((sum, w) => sum + w, 0);
  if (sumWeights <= 0) {
    // If all weights are 0, distribute equally
    const equalShare = Math.floor(totalToDistribute / weights.length);
    const remainder = totalToDistribute % weights.length;
    return weights.map((_, i) => equalShare + (i < remainder ? 1 : 0));
  }

  // Calculate exact quotas and integer floors
  const quotas = weights.map((w) => (w / sumWeights) * totalToDistribute);
  const floors = quotas.map((q) => Math.floor(q));
  const fractions = quotas.map((q, idx) => ({ idx, fraction: q - floors[idx] }));

  const currentTotal = floors.reduce((sum, f) => sum + f, 0);
  let remainder = totalToDistribute - currentTotal;

  // Sort descending by fraction remainder
  fractions.sort((a, b) => b.fraction - a.fraction);

  const result = [...floors];
  for (let i = 0; i < remainder && i < fractions.length; i++) {
    result[fractions[i].idx] += 1;
  }

  return result;
}

/**
 * Validates a BillDraft before calculation or finalization.
 * Rule: Item without participants blocks finalization.
 */
export function validateBillDraftForFinalization(draft: BillDraft): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!draft.title || !draft.title.trim()) {
    errors.push('Judul tagihan tidak boleh kosong.');
  }

  if (draft.participants.length === 0) {
    errors.push('Minimal harus ada 1 peserta.');
  }

  if (draft.items.length === 0) {
    errors.push('Minimal harus ada 1 menu pesanan dalam tagihan.');
  }

  // Check each item
  draft.items.forEach((item, index) => {
    if (!item.name || !item.name.trim()) {
      errors.push(`Item #${index + 1}: Nama menu tidak boleh kosong.`);
    }

    if (!Number.isSafeInteger(item.price) || item.price <= 0) {
      errors.push(`Item "${item.name || `#${index + 1}`}": Harga harus bilangan bulat positif.`);
    }

    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`Item "${item.name || `#${index + 1}`}": Kuantitas harus bilangan bulat positif (minimal 1).`);
    }

    // MANDATORY REQUIREMENT: Item tanpa peserta menghalangi finalisasi
    const validAssigned = item.assignedParticipantIds.filter((pId) =>
      draft.participants.some((p) => p.id === pId)
    );

    if (validAssigned.length === 0) {
      errors.push(
        `Item "${item.name || `#${index + 1}`}" belum dipilih siapa yang memakannya. Semua menu harus dialokasikan ke minimal satu peserta.`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate multi-item bill split with:
 * 1. Line total (price * quantity)
 * 2. Positive shares per item
 * 3. Nominal discount applied before tax & service
 * 4. Largest remainder proportional allocation of discount, tax, and service
 * 5. Payment ledger, individual balances, and optimal settlement transfers
 */
export function calculateItemSplit(draft: BillDraft): ItemSplitCalculationResult {
  const { participants, items, discountAmount = 0, taxType, taxValue, serviceType, serviceValue, payments = [] } = draft;

  if (participants.length === 0 || items.length === 0) {
    return {
      grossSubtotal: 0,
      discountAmount: 0,
      netSubtotal: 0,
      taxAmount: 0,
      serviceAmount: 0,
      totalBill: 0,
      totalPayments: 0,
      paymentDifference: 0,
      isFullyPaid: false,
      participantBreakdowns: [],
      settlementTransfers: [],
    };
  }

  // Map participant ID to index and name
  const participantMap = new Map<string, Participant>();
  participants.forEach((p) => participantMap.set(p.id, p));

  // 1. Calculate Gross Subtotal & Participant Raw Item Subtotals
  const participantRawSubtotals: Record<string, number> = {};
  participants.forEach((p) => {
    participantRawSubtotals[p.id] = 0;
  });

  let grossSubtotal = 0;

  items.forEach((item) => {
    const lineTotal = item.price * (item.quantity || 1);
    grossSubtotal += lineTotal;

    const assigned = item.assignedParticipantIds.filter((id) => participantMap.has(id));
    if (assigned.length > 0) {
      // Split line total fairly across assigned participants with deterministic remainder
      const sharePrice = Math.floor(lineTotal / assigned.length);
      const remainder = lineTotal % assigned.length;

      assigned.forEach((pId, idx) => {
        const extra = idx < remainder ? 1 : 0;
        participantRawSubtotals[pId] = (participantRawSubtotals[pId] || 0) + sharePrice + extra;
      });
    }
  });

  // 2. Apply Nominal Discount BEFORE Tax and Service
  // Clamped between 0 and grossSubtotal
  const effectiveDiscount = Math.max(0, Math.min(grossSubtotal, Math.round(discountAmount || 0)));
  const netSubtotal = grossSubtotal - effectiveDiscount;

  // Allocate discount proportionally using Largest Remainder
  const participantIds = participants.map((p) => p.id);
  const rawSubtotalList = participantIds.map((id) => participantRawSubtotals[id] || 0);

  const distributedDiscounts = distributeLargestRemainder(effectiveDiscount, rawSubtotalList);
  const participantDiscounts: Record<string, number> = {};
  participantIds.forEach((id, idx) => {
    participantDiscounts[id] = distributedDiscounts[idx];
  });

  // Participant discounted subtotals
  const discountedSubtotalList = participantIds.map(
    (id, idx) => (participantRawSubtotals[id] || 0) - distributedDiscounts[idx]
  );

  // 3. Calculate Tax based on Net Subtotal
  let taxAmount = 0;
  if (taxType === 'percent') {
    const bps = percentToBps(taxValue);
    taxAmount = roundHalfUp((netSubtotal * bps) / 10000);
  } else {
    taxAmount = Math.max(0, Math.min(MAX_SAFE_NOMINAL, Math.round(taxValue || 0)));
  }

  // Allocate Tax proportionally to discounted subtotal
  const distributedTaxes = distributeLargestRemainder(taxAmount, discountedSubtotalList);
  const participantTaxes: Record<string, number> = {};
  participantIds.forEach((id, idx) => {
    participantTaxes[id] = distributedTaxes[idx];
  });

  // 4. Calculate Service Charge based on Net Subtotal
  let serviceAmount = 0;
  if (serviceType === 'percent') {
    const bps = percentToBps(serviceValue);
    serviceAmount = roundHalfUp((netSubtotal * bps) / 10000);
  } else {
    serviceAmount = Math.max(0, Math.min(MAX_SAFE_NOMINAL, Math.round(serviceValue || 0)));
  }

  // Allocate Service proportionally to discounted subtotal
  const distributedServices = distributeLargestRemainder(serviceAmount, discountedSubtotalList);
  const participantServices: Record<string, number> = {};
  participantIds.forEach((id, idx) => {
    participantServices[id] = distributedServices[idx];
  });

  // Total Bill
  const totalBill = netSubtotal + taxAmount + serviceAmount;

  // 5. Calculate Payments Ledger by Participant
  const paymentsByParticipant: Record<string, number> = {};
  participants.forEach((p) => {
    paymentsByParticipant[p.id] = 0;
  });

  let totalPayments = 0;
  payments.forEach((pmt) => {
    if (participantMap.has(pmt.participantId)) {
      const amt = Math.max(0, Math.round(pmt.amountPaid || 0));
      paymentsByParticipant[pmt.participantId] += amt;
      totalPayments += amt;
    }
  });

  // 6. Build Breakdown per Participant
  const participantBreakdowns: ParticipantItemBreakdown[] = participants.map((p, idx) => {
    const rawItemSubtotal = participantRawSubtotals[p.id] || 0;
    const allocatedDiscount = participantDiscounts[p.id] || 0;
    const pDiscountedSubtotal = rawItemSubtotal - allocatedDiscount;
    const allocatedTax = participantTaxes[p.id] || 0;
    const allocatedService = participantServices[p.id] || 0;

    const finalShareAmount = pDiscountedSubtotal + allocatedTax + allocatedService;
    const totalPaid = paymentsByParticipant[p.id] || 0;
    const balance = finalShareAmount - totalPaid; // >0: owes, <0: overpaid, 0: settled

    return {
      participantId: p.id,
      participantName: p.name,
      rawItemSubtotal,
      allocatedDiscount,
      discountedSubtotal: pDiscountedSubtotal,
      allocatedTax,
      allocatedService,
      finalShareAmount,
      totalPaid,
      balance,
      isSettled: balance === 0,
    };
  });

  // Reconcile total check: sum(finalShareAmount) MUST equal totalBill exactly
  const sumShares = participantBreakdowns.reduce((s, b) => s + b.finalShareAmount, 0);
  const diff = totalBill - sumShares;
  if (diff !== 0 && participantBreakdowns.length > 0) {
    participantBreakdowns[0].finalShareAmount += diff;
    participantBreakdowns[0].balance += diff;
  }

  const paymentDifference = totalBill - totalPayments;
  const isFullyPaid = paymentDifference === 0;

  // 7. Settlement Transfers Plan (when total payments complete)
  // Debtor owes money (balance > 0). Creditor overpaid or paid cashier (balance < 0).
  const settlementTransfers: SettlementTransfer[] = [];

  if (isFullyPaid) {
    const debtResult = simplifyGroupDebts(
      participantBreakdowns.map((b) => ({
        id: b.participantId,
        name: b.participantName,
        totalPaid: b.totalPaid,
        totalShare: b.finalShareAmount,
      }))
    );

    debtResult.transfers.forEach((t) => {
      settlementTransfers.push({
        fromParticipantId: t.fromId,
        fromParticipantName: t.fromName,
        toParticipantId: t.toId,
        toParticipantName: t.toName,
        amount: t.amount,
      });
    });
  }

  return {
    grossSubtotal,
    discountAmount: effectiveDiscount,
    netSubtotal,
    taxAmount,
    serviceAmount,
    totalBill,
    totalPayments,
    paymentDifference,
    isFullyPaid,
    participantBreakdowns,
    settlementTransfers,
  };
}
