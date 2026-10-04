import { describe, it, expect } from 'vitest';
import { parseAndValidateBackup } from '@/lib/export/backup';

describe('Export/Backup: JSON Validator (F07)', () => {
  it('validates a correct formatVersion 1 backup file', () => {
    const validJson = JSON.stringify({
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      transactions: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          description: 'Kopi Kenangan',
          amountRupiah: 22000,
          category: 'makan',
          date: '2026-10-04',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const result = parseAndValidateBackup(validJson);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactions.length).toBe(1);
      expect(result.data.transactions[0].amountRupiah).toBe(22000);
    }
  });

  it('rejects invalid JSON structure or unsupported format version', () => {
    const invalidJson = JSON.stringify({
      formatVersion: 99,
      transactions: [],
    });

    const result = parseAndValidateBackup(invalidJson);
    expect(result.success).toBe(false);
  });
});
