import Dexie, { type EntityTable } from 'dexie';
import { Transaction, ExpenseCategory, BillDraft } from '@/types';
import { MAX_SAFE_NOMINAL } from '@/lib/domain/calculator';

export class CatatCepatDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  billDrafts!: EntityTable<BillDraft, 'id'>;

  constructor() {
    super('CatatCepatDB');
    this.version(1).stores({
      transactions: 'id, date, category, createdAt',
    });

    // Version 2 Migration: Add billDrafts store for item-level bills & receipt splits
    this.version(2).stores({
      transactions: 'id, date, category, createdAt',
      billDrafts: 'id, date, title, isFinalized, updatedAt',
    }).upgrade((tx) => {
      // Preserve existing data without modification
    });
  }
}

export const db = new CatatCepatDatabase();

export interface CreateTransactionDTO {
  id?: string;
  description: string;
  amountRupiah: number;
  category: ExpenseCategory;
  date?: string; // YYYY-MM-DD (defaults to local today)
}

/**
 * Get current local date in YYYY-MM-DD format
 */
export function getLocalTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate transaction fields according to domain rules
 */
export function validateTransactionData(data: CreateTransactionDTO): void {
  if (!data.description || data.description.trim().length === 0) {
    throw new Error('Nama/deskripsi transaksi tidak boleh kosong.');
  }

  if (data.description.length > 100) {
    throw new Error('Nama transaksi maksimal 100 karakter.');
  }

  if (!Number.isSafeInteger(data.amountRupiah) || data.amountRupiah <= 0) {
    throw new Error('Nominal uang harus berupa bilangan bulat positif.');
  }

  if (data.amountRupiah > MAX_SAFE_NOMINAL) {
    throw new Error('Nominal uang melebihi batas maksimal Rp1.000.000.000.');
  }

  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error('Format tanggal harus YYYY-MM-DD.');
  }
}

/**
 * Add a new transaction to IndexedDB with UUID and separate ISO timestamps
 */
export async function addTransaction(dto: CreateTransactionDTO): Promise<Transaction> {
  validateTransactionData(dto);

  const nowIso = new Date().toISOString();
  const newTransaction: Transaction = {
    id: dto.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
    description: dto.description.trim(),
    amountRupiah: dto.amountRupiah,
    category: dto.category,
    date: dto.date || getLocalTodayDate(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await db.transactions.add(newTransaction);
    return newTransaction;
  } catch (error) {
    console.error('Gagal menyimpan transaksi ke IndexedDB:', error);
    throw new Error('Gagal menyimpan transaksi ke penyimpanan lokal browser. Silakan coba lagi.');
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  return await db.transactions.get(id);
}

/**
 * Update existing transaction
 */
export async function updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction> {
  const existing = await db.transactions.get(id);
  if (!existing) {
    throw new Error(`Transaksi dengan ID "${id}" tidak ditemukan.`);
  }

  if (updates.description !== undefined) {
    if (!updates.description.trim()) throw new Error('Nama/deskripsi tidak boleh kosong.');
    if (updates.description.length > 100) throw new Error('Nama maksimal 100 karakter.');
  }

  if (updates.amountRupiah !== undefined) {
    if (!Number.isSafeInteger(updates.amountRupiah) || updates.amountRupiah <= 0) {
      throw new Error('Nominal uang harus bilangan bulat positif.');
    }
    if (updates.amountRupiah > MAX_SAFE_NOMINAL) {
      throw new Error('Nominal melebihi batas maksimal Rp1.000.000.000.');
    }
  }

  const updatedTx: Transaction = {
    ...existing,
    ...updates,
    description: updates.description !== undefined ? updates.description.trim() : existing.description,
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.transactions.put(updatedTx);
    return updatedTx;
  } catch (error) {
    console.error('Gagal memperbarui transaksi:', error);
    throw new Error('Gagal memperbarui transaksi di penyimpanan browser.');
  }
}

/**
 * Delete a transaction by ID
 */
export async function deleteTransaction(id: string): Promise<void> {
  try {
    await db.transactions.delete(id);
  } catch (error) {
    console.error('Gagal menghapus transaksi:', error);
    throw new Error('Gagal menghapus transaksi dari penyimpanan browser.');
  }
}

/**
 * Retrieve all transactions sorted by date (descending)
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  return await db.transactions.orderBy('date').reverse().toArray();
}

/**
 * Retrieve transactions for a specific month (e.g. "2026-10")
 */
export async function getTransactionsByMonth(yearMonth: string): Promise<Transaction[]> {
  return await db.transactions
    .where('date')
    .between(`${yearMonth}-01`, `${yearMonth}-31`, true, true)
    .reverse()
    .sortBy('date');
}

export interface ImportResult {
  added: number;
  skipped: number;
  totalInFile: number;
}

/**
 * Import transactions while skipping existing duplicate IDs
 */
export async function importTransactions(incoming: Transaction[]): Promise<ImportResult> {
  return await db.transaction('rw', db.transactions, async () => {
    let added = 0;
    let skipped = 0;

    for (const item of incoming) {
      const existing = await db.transactions.get(item.id);
      if (existing) {
        skipped++;
      } else {
        await db.transactions.add(item);
        added++;
      }
    }

    return { added, skipped, totalInFile: incoming.length };
  });
}

/**
 * Clear all local transactions
 */
export async function clearAllTransactions(): Promise<void> {
  await db.transactions.clear();
}

/**
 * 10 realistic sample transactions for initial testing (Tahap 1 & 2 requirement)
 */
export const SAMPLE_TRANSACTIONS: CreateTransactionDTO[] = [
  { description: 'Kopi Kenangan Mantan', amountRupiah: 22000, category: 'makan' },
  { description: 'Nasi Padang Ayam Bakar', amountRupiah: 25000, category: 'makan' },
  { description: 'Bensin Pertalite Motor', amountRupiah: 35000, category: 'transport' },
  { description: 'Parkir Kampus', amountRupiah: 5000, category: 'transport' },
  { description: 'Beli Sabun & Odol Alfamart', amountRupiah: 45000, category: 'belanja' },
  { description: 'Paket Data Internet 25GB', amountRupiah: 75000, category: 'tagihan' },
  { description: 'Tiket Bioskop XXI', amountRupiah: 50000, category: 'hiburan' },
  { description: 'Vitamin C & Paracetamol', amountRupiah: 28000, category: 'kesehatan' },
  { description: 'Print Skripsi & Jilid', amountRupiah: 18000, category: 'pendidikan' },
  { description: 'Makan Siang Soto Betawi', amountRupiah: 32000, category: 'makan' },
];

/**
 * Seed 10 sample transactions into IndexedDB if database is currently empty
 */
export async function seedSampleData(): Promise<number> {
  const count = await db.transactions.count();
  if (count > 0) return 0; // Already has data

  const today = getLocalTodayDate();
  // Generate dates ranging from today to 9 days ago
  const created: Transaction[] = [];

  for (let i = 0; i < SAMPLE_TRANSACTIONS.length; i++) {
    const sample = SAMPLE_TRANSACTIONS[i];
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const tx = await addTransaction({
      ...sample,
      date: dateStr,
    });
    created.push(tx);
  }

  return created.length;
}

// ==========================================
// TAHAP 10: BILL DRAFT REPOSITORY OPERATIONS
// ==========================================

export function createDefaultBillDraft(defaultUserName = 'Saya'): BillDraft {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`,
    title: 'Makan Bareng',
    date: getLocalTodayDate(),
    participants: [
      { id: 'p-1', name: defaultUserName },
    ],
    items: [],
    discountAmount: 0,
    taxType: 'percent',
    taxValue: 10,
    serviceType: 'percent',
    serviceValue: 5,
    payments: [],
    isFinalized: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSampleBillDraft(): BillDraft {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`,
    title: 'Makan Malam Seafood',
    date: getLocalTodayDate(),
    participants: [
      { id: 'p-1', name: 'Asep' },
      { id: 'p-2', name: 'Budi' },
      { id: 'p-3', name: 'Citra' },
    ],
    items: [
      { id: 'it-1', name: 'Nasi Goreng Spesial', price: 28000, quantity: 1, assignedParticipantIds: ['p-1'] },
      { id: 'it-2', name: 'Steak Ayam BBQ', price: 45000, quantity: 1, assignedParticipantIds: ['p-2'] },
      { id: 'it-3', name: 'Es Teh Manis', price: 5000, quantity: 3, assignedParticipantIds: ['p-1', 'p-2', 'p-3'] },
    ],
    discountAmount: 10000,
    taxType: 'percent',
    taxValue: 10,
    serviceType: 'percent',
    serviceValue: 5,
    payments: [],
    isFinalized: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Save or update a BillDraft in IndexedDB
 */
export async function saveBillDraft(draft: BillDraft): Promise<BillDraft> {
  const updated: BillDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.billDrafts.put(updated);
    return updated;
  } catch (error) {
    console.error('Gagal menyimpan draft tagihan ke IndexedDB:', error);
    throw new Error('Gagal menyimpan draft tagihan di penyimpanan lokal browser.');
  }
}

/**
 * Get bill draft by ID
 */
export async function getBillDraftById(id: string): Promise<BillDraft | undefined> {
  return await db.billDrafts.get(id);
}

/**
 * Retrieve all bill drafts sorted by updatedAt (descending)
 */
export async function getAllBillDrafts(): Promise<BillDraft[]> {
  return await db.billDrafts.orderBy('updatedAt').reverse().toArray();
}

/**
 * Delete a bill draft by ID
 */
export async function deleteBillDraft(id: string): Promise<void> {
  await db.billDrafts.delete(id);
}

/**
 * Clear all bill drafts
 */
export async function clearAllBillDrafts(): Promise<void> {
  await db.billDrafts.clear();
}

