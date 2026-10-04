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
  Users,
  History,
  Target,
  Plus,
  Camera,
} from 'lucide-react';
import { ReceiptScanModal } from './ReceiptScanModal';

interface RecordScreenProps {
  onTransactionSaved: () => void;
  userProfile: UserProfile;
  monthTotal: number;
  todayTotal: number;
  onNavigateTab?: (tab: 'catat' | 'split' | 'riwayat' | 'pengaturan') => void;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({
  onTransactionSaved,
  userProfile,
  monthTotal,
  todayTotal,
  onNavigateTab,
}) => {
  const [quickText, setQuickText] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('makan');
  const [date, setDate] = useState(getLocalTodayDate());
  const [isManualExpanded, setIsManualExpanded] = useState(false);

  // Privacy: Hide / show balance toggle
  const [hideBalance, setHideBalance] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

  const handleSaveOcrTransaction = async (data: {
    description: string;
    amountRupiah: number;
    date: string;
    category: string;
  }) => {
    try {
      setIsSaving(true);
      await addTransaction({
        description: data.description || 'Pengeluaran Struk',
        amountRupiah: data.amountRupiah,
        category: 'makan',
        date: data.date || getLocalTodayDate(),
      });
      setSuccessToast(`Struk ${data.description} (${formatRupiah(data.amountRupiah)}) berhasil dicatat!`);
      onTransactionSaved();
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan transaksi struk.');
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="max-w-md mx-auto px-4 py-4 space-y-5">
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

      {/* Layered Card Stack Effect (Matching Reference Image 1 & 2) */}
      <div className="relative pt-3">
        {/* Layer 2 Background Card */}
        <div className="absolute top-0 left-6 right-6 h-10 rounded-[28px] bg-sky-400/40 dark:bg-sky-900/30 -z-20 border border-white/20" />
        {/* Layer 1 Background Card */}
        <div className="absolute top-1.5 left-3 right-3 h-10 rounded-[28px] bg-sky-500/60 dark:bg-sky-900/50 -z-10 border border-white/30" />

        {/* Foreground Main Balance Card */}
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600 text-white p-6 shadow-[0_16px_36px_rgba(2,132,199,0.30)] space-y-4">
          {/* Subtle Ambient Light Shimmer */}
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-sky-300/20 blur-xl pointer-events-none" />

          {/* Card Top Row */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-extrabold text-sky-100 tracking-wider uppercase">
                Tabsy Balance
              </span>
            </div>

            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-colors"
              title={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
            >
              {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Balance Amount */}
          <div className="relative z-10 space-y-0.5">
            <span className="text-[11px] font-medium text-sky-100 uppercase tracking-wide">
              Pengeluaran Bulan Ini
            </span>
            <div className="text-3xl font-black tracking-tight text-white">
              {hideBalance ? '••••••••' : formatRupiah(monthTotal)}
            </div>
          </div>

          {/* Budget Progress Indicator */}
          <div className="relative z-10 space-y-2 pt-2 border-t border-white/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sky-100 font-medium">
                Limit: {formatRupiah(budget)}
              </span>
              <span className="font-extrabold text-white">
                Sisa: {hideBalance ? '••••' : formatRupiah(remainingBudget)} ({100 - budgetPercentage}%)
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                  budgetPercentage > 85
                    ? 'bg-amber-300 shadow-amber-300/50'
                    : 'bg-white shadow-white/50'
                }`}
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Circular Pastel Quick Actions Grid (Exact Match to Reference Image) */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* Action 1: Catat Cepat (Amber) */}
          <button
            onClick={() => {
              const el = document.getElementById('quick-input-field');
              el?.focus();
            }}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center shadow-sm group-hover:scale-110 group-active:scale-95 transition-all">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
              Catat
            </span>
          </button>

          {/* Action 2: Split Bill (Sky Blue) */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('split')}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-[52px] h-[52px] rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-500 flex items-center justify-center shadow-sm group-hover:scale-110 group-active:scale-95 transition-all">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
              Split Bill
            </span>
          </button>

          {/* Action 3: Aktivitas / Riwayat (Purple) */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('riwayat')}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-[52px] h-[52px] rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center shadow-sm group-hover:scale-110 group-active:scale-95 transition-all">
              <History className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
              Aktivitas
            </span>
          </button>

          {/* Action 4: Target Budget (Emerald) */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('pengaturan')}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-[52px] h-[52px] rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center shadow-sm group-hover:scale-110 group-active:scale-95 transition-all">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
              Budget
            </span>
          </button>
        </div>
      </div>

      {/* Quick OCR Banner */}
      <div className="p-4 rounded-[28px] bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 flex items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wide">Punya Foto Struk Belanja?</h4>
            <p className="text-[11px] text-blue-100">Pindai & catat otomatis dengan OCR lokal tanpa cloud.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowOcrModal(true)}
          className="px-3.5 py-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-black shadow-sm active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
        >
          <Camera className="w-3.5 h-3.5" />
          Scan Struk
        </button>
      </div>

      {/* Main Quick Input Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Input Cepat Transaksi
          </h2>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {date === getLocalTodayDate() ? 'Hari Ini' : date}
          </span>
        </div>

        {/* Input Box with Floating Action Icon */}
        <div className="space-y-2">
          <div className="relative">
            <input
              id="quick-input-field"
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder='Ketik "kopi 25k" atau "nasi 28000"...'
              className="w-full h-13 px-4 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner"
            />
          </div>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Coba:</span>
            {[
              'kopi 25k',
              'nasi padang 28000',
              'parkir 5rb',
              'bensin 35k',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickChipClick(chip)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Live Detected Card */}
        {hasPreview && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/40 to-transparent dark:from-sky-950/40 dark:via-blue-950/20 border border-sky-200 dark:border-sky-800/60 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-500" />
                Preview Otomatis
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Siap disimpan</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-base font-black text-slate-900 dark:text-white capitalize">
                  {description}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${activeCategoryInfo.color}`}>
                    {activeCategoryInfo.label}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {date}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-blue-600 dark:text-sky-400">
                  {formatRupiah(Number(amount))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Manual Adjustments */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setIsManualExpanded(!isManualExpanded)}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 flex items-center gap-1 transition-colors"
          >
            {isManualExpanded ? 'Sembunyikan form detail ▲' : 'Ubah tanggal / nominal / kategori lengkap ▼'}
          </button>
        </div>

        {/* Manual Expanded Fields */}
        {isManualExpanded && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengeluaran
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan"
                  maxLength={100}
                  className="w-full h-10 px-3 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal (Rupiah)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="25000"
                  min="1"
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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

        {/* Category Selector Grid */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
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
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold border text-left transition-all active:scale-95 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Action Save Button */}
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving || !description.trim() || !amount}
          className="w-full h-13 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-700 hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-all"
        >
          {isSaving ? (
            <span>Menyimpan ke Tabsy...</span>
          ) : (
            <>
              <span>+ Simpan Transaksi</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Receipt Scan Modal */}
      <ReceiptScanModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onSaveAsTransaction={handleSaveOcrTransaction}
        onImportToSplitBill={() => {
          onNavigateTab?.('split');
        }}
      />
    </div>
  );
};
