import Dexie, { type EntityTable } from 'dexie';
import { Transaction } from '@/types';

export class CatatCepatDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;

  constructor() {
    super('CatatCepatDB');
    this.version(1).stores({
      transactions: 'id, date, category, createdAt',
    });
  }
}

export const db = new CatatCepatDatabase();

// Repository helper functions
export async function addTransaction(transaction: Transaction): Promise<string> {
  return await db.transactions.add(transaction);
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<number> {
  return await db.transactions.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return await db.transactions.orderBy('date').reverse().toArray();
}

export async function getTransactionsByMonth(yearMonth: string): Promise<Transaction[]> {
  // yearMonth format: "YYYY-MM"
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

export async function importTransactions(incoming: Transaction[]): Promise<ImportResult> {
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
}

export async function clearAllTransactions(): Promise<void> {
  await db.transactions.clear();
}
