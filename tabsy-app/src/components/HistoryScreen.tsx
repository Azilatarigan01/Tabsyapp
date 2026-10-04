'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, CATEGORIES, ExpenseCategory } from '@/types';
import { formatRupiah } from '@/lib/domain/calculator';
import { updateTransaction, deleteTransaction, seedSampleData, getLocalTodayDate } from '@/lib/db';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCat, setEditCat] = useState<ExpenseCategory>('makan');
  const [editDate, setEditDate] = useState('');

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

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
    setEditingId(t.id);
    setEditDesc(t.description);
    setEditAmount(t.amountRupiah);
    setEditCat(t.category);
    setEditDate(t.date);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editDesc.trim() || editAmount <= 0) {
      alert('Deskripsi dan nominal harus valid.');
      return;
    }

    try {
      await updateTransaction(editingId, {
        description: editDesc.trim(),
        amountRupiah: editAmount,
        category: editCat,
        date: editDate,
      });
      setEditingId(null);
      setFeedbackMsg('Transaksi berhasil diperbarui!');
      onTransactionsChanged();
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui transaksi.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setDeletingId(null);
      setFeedbackMsg('Transaksi berhasil dihapus.');
      onTransactionsChanged();
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus transaksi.');
    }
  };

  const handleSeed = async () => {
    const count = await seedSampleData();
    if (count > 0) {
      setFeedbackMsg(`Berhasil memuat ${count} data contoh!`);
      onTransactionsChanged();
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      alert('Data sudah terisi. Anda bisa menambah transaksi baru secara manual.');
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          {feedbackMsg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Hari Ini</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {formatRupiah(totalToday)}
          </div>
          <p className="text-[10px] text-slate-400">Pengeluaran {today}</p>
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
          <p className="text-[10px] text-slate-400">{filtered.length} transaksi terdata</p>
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

          {/* Quick Seed Button if low transactions */}
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
                Coba ubah kata kunci filter atau catat transaksi pertama Anda.
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
          filtered.map((t) => {
            const isEditing = editingId === t.id;
            const isDeleting = deletingId === t.id;

            if (isEditing) {
              return (
                <div
                  key={t.id}
                  className="bg-emerald-50/50 dark:bg-slate-800/90 p-4 rounded-xl border border-emerald-400 dark:border-emerald-600 space-y-3 animate-in fade-in"
                >
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Edit Transaksi
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      placeholder="Nama"
                    />
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(parseInt(e.target.value, 10) || 0)}
                      className="px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      placeholder="Nominal"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    />
                    <select
                      value={editCat}
                      onChange={(e) => setEditCat(e.target.value as ExpenseCategory)}
                      className="px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 rounded text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Batal
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 rounded text-xs bg-emerald-600 text-white font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Simpan
                    </button>
                  </div>
                </div>
              );
            }

            return (
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
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t.date}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatRupiah(t.amountRupiah)}
                    </span>
                  </div>

                  {/* Actions: Edit and Delete */}
                  {isDeleting ? (
                    <div className="flex items-center gap-1 animate-in fade-in">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                        title="Ya, Hapus"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]"
                        title="Batal"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit transaksi"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(t.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
