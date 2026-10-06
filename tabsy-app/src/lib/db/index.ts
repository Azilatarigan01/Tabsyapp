import Dexie, { type EntityTable } from 'dexie';
import { Transaction, ExpenseCategory, BillDraft, DailyActivity, DailyHabit } from '@/types';
import { MAX_SAFE_NOMINAL } from '@/lib/domain/calculator';
import { getCurrentSession } from './auth';

export class CatatCepatDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  billDrafts!: EntityTable<BillDraft, 'id'>;
  activities!: EntityTable<DailyActivity, 'id'>;
  habits!: EntityTable<DailyHabit, 'id'>;

  constructor() {
    super('CatatCepatDB');
    this.version(1).stores({
      transactions: 'id, date, category, createdAt',
    });

    // Version 2 Migration: Add billDrafts store for item-level bills & receipt splits
    this.version(2).stores({
      transactions: 'id, date, category, createdAt',
      billDrafts: 'id, date, title, isFinalized, updatedAt',
    }).upgrade(() => {
      // Preserve existing data without modification
    });

    // Version 3 Migration: Add activities & habits store for Daily Companion
    this.version(3).stores({
      transactions: 'id, date, category, createdAt',
      billDrafts: 'id, date, title, isFinalized, updatedAt',
      activities: 'id, date, timeStart, category, isCompleted',
      habits: 'id, category, streak',
    }).upgrade(() => {
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
  const currentSession = getCurrentSession();
  const newTransaction: Transaction = {
    id: dto.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
    userId: currentSession?.id,
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
 * Retrieve all transactions sorted by date (descending), isolated per user
 */
export async function getAllTransactions(userId?: string): Promise<Transaction[]> {
  const currentSession = getCurrentSession();
  const uid = userId !== undefined ? userId : currentSession?.id;
  const list = await db.transactions.orderBy('date').reverse().toArray();
  if (uid) {
    return list.filter((t) => t.userId === uid);
  }
  return list.filter((t) => !t.userId);
}

/**
 * Retrieve transactions for a specific month (e.g. "2026-10"), isolated per user
 */
export async function getTransactionsByMonth(yearMonth: string, userId?: string): Promise<Transaction[]> {
  const currentSession = getCurrentSession();
  const uid = userId !== undefined ? userId : currentSession?.id;
  const list = await db.transactions
    .where('date')
    .between(`${yearMonth}-01`, `${yearMonth}-31`, true, true)
    .reverse()
    .sortBy('date');
  if (uid) {
    return list.filter((t) => t.userId === uid);
  }
  return list.filter((t) => !t.userId);
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

// ==========================================
// DAILY COMPANION: ACTIVITIES & HABITS HELPERS
// ==========================================

export async function getDailyActivities(date: string, userId?: string): Promise<DailyActivity[]> {
  try {
    const currentSession = getCurrentSession();
    const uid = userId !== undefined ? userId : currentSession?.id;
    let list = await db.activities.where('date').equals(date).toArray();
    if (uid) {
      list = list.filter((a) => a.userId === uid);
    } else {
      list = list.filter((a) => !a.userId);
    }
    return list.sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  } catch (err) {
    console.error('Gagal mengambil jadwal aktivitas harian:', err);
    return [];
  }
}

export async function addDailyActivity(
  data: Omit<DailyActivity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DailyActivity> {
  const currentSession = getCurrentSession();
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newActivity: DailyActivity = {
    ...data,
    id,
    userId: data.userId || currentSession?.id,
    createdAt: now,
    updatedAt: now,
  };
  await db.activities.add(newActivity);
  return newActivity;
}

export async function updateDailyActivity(
  id: string,
  updates: Partial<DailyActivity>
): Promise<void> {
  const existing = await db.activities.get(id);
  if (!existing) return;
  await db.activities.put({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function toggleDailyActivity(id: string): Promise<boolean> {
  const existing = await db.activities.get(id);
  if (!existing) return false;
  const newStatus = !existing.isCompleted;
  await db.activities.update(id, {
    isCompleted: newStatus,
    updatedAt: new Date().toISOString(),
  });
  return newStatus;
}

export async function deleteDailyActivity(id: string): Promise<void> {
  await db.activities.delete(id);
}

export async function getDailyHabits(userId?: string): Promise<DailyHabit[]> {
  try {
    const currentSession = getCurrentSession();
    const uid = userId !== undefined ? userId : currentSession?.id;
    let items = await db.habits.toArray();
    if (uid) {
      items = items.filter((h) => h.userId === uid);
    } else {
      items = items.filter((h) => !h.userId);
    }
    return items;
  } catch (err) {
    console.error('Gagal mengambil daftar habit harian:', err);
    return [];
  }
}

export async function addDailyHabit(
  data: Omit<DailyHabit, 'id' | 'createdAt' | 'streak' | 'completedDates'>
): Promise<DailyHabit> {
  const currentSession = getCurrentSession();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newHabit: DailyHabit = {
    ...data,
    id,
    userId: data.userId || currentSession?.id,
    completedDates: [],
    streak: 0,
    createdAt: new Date().toISOString(),
  };
  await db.habits.add(newHabit);
  return newHabit;
}

export async function toggleDailyHabit(id: string, date: string): Promise<void> {
  const habit = await db.habits.get(id);
  if (!habit) return;

  const datesSet = new Set(habit.completedDates || []);
  if (datesSet.has(date)) {
    datesSet.delete(date);
  } else {
    datesSet.add(date);
  }

  const updatedDates = Array.from(datesSet).sort();
  // Simple streak recalculation: consecutive days ending today or yesterday
  const streak = updatedDates.length;

  await db.habits.update(id, {
    completedDates: updatedDates,
    streak,
  });
}

export async function deleteDailyHabit(id: string): Promise<void> {
  await db.habits.delete(id);
}

/**
 * Seed initial companion habits & sample agenda if empty
 */
export async function seedStarterCompanionDataIfEmpty(): Promise<void> {
  try {
    const habitCount = await db.habits.count();
    if (habitCount === 0) {
      const today = getLocalTodayDate();
      const defaultHabits: DailyHabit[] = [
        {
          id: 'hab-water',
          title: 'Minum 2L Air Putih',
          icon: '💧',
          category: 'health',
          targetFrequency: 'daily',
          completedDates: [today],
          streak: 3,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'hab-nospend',
          title: '0 Belanja Impulsif (Disiplin Budget)',
          icon: '💰',
          category: 'finance',
          targetFrequency: 'daily',
          completedDates: [today],
          streak: 5,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'hab-workout',
          title: 'Olahraga / Jalan 20 Menit',
          icon: '🏃',
          category: 'health',
          targetFrequency: 'daily',
          completedDates: [],
          streak: 2,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'hab-track',
          title: 'Catat Semua Pengeluaran Hari Ini',
          icon: '⚡',
          category: 'finance',
          targetFrequency: 'daily',
          completedDates: [today],
          streak: 4,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'hab-read',
          title: 'Membaca / Belajar Skill 15 Menit',
          icon: '📖',
          category: 'productivity',
          targetFrequency: 'daily',
          completedDates: [],
          streak: 1,
          createdAt: new Date().toISOString(),
        },
      ];
      await db.habits.bulkAdd(defaultHabits);
    }

    const todayStr = getLocalTodayDate();
    const actCount = await db.activities.where('date').equals(todayStr).count();
    if (actCount === 0) {
      const defaultActivities: DailyActivity[] = [
        {
          id: `act-1-${Date.now()}`,
          title: 'Sarapan Sehat & Kopi Pagi',
          timeStart: '07:30',
          timeEnd: '08:15',
          date: todayStr,
          category: 'meal',
          isCompleted: true,
          estimatedCost: 20000,
          notes: 'Sarapan roti panggang + es kopi susu',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `act-2-${Date.now()}`,
          title: 'Makan Siang Bareng Teman Kantor',
          timeStart: '12:00',
          timeEnd: '13:00',
          date: todayStr,
          category: 'meal',
          isCompleted: false,
          estimatedCost: 45000,
          notes: 'Makan di resto dekat kantor, bisa split bill patungan',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `act-3-${Date.now()}`,
          title: 'Ngantor / Belajar Fokus & Review Tugas',
          timeStart: '14:00',
          timeEnd: '17:00',
          date: todayStr,
          category: 'work',
          isCompleted: false,
          notes: 'Fokus kerjaan harian tanpa gangguan',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `act-4-${Date.now()}`,
          title: 'Jogging Sore / Fitness',
          timeStart: '17:30',
          timeEnd: '18:30',
          date: todayStr,
          category: 'health',
          isCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      await db.activities.bulkAdd(defaultActivities);
    }
  } catch (err) {
    console.error('Error seeding starter companion data:', err);
  }
}

