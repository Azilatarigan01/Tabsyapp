import { z } from 'zod';
import { BackupDataV1, BackupDataV2, Transaction, BillDraft, UserProfile } from '@/types';

// Zod Schema for Transaction
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(100),
  amountRupiah: z.number().int().positive().max(1_000_000_000),
  category: z.enum([
    'makan',
    'transport',
    'belanja',
    'tagihan',
    'hiburan',
    'kesehatan',
    'pendidikan',
    'lainnya',
  ]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Zod Schema for Tahap 10: BillDraft components
export const ParticipantSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

export const BillItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
  assignedParticipantIds: z.array(z.string()),
});

export const PaymentSchema = z.object({
  id: z.string(),
  participantId: z.string(),
  amountPaid: z.number().int().nonnegative(),
  note: z.string().optional(),
  paidAt: z.string(),
});

export const BillDraftSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(BillItemSchema),
  participants: z.array(ParticipantSchema),
  discountAmount: z.number().int().nonnegative(),
  taxType: z.enum(['percent', 'nominal']),
  taxValue: z.number().nonnegative(),
  serviceType: z.enum(['percent', 'nominal']),
  serviceValue: z.number().nonnegative(),
  payments: z.array(PaymentSchema),
  isFinalized: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UserProfileSchema = z.object({
  name: z.string(),
  avatar: z.string(),
  monthlyBudget: z.number(),
  email: z.string().optional(),
  isSetup: z.boolean(),
}).optional();

export const BackupDataV1Schema = z.object({
  formatVersion: z.literal(1),
  exportedAt: z.string(),
  transactions: z.array(TransactionSchema),
  userProfile: UserProfileSchema,
});

export const BackupDataV2Schema = z.object({
  formatVersion: z.literal(2),
  exportedAt: z.string(),
  transactions: z.array(TransactionSchema),
  userProfile: UserProfileSchema,
  billDrafts: z.array(BillDraftSchema),
});

/**
 * Generate V2 JSON backup file (contains transactions and bill drafts)
 */
export function generateBackupJSON(
  transactions: Transaction[],
  billDrafts: BillDraft[] = [],
  userProfile?: UserProfile
): void {
  const data: BackupDataV2 = {
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    userProfile,
    billDrafts,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `tabsy_backup_v2_${nowStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Backward-Compatible Backup Adapter:
 * Reads and validates incoming JSON. If file is formatVersion: 1 (from older releases),
 * it seamlessly converts and upgrades it to V2 format with an empty billDrafts array.
 */
export function parseAndValidateBackup(
  jsonString: string
): { success: true; data: BackupDataV2 } | { success: false; error: string } {
  try {
    const raw = JSON.parse(jsonString);

    if (!raw || typeof raw !== 'object') {
      return { success: false, error: 'File bukan merupakan objek JSON yang valid' };
    }

    // Check version
    if (raw.formatVersion === 1) {
      const parsedV1 = BackupDataV1Schema.safeParse(raw);
      if (!parsedV1.success) {
        const issue = parsedV1.error.issues[0];
        return {
          success: false,
          error: `Format backup V1 tidak valid: ${issue.path.join('.')} (${issue.message})`,
        };
      }

      // Upgrade V1 to V2 format seamlessly
      const upgraded: BackupDataV2 = {
        formatVersion: 2,
        exportedAt: parsedV1.data.exportedAt,
        transactions: parsedV1.data.transactions,
        userProfile: parsedV1.data.userProfile,
        billDrafts: [], // Initialize empty billDrafts for legacy backups
      };

      return {
        success: true,
        data: upgraded,
      };
    }

    // Version 2 format
    if (raw.formatVersion === 2) {
      const parsedV2 = BackupDataV2Schema.safeParse(raw);
      if (!parsedV2.success) {
        const issue = parsedV2.error.issues[0];
        return {
          success: false,
          error: `Format backup V2 tidak valid: ${issue.path.join('.')} (${issue.message})`,
        };
      }

      return {
        success: true,
        data: parsedV2.data,
      };
    }

    return {
      success: false,
      error: `Versi format backup (${raw.formatVersion}) tidak didukung oleh aplikasi ini.`,
    };
  } catch {
    return {
      success: false,
      error: 'File bukan merupakan format JSON yang valid',
    };
  }
}
