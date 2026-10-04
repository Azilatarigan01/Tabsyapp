export type ExpenseCategory =
  | 'makan'
  | 'transport'
  | 'belanja'
  | 'tagihan'
  | 'hiburan'
  | 'kesehatan'
  | 'pendidikan'
  | 'lainnya';

export interface CategoryInfo {
  id: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'makan', label: 'Makan & Minum', icon: 'Utensils', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  { id: 'transport', label: 'Transportasi', icon: 'Car', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  { id: 'belanja', label: 'Belanja', icon: 'ShoppingBag', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  { id: 'tagihan', label: 'Tagihan & Utilitas', icon: 'Receipt', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
  { id: 'hiburan', label: 'Hiburan', icon: 'Gamepad2', color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40' },
  { id: 'kesehatan', label: 'Kesehatan', icon: 'HeartPulse', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
  { id: 'pendidikan', label: 'Pendidikan', icon: 'GraduationCap', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
  { id: 'lainnya', label: 'Lainnya', icon: 'MoreHorizontal', color: 'text-zinc-500 bg-zinc-50 dark:bg-zinc-800' },
];

export interface UserProfile {
  name: string;
  avatar: string;
  monthlyBudget: number;
  email?: string;
  isSetup: boolean;
}

export const DEFAULT_AVATARS = [
  '🧑‍💻', '👩‍💼', '👨‍🎓', '👩‍🎨', '🦊', '⚡', '☕', '🚀'
];

export interface Transaction {
  id: string; // UUID v4
  description: string; // Max 100 chars
  amountRupiah: number; // Positive safe integer, max 1.000.000.000
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface BackupDataV1 {
  formatVersion: 1;
  exportedAt: string; // ISO 8601
  transactions: Transaction[];
  userProfile?: UserProfile;
}

export type FeeInputType = 'percent' | 'nominal';

export interface SplitBillInput {
  subtotal: number;
  taxType: FeeInputType;
  taxValue: number; // Percent (0-100) or nominal amount
  serviceType: FeeInputType;
  serviceValue: number; // Percent (0-100) or nominal amount
  participants: string[]; // List of names, min 1
}

export interface ParticipantShare {
  id: string;
  name: string;
  baseAmount: number;
  extraRemainder: number;
  finalAmount: number;
}

export interface SplitBillResult {
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  total: number;
  shares: ParticipantShare[];
}

// ==========================================
// TAHAP 10: PERLUASAN DATA & MODUL PER ITEM
// ==========================================

export interface Participant {
  id: string;
  name: string;
}

export interface BillItem {
  id: string;
  name: string;
  price: number; // Unit price or line price
  quantity: number; // Positive integer (defaults to 1)
  assignedParticipantIds: string[]; // Participants sharing this item (positive shares)
}

export interface Payment {
  id: string;
  participantId: string;
  amountPaid: number; // Integer >= 0
  note?: string;
  paidAt: string; // ISO 8601
}

export interface BillDraft {
  id: string; // UUID v4
  title: string;
  date: string; // YYYY-MM-DD
  items: BillItem[];
  participants: Participant[];
  discountAmount: number; // Nominal discount applied before tax & service
  taxType: FeeInputType;
  taxValue: number;
  serviceType: FeeInputType;
  serviceValue: number;
  payments: Payment[];
  isFinalized: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface ParticipantItemBreakdown {
  participantId: string;
  participantName: string;
  rawItemSubtotal: number;
  allocatedDiscount: number;
  discountedSubtotal: number;
  allocatedTax: number;
  allocatedService: number;
  finalShareAmount: number;
  totalPaid: number;
  balance: number; // finalShareAmount - totalPaid (positive = owes money, negative = overpaid/change, 0 = settled)
  isSettled: boolean;
}

export interface SettlementTransfer {
  fromParticipantId: string;
  fromParticipantName: string;
  toParticipantId: string;
  toParticipantName: string;
  amount: number;
}

export interface ItemSplitCalculationResult {
  grossSubtotal: number;
  discountAmount: number;
  netSubtotal: number;
  taxAmount: number;
  serviceAmount: number;
  totalBill: number;
  totalPayments: number;
  paymentDifference: number; // totalBill - totalPayments (0 means fully settled)
  isFullyPaid: boolean;
  participantBreakdowns: ParticipantItemBreakdown[];
  settlementTransfers: SettlementTransfer[];
}

export interface BackupDataV2 {
  formatVersion: 2;
  exportedAt: string; // ISO 8601
  transactions: Transaction[];
  userProfile?: UserProfile;
  billDrafts: BillDraft[];
}
