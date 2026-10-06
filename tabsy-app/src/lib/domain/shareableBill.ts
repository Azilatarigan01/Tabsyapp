import { BillDraft, ItemSplitCalculationResult } from '@/types';
import { calculateItemSplit } from './itemSplit';

export interface PublicBillData {
  id: string;
  shareToken: string;
  title: string;
  date: string;
  hostName: string;
  items: {
    name: string;
    price: number;
    quantity: number;
    assignedNames: string[];
  }[];
  discountAmount: number;
  taxAmount: number;
  serviceAmount: number;
  totalBill: number;
  participants: {
    name: string;
    amountToPay: number;
    isPaid: boolean;
  }[];
  transfers: {
    from: string;
    to: string;
    amount: number;
  }[];
  paymentInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  };
}

/**
 * Generate an 8-character unique share token
 */
export function generateShareToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Convert a BillDraft and its calculation into a compact PublicBillData
 */
export function formatPublicBillData(
  draft: BillDraft,
  calc: ItemSplitCalculationResult,
  paymentInfo?: { bankName?: string; accountNumber?: string; accountHolder?: string }
): PublicBillData {
  const token = draft.shareToken || generateShareToken();
  const host = draft.participants[0]?.name || 'Teman Kamu';

  return {
    id: draft.id,
    shareToken: token,
    title: draft.title || 'Patungan Nongkrong',
    date: draft.date,
    hostName: host,
    items: draft.items.map((it) => ({
      name: it.name,
      price: it.price,
      quantity: it.quantity || 1,
      assignedNames: it.assignedParticipantIds.map(
        (id) => draft.participants.find((p) => p.id === id)?.name || id
      ),
    })),
    discountAmount: calc.discountAmount,
    taxAmount: calc.taxAmount,
    serviceAmount: calc.serviceAmount,
    totalBill: calc.totalBill,
    participants: calc.participantBreakdowns.map((b) => ({
      name: b.participantName,
      amountToPay: b.finalShareAmount,
      isPaid: b.balance <= 0,
    })),
    transfers: calc.settlementTransfers.map((t) => ({
      from: t.fromParticipantName,
      to: t.toParticipantName,
      amount: t.amount,
    })),
    paymentInfo,
  };
}

/**
 * Encode PublicBillData into a URL-safe Base64 string for zero-cloud sharing
 */
export function encodeBillToUrlPayload(data: PublicBillData): string {
  try {
    const jsonStr = JSON.stringify(data);
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return encodeURIComponent(window.btoa(encodeURIComponent(jsonStr)));
    }
    return encodeURIComponent(Buffer.from(jsonStr).toString('base64'));
  } catch (err) {
    console.error('Error encoding bill payload:', err);
    return '';
  }
}

/**
 * Decode URL-safe Base64 string back into PublicBillData
 */
export function decodeBillFromUrlPayload(payload: string): PublicBillData | null {
  try {
    const rawB64 = decodeURIComponent(payload);
    let jsonStr = '';
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      jsonStr = decodeURIComponent(window.atob(rawB64));
    } else {
      jsonStr = Buffer.from(rawB64, 'base64').toString('utf-8');
    }
    return JSON.parse(jsonStr) as PublicBillData;
  } catch (err) {
    console.error('Error decoding bill payload:', err);
    return null;
  }
}
