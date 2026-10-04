import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  db,
  addTransaction,
  getTransactionById,
  getAllTransactions,
  getTransactionsByMonth,
  updateTransaction,
  deleteTransaction,
  importTransactions,
  clearAllTransactions,
  seedSampleData,
} from '../index';

describe('Database: Dexie IndexedDB Repository (Tahap 2)', () => {
  beforeEach(async () => {
    await clearAllTransactions();
  });

  it('adds a valid transaction and generates UUID and timestamps', async () => {
    const tx = await addTransaction({
      description: 'Kopi Kenangan',
      amountRupiah: 22000,
      category: 'makan',
      date: '2026-10-04',
    });

    expect(tx.id).toBeDefined();
    expect(tx.description).toBe('Kopi Kenangan');
    expect(tx.amountRupiah).toBe(22000);
    expect(tx.category).toBe('makan');
    expect(tx.date).toBe('2026-10-04');
    expect(tx.createdAt).toBeDefined();
    expect(tx.updatedAt).toBeDefined();

    const stored = await getTransactionById(tx.id);
    expect(stored).toBeDefined();
    expect(stored?.description).toBe('Kopi Kenangan');
  });

  it('rejects invalid inputs according to PRD constraints', async () => {
    // Empty description
    await expect(
      addTransaction({
        description: '',
        amountRupiah: 20000,
        category: 'makan',
      })
    ).rejects.toThrow('Nama/deskripsi transaksi tidak boleh kosong.');

    // Negative amount
    await expect(
      addTransaction({
        description: 'Bensin',
        amountRupiah: -10000,
        category: 'transport',
      })
    ).rejects.toThrow('Nominal uang harus berupa bilangan bulat positif.');

    // Amount exceeding Rp1.000.000.000
    await expect(
      addTransaction({
        description: 'Beli Rumah',
        amountRupiah: 1_500_000_000,
        category: 'lainnya',
      })
    ).rejects.toThrow('Nominal uang melebihi batas maksimal Rp1.000.000.000.');
  });

  it('updates an existing transaction and updates updatedAt', async () => {
    const created = await addTransaction({
      description: 'Nasi Goreng',
      amountRupiah: 18000,
      category: 'makan',
      date: '2026-10-04',
    });

    const updated = await updateTransaction(created.id, {
      description: 'Nasi Goreng Spesial',
      amountRupiah: 25000,
    });

    expect(updated.description).toBe('Nasi Goreng Spesial');
    expect(updated.amountRupiah).toBe(25000);
    expect(updated.updatedAt).toBeDefined();

    const retrieved = await getTransactionById(created.id);
    expect(retrieved?.description).toBe('Nasi Goreng Spesial');
  });

  it('deletes a transaction successfully', async () => {
    const tx = await addTransaction({
      description: 'Camilan',
      amountRupiah: 12000,
      category: 'makan',
    });

    await deleteTransaction(tx.id);
    const retrieved = await getTransactionById(tx.id);
    expect(retrieved).toBeUndefined();
  });

  it('filters transactions by month correctly', async () => {
    await addTransaction({
      description: 'Makan Oktober',
      amountRupiah: 20000,
      category: 'makan',
      date: '2026-10-04',
    });

    await addTransaction({
      description: 'Makan September',
      amountRupiah: 30000,
      category: 'makan',
      date: '2026-09-20',
    });

    const octList = await getTransactionsByMonth('2026-10');
    expect(octList.length).toBe(1);
    expect(octList[0].description).toBe('Makan Oktober');

    const sepList = await getTransactionsByMonth('2026-09');
    expect(sepList.length).toBe(1);
    expect(sepList[0].description).toBe('Makan September');
  });

  it('imports transactions while skipping existing duplicate IDs', async () => {
    const tx1 = await addTransaction({
      description: 'Transaksi Awal',
      amountRupiah: 15000,
      category: 'makan',
      date: '2026-10-01',
    });

    const incoming = [
      tx1, // Duplicate ID
      {
        id: '999e8400-e29b-41d4-a716-446655449999',
        description: 'Transaksi Baru dari Backup',
        amountRupiah: 50000,
        category: 'belanja' as const,
        date: '2026-10-02',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = await importTransactions(incoming);
    expect(result.totalInFile).toBe(2);
    expect(result.skipped).toBe(1); // 1 skipped because ID already exists
    expect(result.added).toBe(1); // 1 added

    const all = await getAllTransactions();
    expect(all.length).toBe(2);
  });

  it('seeds 10 sample transactions if empty', async () => {
    const seededCount = await seedSampleData();
    expect(seededCount).toBe(10);

    const all = await getAllTransactions();
    expect(all.length).toBe(10);

    // Calling again should not duplicate
    const secondCall = await seedSampleData();
    expect(secondCall).toBe(0);
    const countAfter = await getAllTransactions();
    expect(countAfter.length).toBe(10);
  });
});
