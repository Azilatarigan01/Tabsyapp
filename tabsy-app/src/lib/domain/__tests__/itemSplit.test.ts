import { describe, it, expect } from 'vitest';
import {
  distributeLargestRemainder,
  validateBillDraftForFinalization,
  calculateItemSplit,
} from '../itemSplit';
import { BillDraft } from '@/types';
import { parseAndValidateBackup } from '@/lib/export/backup';

describe('Tahap 10: Item Split, Discount, Allocation & Settlement Domain', () => {
  describe('distributeLargestRemainder', () => {
    it('distributes discrete amount so sum equals target total exactly', () => {
      // 100 rupiah distributed by weights [1, 1, 1]
      const result = distributeLargestRemainder(100, [1, 1, 1]);
      expect(result).toEqual([34, 33, 33]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('handles proportional weights with varied fractions', () => {
      // Weights 40, 30, 30 with total 10
      const result = distributeLargestRemainder(10, [40, 30, 30]);
      expect(result).toEqual([4, 3, 3]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(10);
    });

    it('returns zeroes when total is 0', () => {
      const result = distributeLargestRemainder(0, [100, 200]);
      expect(result).toEqual([0, 0]);
    });
  });

  describe('validateBillDraftForFinalization', () => {
    const validDraft: BillDraft = {
      id: 'draft-1',
      title: 'Makan Malam Seafood',
      date: '2026-10-05',
      participants: [
        { id: 'p1', name: 'Zila' },
        { id: 'p2', name: 'Budi' },
      ],
      items: [
        { id: 'i1', name: 'Ikan Bakar', price: 60000, quantity: 1, assignedParticipantIds: ['p1', 'p2'] },
        { id: 'i2', name: 'Es Kelapa', price: 15000, quantity: 2, assignedParticipantIds: ['p1'] },
      ],
      discountAmount: 10000,
      taxType: 'percent',
      taxValue: 10,
      serviceType: 'percent',
      serviceValue: 5,
      payments: [],
      isFinalized: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('accepts a complete, valid draft', () => {
      const validation = validateBillDraftForFinalization(validDraft);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('blocks finalization when an item has NO assigned participants', () => {
      const invalidDraft: BillDraft = {
        ...validDraft,
        items: [
          ...validDraft.items,
          { id: 'i3', name: 'Cumi Goreng Tepung', price: 40000, quantity: 1, assignedParticipantIds: [] },
        ],
      };

      const validation = validateBillDraftForFinalization(invalidDraft);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Cumi Goreng Tepung'))).toBe(true);
    });

    it('blocks finalization when title or participants are missing', () => {
      const emptyDraft: BillDraft = {
        ...validDraft,
        title: '',
        participants: [],
      };

      const validation = validateBillDraftForFinalization(emptyDraft);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('calculateItemSplit calculation rules', () => {
    it('applies nominal discount BEFORE tax and service, and guarantees sum(shares) === totalBill', () => {
      const draft: BillDraft = {
        id: 'draft-test',
        title: 'Traktir Tim',
        date: '2026-10-05',
        participants: [
          { id: 'p1', name: 'Alice' },
          { id: 'p2', name: 'Bob' },
          { id: 'p3', name: 'Charlie' },
        ],
        items: [
          // Alice: 50.000
          { id: 'i1', name: 'Steak Wagyu', price: 50000, quantity: 1, assignedParticipantIds: ['p1'] },
          // Bob: 30.000
          { id: 'i2', name: 'Burger Truffle', price: 30000, quantity: 1, assignedParticipantIds: ['p2'] },
          // Shared all (20.000 total -> 6667, 6667, 6666)
          { id: 'i3', name: 'Pizza Sharing', price: 20000, quantity: 1, assignedParticipantIds: ['p1', 'p2', 'p3'] },
        ],
        // Gross subtotal = 100.000
        discountAmount: 20000, // Net subtotal = 80.000
        taxType: 'percent',
        taxValue: 10, // 10% of 80.000 = 8.000
        serviceType: 'percent',
        serviceValue: 5, // 5% of 80.000 = 4.000
        // Total Bill = 80.000 + 8.000 + 4.000 = 92.000
        payments: [],
        isFinalized: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = calculateItemSplit(draft);

      expect(result.grossSubtotal).toBe(100000);
      expect(result.discountAmount).toBe(20000);
      expect(result.netSubtotal).toBe(80000);
      expect(result.taxAmount).toBe(8000);
      expect(result.serviceAmount).toBe(4000);
      expect(result.totalBill).toBe(92000);

      // Verify the sum of participant shares EXACTLY matches totalBill (no rounding drift)
      const sumShares = result.participantBreakdowns.reduce((sum, b) => sum + b.finalShareAmount, 0);
      expect(sumShares).toBe(result.totalBill);

      // Check discount was distributed proportionally using largest remainder
      const sumDiscounts = result.participantBreakdowns.reduce((sum, b) => sum + b.allocatedDiscount, 0);
      expect(sumDiscounts).toBe(20000);

      // Check tax and service sums
      const sumTaxes = result.participantBreakdowns.reduce((sum, b) => sum + b.allocatedTax, 0);
      expect(sumTaxes).toBe(8000);

      const sumServices = result.participantBreakdowns.reduce((sum, b) => sum + b.allocatedService, 0);
      expect(sumServices).toBe(4000);
    });

    it('tracks partial payments and incomplete status', () => {
      const draft: BillDraft = {
        id: 'draft-payments',
        title: 'Makan Bareng',
        date: '2026-10-05',
        participants: [
          { id: 'p1', name: 'Asep' },
          { id: 'p2', name: 'Budi' },
        ],
        items: [
          { id: 'i1', name: 'Ayam Geprek', price: 50000, quantity: 2, assignedParticipantIds: ['p1', 'p2'] },
        ], // Subtotal 100.000, no tax/srv
        discountAmount: 0,
        taxType: 'percent',
        taxValue: 0,
        serviceType: 'percent',
        serviceValue: 0,
        payments: [
          { id: 'pmt-1', participantId: 'p1', amountPaid: 60000, paidAt: new Date().toISOString() },
          // Total paid is 60.000, bill is 100.000 -> 40.000 remaining
        ],
        isFinalized: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = calculateItemSplit(draft);

      expect(result.totalBill).toBe(100000);
      expect(result.totalPayments).toBe(60000);
      expect(result.paymentDifference).toBe(40000);
      expect(result.isFullyPaid).toBe(false);
      // Settlements transfers only computed when payments are complete
      expect(result.settlementTransfers).toHaveLength(0);

      // Asep share: 50.000, paid: 60.000 -> balance: -10.000 (overpaid/uang kembali)
      const asep = result.participantBreakdowns.find((p) => p.participantId === 'p1');
      expect(asep?.balance).toBe(-10000);

      // Budi share: 50.000, paid: 0 -> balance: 50.000 (owes money)
      const budi = result.participantBreakdowns.find((p) => p.participantId === 'p2');
      expect(budi?.balance).toBe(50000);
    });

    it('computes exact settlement transfers when full payment is recorded', () => {
      // Suppose Asep paid 100.000 at the cashier for both Asep and Budi (each share 50.000)
      const draft: BillDraft = {
        id: 'draft-settled',
        title: 'Makan Bareng',
        date: '2026-10-05',
        participants: [
          { id: 'p1', name: 'Asep' },
          { id: 'p2', name: 'Budi' },
        ],
        items: [
          { id: 'i1', name: 'Ayam Geprek', price: 100000, quantity: 1, assignedParticipantIds: ['p1', 'p2'] },
        ],
        discountAmount: 0,
        taxType: 'percent',
        taxValue: 0,
        serviceType: 'percent',
        serviceValue: 0,
        payments: [
          { id: 'pmt-1', participantId: 'p1', amountPaid: 100000, paidAt: new Date().toISOString() },
        ],
        isFinalized: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = calculateItemSplit(draft);

      expect(result.totalBill).toBe(100000);
      expect(result.totalPayments).toBe(100000);
      expect(result.paymentDifference).toBe(0);
      expect(result.isFullyPaid).toBe(true);

      // Settlement transfer: Budi must transfer 50.000 to Asep
      expect(result.settlementTransfers).toHaveLength(1);
      expect(result.settlementTransfers[0]).toEqual({
        fromParticipantId: 'p2',
        fromParticipantName: 'Budi',
        toParticipantId: 'p1',
        toParticipantName: 'Asep',
        amount: 50000,
      });
    });
  });

  describe('Backup V1 to V2 Adapter Compatibility', () => {
    it('successfully migrates and restores a legacy formatVersion 1 backup file', () => {
      const legacyV1JSON = JSON.stringify({
        formatVersion: 1,
        exportedAt: '2026-10-01T12:00:00.000Z',
        transactions: [
          {
            id: 'c2e9b9f0-8c20-4a88-8255-6b5d92df9123',
            description: 'Kopi Kenangan',
            amountRupiah: 22000,
            category: 'makan',
            date: '2026-10-01',
            createdAt: '2026-10-01T12:00:00.000Z',
            updatedAt: '2026-10-01T12:00:00.000Z',
          },
        ],
      });

      const validation = parseAndValidateBackup(legacyV1JSON);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.formatVersion).toBe(2);
        expect(validation.data.transactions).toHaveLength(1);
        expect(validation.data.transactions[0].description).toBe('Kopi Kenangan');
        expect(validation.data.billDrafts).toEqual([]); // Adapter initialized empty array
      }
    });

    it('successfully validates formatVersion 2 backup with bill drafts', () => {
      const v2JSON = JSON.stringify({
        formatVersion: 2,
        exportedAt: '2026-10-05T12:00:00.000Z',
        transactions: [],
        billDrafts: [
          {
            id: 'draft-99',
            title: 'Makan Malam Resto',
            date: '2026-10-05',
            items: [
              { id: 'i1', name: 'Nasi Liwet', price: 35000, quantity: 2, assignedParticipantIds: ['p1'] },
            ],
            participants: [{ id: 'p1', name: 'Zila' }],
            discountAmount: 5000,
            taxType: 'percent',
            taxValue: 10,
            serviceType: 'percent',
            serviceValue: 0,
            payments: [],
            isFinalized: false,
            createdAt: '2026-10-05T12:00:00.000Z',
            updatedAt: '2026-10-05T12:00:00.000Z',
          },
        ],
      });

      const validation = parseAndValidateBackup(v2JSON);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.formatVersion).toBe(2);
        expect(validation.data.billDrafts).toHaveLength(1);
        expect(validation.data.billDrafts[0].title).toBe('Makan Malam Resto');
      }
    });
  });
});
