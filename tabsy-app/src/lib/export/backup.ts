import { z } from 'zod';
import { BackupDataV1, Transaction } from '@/types';

// Zod Schema for validation
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

export const BackupDataV1Schema = z.object({
  formatVersion: z.literal(1),
  exportedAt: z.string(),
  transactions: z.array(TransactionSchema),
});

export function generateBackupJSON(transactions: Transaction[]): void {
  const data: BackupDataV1 = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    transactions,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `catatcepat_backup_${nowStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseAndValidateBackup(jsonString: string): { success: true; data: BackupDataV1 } | { success: false; error: string } {
  try {
    const raw = JSON.parse(jsonString);
    const parsed = BackupDataV1Schema.safeParse(raw);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: `Format file tidak valid: ${issue.path.join('.')} (${issue.message})`,
      };
    }

    return {
      success: true,
      data: parsed.data,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: 'File bukan merupakan format JSON yang valid',
    };
  }
}
