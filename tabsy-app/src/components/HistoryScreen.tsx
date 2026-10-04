'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, CATEGORIES, ExpenseCategory } from '@/types';
import { formatRupiah, MAX_SAFE_NOMINAL } from '@/lib/domain/calculator';
import { updateTransaction, deleteTransaction, addTransaction, seedSampleData, getLocalTodayDate } from '@/lib/db';
import {
  Calendar,
  Search,
  Filter,
  Trash2,
  Edit3,
  Check,
  X,
  PlusCircle,
  TrendingDown,
  Clock,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface HistoryScreenProps {
  transactions: Transaction[];
  onTransactionsChanged: () => void;
  onGoToRecord: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  transactions,
  onTransactionsChanged,
  onGoToRecord,
}) => {
  const today = getLocalTodayDate();
  const currentMonthYear = today.substring(0, 7); // "YYYY-MM"

  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editCat, setEditCat] = useState<ExpenseCategory>('makan');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deletion modal state (Tahap 4 requirement: konfirmasi menyebut nama transaksi)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Undo delete feature (Should requirement from PRD)
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction | null>(null);

  // Toast feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Available months list derived from transactions
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthYear);
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions, currentMonthYear]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchMonth = selectedMonth === 'all' || t.date.startsWith(selectedMonth);
      const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchMonth && matchCategory && matchSearch;
    });
  }, [transactions, selectedMonth, selectedCategory, searchQuery]);

  // Calculations for Summary
  const totalToday = useMemo(() => {
    return transactions
      .filter((t) => t.date === today)
      .reduce((sum, cur) => sum + cur.amountRupiah, 0);
  }, [transactions, today]);

  const totalSelectedMonth = useMemo(() => {
    return transactions
      .filter((t) => selectedMonth === 'all' || t.date.startsWith(selectedMonth))
      .reduce((sum, cur) => sum + cur.amountRupiah, 0);
  }, [transactions, selectedMonth]);

  const handleStartEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditDesc(t.description);
    setEditAmount(t.amountRupiah);
    setEditCat(t.category);
    setEditDate(t.date);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction || isSavingEdit) return;

    setEditError(null);
    const nominal = typeof editAmount === 'number' ? editAmount : parseInt(String(editAmount), 10);

    if (!editDesc.trim()) {
      setEditError('Nama pengeluaran tidak boleh kosong.');
      return;
    }

    if (editDesc.trim().length > 100) {
      setEditError('Nama pengeluaran maksimal 100 karakter.');
      return;
    }

    if (!nominal || isNaN(nominal) || nominal <= 0 || !Number.isSafeInteger(nominal)) {
      setEditError('Nominal harus berupa bilangan bulat positif.');
      return;
    }

    if (nominal > MAX_SAFE_NOMINAL) {
      setEditError('Nominal melebihi batas maksimal Rp1.000.000.000.');
      return;
    }

    setIsSavingEdit(true);
    try {
      // updateTransaction strictly preserves id and createdAt, only updates updatedAt
      await updateTransaction(editingTransaction.id, {
        description: editDesc.trim(),
        amountRupiah: nominal,
        category: editCat,
        date: editDate,
      });

      setEditingTransaction(null);
      setFeedbackMsg({
        type: 'success',
        text: `Transaksi "${editDesc.trim()}" berhasil diperbarui!`,
      });
      onTransactionsChanged();
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui transaksi.';
      setEditError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || isDeleting) return;

    setIsDeleting(true);
    const target = transactionToDelete;

    try {
      await deleteTransaction(target.id);
      setRecentlyDeleted(target);
      setTransactionToDelete(null);
      setFeedbackMsg({
        type: 'info',
        text: `Transaksi "${target.description}" (${formatRupiah(target.amountRupiah)}) telah dihapus.`,
      });
      onTransactionsChanged();

      // Clear undo option after 8 seconds
      setTimeout(() => {
        setRecentlyDeleted((prev) => (prev?.id === target.id ? null : prev));
      }, 8000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus transaksi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUndoDelete = async () => {
    if (!recentlyDeleted) return;

    try {
      // Re-add the deleted transaction restoring its original ID and timestamps
      await addTransaction({
        id: recentlyDeleted.id,
        description: recentlyDeleted.description,
        amountRupiah: recentlyDeleted.amountRupiah,
        category: recentlyDeleted.category,
        date: recentlyDeleted.date,
      });

      const restoredDesc = recentlyDeleted.description;
      setRecentlyDeleted(null);
      setFeedbackMsg({
        type: 'success',
        text: `Berhasil membatalkan hapus "${restoredDesc}".`,
      });
      onTransactionsChanged();
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Failed to undo deletion:', err);
    }
  };

  const handleSeed = async () => {
    const count = await seedSampleData();
    if (count > 0) {
      setFeedbackMsg({
        type: 'success',
        text: `Berhasil memuat ${count} data transaksi contoh!`,
      });
      onTransactionsChanged();
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      alert('Data sudah ada. Anda bisa mencatat transaksi baru secara langsung.');
    }
  };

  const getCategoryBadge = (catId: ExpenseCategory) => {
    const found = CATEGORIES.find((c) => c.id === catId);
    return found ? (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${found.color}`}>
        {found.label}
      </span>
    ) : (
      <span className="text-[11px] text-slate-500">{catId}</span>
    );
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>

          {/* Undo Action Button */}
          {recentlyDeleted && (
            <button
              onClick={handleUndoDelete}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Hari Ini ({today})</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {formatRupiah(totalToday)}
          </div>
          <p className="text-[10px] text-slate-400">
            {transactions.filter((t) => t.date === today).length} transaksi hari ini
          </p>
        </div>

        {/* Total Selected Month */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <TrendingDown className="w-3.5 h-3.5 text-blue-500" />
            <span>Bulan Ini ({selectedMonth === 'all' ? 'Semua' : selectedMonth})</span>
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totalSelectedMonth)}
          </div>
          <p className="text-[10px] text-slate-400">{filtered.length} transaksi terfilter</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Seed Button */}
          {transactions.length < 5 && (
            <button
              onClick={handleSeed}
              className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-lg flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              + 10 Data Contoh
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi (cth: kopi, bensin, kos)..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        {/* Category Horizontal Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Semua ({transactions.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = transactions.filter((t) => t.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat.label} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Belum ada transaksi yang sesuai
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Coba ubah kata kunci pencarian atau catat pengeluaran baru.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={onGoToRecord}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                + Catat Sekarang
              </button>
              <button
                onClick={handleSeed}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Muat 10 Data Contoh
              </button>
            </div>
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t.description}
                  </p>
                  {getCategoryBadge(t.category)}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t.date}
                  </span>
                  <span>•</span>
                  <span>ID: {t.id.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {formatRupiah(t.amountRupiah)}
                  </span>
                </div>

                {/* Actions: Edit and Delete */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(t)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={`Edit ${t.description}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTransactionToDelete(t)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title={`Hapus ${t.description}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL EDIT (Tahap 4 Requirement: Mempertahankan ID & createdAt, validasi safe integer) */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-500" />
                Edit Transaksi
              </h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {editError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengeluaran *
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={100}
                  className="w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal (Rupiah) *
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                  min="1"
                  max={MAX_SAFE_NOMINAL}
                  className="w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value as ExpenseCategory)}
                    className="w-full h-10 px-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                • ID: <span className="font-mono text-slate-500">{editingTransaction.id}</span> (dipertahankan)
                <br />
                • Dibuat: {new Date(editingTransaction.createdAt).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS (Tahap 4 Requirement: Menyebutkan Nama Transaksi Eksplisit) */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Transaksi?
                </h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                "{transactionToDelete.description}"
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 font-black">
                {formatRupiah(transactionToDelete.amountRupiah)}
              </p>
              <p className="text-[11px] text-slate-400">
                Tanggal: {transactionToDelete.date} • {getCategoryBadge(transactionToDelete.category)}
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus transaksi ini dari penyimpanan browser lokal Anda?
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTransactionToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
