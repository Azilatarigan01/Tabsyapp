'use client';

import React, { useState, useEffect } from 'react';
import { parseQuickInput } from '@/lib/domain/parser';
import { formatRupiah } from '@/lib/domain/calculator';
import { addTransaction, getLocalTodayDate } from '@/lib/db';
import { CATEGORIES, ExpenseCategory, UserProfile } from '@/types';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Tag,
  CreditCard,
  Eye,
  EyeOff,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';

interface RecordScreenProps {
  onTransactionSaved: () => void;
  userProfile: UserProfile;
  monthTotal: number;
  todayTotal: number;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({
  onTransactionSaved,
  userProfile,
  monthTotal,
  todayTotal,
}) => {
  const [quickText, setQuickText] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('makan');
  const [date, setDate] = useState(getLocalTodayDate());
  const [isManualExpanded, setIsManualExpanded] = useState(false);

  // Privacy: Hide / show balance toggle (like fintech apps in reference images)
  const [hideBalance, setHideBalance] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Budget calculations
  const budget = userProfile?.monthlyBudget || 3500000;
  const budgetPercentage = Math.min(100, Math.round((monthTotal / budget) * 100));
  const remainingBudget = Math.max(0, budget - monthTotal);

  // Real-time quick parsing
  useEffect(() => {
    if (!quickText.trim()) return;
    const parsed = parseQuickInput(quickText);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.amountRupiah !== null) setAmount(parsed.amountRupiah);
    if (parsed.suggestedCategory) setCategory(parsed.suggestedCategory);
  }, [quickText]);

  const handleQuickChipClick = (example: string) => {
    setQuickText(example);
    const parsed = parseQuickInput(example);
    setDescription(parsed.description);
    if (parsed.amountRupiah !== null) setAmount(parsed.amountRupiah);
    if (parsed.suggestedCategory) setCategory(parsed.suggestedCategory);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    setErrorMessage(null);
    const nominal = typeof amount === 'number' ? amount : parseInt(String(amount), 10);

    if (!description.trim()) {
      setErrorMessage('Deskripsi pengeluaran tidak boleh kosong.');
      return;
    }

    if (!nominal || isNaN(nominal) || nominal <= 0) {
      setErrorMessage('Nominal harus berupa angka bulat lebih dari 0.');
      return;
    }

    setIsSaving(true);
    try {
      await addTransaction({
        description: description.trim(),
        amountRupiah: nominal,
        category,
        date,
      });

      setSuccessToast(`Berhasil dicatat: ${description.trim()} (${formatRupiah(nominal)})`);
      setQuickText('');
      setDescription('');
      setAmount('');
      setCategory('makan');
      setDate(getLocalTodayDate());
      setIsManualExpanded(false);

      onTransactionSaved();
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan transaksi.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCategoryInfo = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const hasPreview = Boolean(description && amount && Number(amount) > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="text-xs font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Modern Neo-Banking Balance Card (Matching Reference Images) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white p-6 shadow-xl shadow-sky-600/20 space-y-4">
        {/* Subtle decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute right-12 -bottom-10 w-32 h-32 rounded-full bg-sky-300/20 blur-lg pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-200" />
            <span className="text-xs font-semibold text-sky-100 tracking-wide uppercase">
              Tabsy Card
            </span>
          </div>

          <button
            onClick={() => setHideBalance(!hideBalance)}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-colors"
            title={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
          >
            {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative z-10 space-y-1">
          <span className="text-xs text-sky-200 font-medium">Total Pengeluaran Bulan Ini</span>
          <div className="text-3xl font-black tracking-tight text-white">
            {hideBalance ? '••••••••' : formatRupiah(monthTotal)}
          </div>
        </div>

        {/* Budget Progress Indicator */}
        <div className="relative z-10 space-y-2 pt-2 border-t border-white/15">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sky-200">
              Anggaran: {formatRupiah(budget)}
            </span>
            <span className="font-bold text-white">
              Sisa: {hideBalance ? '••••' : formatRupiah(remainingBudget)} ({100 - budgetPercentage}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercentage > 85 ? 'bg-amber-300' : 'bg-white'
              }`}
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Quick Input Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500" />
            Catat Kilat
          </h2>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
            {date === getLocalTodayDate() ? 'Hari Ini' : date}
          </span>
        </div>

        {/* Quick Input Box */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder='Contoh: "kopi 25k" atau "nasi padang 28000"...'
              className="w-full h-13 px-4 text-sm font-medium rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium">Contoh:</span>
            {[
              'kopi 25k',
              'nasi goreng 28000',
              'parkir 5rb',
              'bensin 35k',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickChipClick(chip)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Live Detected Card */}
        {hasPreview && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-transparent border border-sky-500/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-500" />
                Hasil Deteksi Otomatis
              </span>
              <span className="text-[11px] font-normal text-slate-500">Klik Simpan untuk mencatat</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-white capitalize">
                  {description}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${activeCategoryInfo.color}`}>
                    {activeCategoryInfo.label}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {date}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                  {formatRupiah(Number(amount))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Manual Adjustments */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsManualExpanded(!isManualExpanded)}
            className="text-xs font-semibold text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 transition-colors"
          >
            {isManualExpanded ? 'Sembunyikan form detail ▲' : 'Sesuaikan tanggal / nominal / kategori lengkap ▼'}
          </button>
        </div>

        {/* Manual Expanded Fields */}
        {isManualExpanded && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengeluaran
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan"
                  maxLength={100}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal (Rupiah)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="25000"
                  min="1"
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Category Pills Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Kategori Pengeluaran:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-sm'
                      : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving || !description.trim() || !amount}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all"
        >
          {isSaving ? (
            <span>Menyimpan ke Tabsy...</span>
          ) : (
            <>
              <span>Simpan Pengeluaran</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
