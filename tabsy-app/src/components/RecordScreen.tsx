'use client';

import React, { useState, useEffect } from 'react';
import { parseQuickInput } from '@/lib/domain/parser';
import { formatRupiah } from '@/lib/domain/calculator';
import { calculateSafeToSpendToday } from '@/lib/domain/safeToSpend';
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
  CalendarCheck,
  ShieldCheck,
  Bot,
  Zap,
  Check,
} from 'lucide-react';

interface RecordScreenProps {
  onTransactionSaved: () => void;
  userProfile: UserProfile;
  monthTotal: number;
  todayTotal: number;
  onNavigateTab?: (tab: 'catat' | 'jadwal' | 'split' | 'riwayat' | 'pengaturan') => void;
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

  // Natural Language AI Input State
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [parsedExpenseResult, setParsedExpenseResult] = useState<{
    title: string;
    amount: number;
    category: string;
    categoryKey: ExpenseCategory;
    tagged_person: string | null;
    source: 'ai' | 'smart_rules';
  } | null>(null);

  // Fitur 4: Dynamic "Safe-to-Spend" Today
  const budget = userProfile?.monthlyBudget || 3500000;
  const budgetPercentage = Math.min(100, Math.round((monthTotal / budget) * 100));
  const remainingBudget = Math.max(0, budget - monthTotal);

  const safeToSpend = React.useMemo(() => {
    return calculateSafeToSpendToday({
      monthlyBudget: budget,
      totalSpentMonth: monthTotal,
      spentToday: todayTotal,
      paydayDate: userProfile?.paydayDate || 25,
    });
  }, [budget, monthTotal, todayTotal, userProfile?.paydayDate]);

  // Real-time quick parsing
  useEffect(() => {
    if (!quickText.trim()) return;
    const parsed = parseQuickInput(quickText);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.amountRupiah !== null) setAmount(parsed.amountRupiah);
    if (parsed.suggestedCategory) setCategory(parsed.suggestedCategory);
  }, [quickText]);

  // Fitur 1: Natural Language Processing (/api/parse-expense with AI & Fallback)
  const handleProcessNaturalLanguage = async (textToProcess?: string) => {
    const text = (textToProcess || quickText).trim();
    if (!text) {
      setErrorMessage('Ketik kalimat transaksi terlebih dahulu (contoh: kopi kenangan 24k @dimas)');
      return;
    }
    setIsAiProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengekstrak kalimat transaksi.');
      }
      setDescription(data.title);
      setAmount(data.amount);
      setCategory(data.categoryKey);
      setParsedExpenseResult(data);
    } catch (err) {
      // Fallback: Smart local rule parser
      const fallback = parseQuickInput(text);
      if (fallback.isValid && fallback.amountRupiah) {
        let cleanTitle = fallback.description;
        const tagMatch = text.match(/@([a-zA-Z0-9_.-]+)/);
        const taggedPerson = tagMatch ? tagMatch[1] : null;
        if (tagMatch) cleanTitle = cleanTitle.replace(tagMatch[0], '').trim();

        const catKey = fallback.suggestedCategory || 'makan';
        setDescription(cleanTitle || 'Pengeluaran');
        setAmount(fallback.amountRupiah);
        setCategory(catKey);
        setParsedExpenseResult({
          title: cleanTitle || 'Pengeluaran',
          amount: fallback.amountRupiah,
          category: catKey,
          categoryKey: catKey,
          tagged_person: taggedPerson,
          source: 'smart_rules',
        });
      } else {
        setErrorMessage(
          (err as Error).message ||
          'Format tidak dikenali. Masukkan contoh: "kopi kenangan 24k @dimas"'
        );
      }
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleQuickChipClick = (example: string) => {
    setQuickText(example);
    handleProcessNaturalLanguage(example);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
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

      {/* Responsive 2-Column Grid on Desktop / Tablet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Balance Card & Input Form */}
        <div className="lg:col-span-7 space-y-5">
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

          {/* Fitur 4: Dynamic "Safe-to-Spend" Today Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-blue-50 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none">
                    Batas Belanja Dinamis
                  </span>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    Batas Aman Hari Ini
                  </h3>
                </div>
              </div>

              <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                safeToSpend.status === 'safe'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : safeToSpend.status === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}>
                {safeToSpend.statusLabel}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatRupiah(safeToSpend.dailySafeQuota)}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold ml-1.5">
                  / hari
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Sisa Kuota: {formatRupiah(Math.max(0, safeToSpend.remainingQuotaToday))}
                </span>
                <span className="text-[10px] text-slate-400">
                  {safeToSpend.daysRemainingToPayday} hari lagi gajian
                </span>
              </div>
            </div>

            {/* Daily Consumption Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    safeToSpend.status === 'safe'
                      ? 'bg-blue-600'
                      : safeToSpend.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, safeToSpend.percentageUsedToday)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>Terpakai Hari Ini: {formatRupiah(todayTotal)}</span>
                <span>{safeToSpend.percentageUsedToday}%</span>
              </div>
            </div>

            {/* Dynamic Insight Banner */}
            <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-1.5 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <span>{safeToSpend.insightMessage}</span>
            </p>
          </div>

      {/* 4 Circular Pastel Quick Actions Grid (Exact Match to Reference Image) */}
      {/* Modern Fintech Quick Action Shortcut Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        <button
          onClick={() => {
            const el = document.getElementById('quick-input-field');
            el?.focus();
          }}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Baru</span>
        </button>

        <button
          onClick={() => onNavigateTab && onNavigateTab('jadwal')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Agenda Hari Ini</span>
        </button>

        <button
          onClick={() => onNavigateTab && onNavigateTab('split')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Users className="w-3.5 h-3.5 text-sky-600" />
          <span>Bagi Tagihan</span>
        </button>

        <button
          onClick={() => onNavigateTab && onNavigateTab('riwayat')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <History className="w-3.5 h-3.5 text-purple-600" />
          <span>Riwayat</span>
        </button>
      </div>

      {/* Main Quick Input Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Catat Pengeluaran
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ketik santai dengan format otomatis atau sesuaikan formulir
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {date === getLocalTodayDate() ? 'Hari Ini' : date}
          </span>
        </div>

        {/* Input Box with Floating Action Icon */}
        <div className="space-y-2">
          <div className="relative flex gap-2">
            <input
              id="quick-input-field"
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProcessNaturalLanguage();
              }}
              placeholder='Ketik bebas: "kopi kenangan 24k @dimas" atau "nasi padang 28rb"...'
              className="w-full h-13 px-4 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner"
            />
            <button
              type="button"
              onClick={() => handleProcessNaturalLanguage()}
              disabled={isAiProcessing || !quickText.trim()}
              className="h-13 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Ekstrak Otomatis (AI)"
            >
              {isAiProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span className="hidden sm:inline">Proses Otomatis</span>
            </button>
          </div>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Coba:</span>
            {[
              'kopi kenangan 24k @dimas',
              'nasi padang 28rb',
              'isi bensin 50k @andi',
              'martabak 35.000',
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

        {/* Tagged Person Quick Split Bill Suggestion */}
        {parsedExpenseResult?.tagged_person && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">👥</span>
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 block">
                  Terdeteksi tag: @{parsedExpenseResult.tagged_person}
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                  Mau langsung bagi tagihan ini bersama {parsedExpenseResult.tagged_person}?
                </span>
              </div>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('split')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0"
              >
                Buka Split Bill →
              </button>
            )}
          </div>
        )}

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
      </div>

      {/* Right Column: Daily Progress, Metrics & Split Bill Promo (Matching Reference Screens 2 & 3) */}
      <div className="lg:col-span-5 space-y-5">
        
        {/* Daily Progress & Budget Score Card (Matching Screen 2 Circle Metric) */}
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Ringkasan Harian
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Daily Budget Progress
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-sky-400">
              Hari Ini
            </span>
          </div>

          <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            {/* Circular Progress Ring */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600 dark:text-sky-400 transition-all duration-700"
                  strokeDasharray={`${Math.min(100, Math.round((todayTotal / Math.max(1, Math.round(budget / 30))) * 100))}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {Math.min(100, Math.round((todayTotal / Math.max(1, Math.round(budget / 30))) * 100))}%
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">
                Pengeluaran Hari Ini:
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {formatRupiah(todayTotal)}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Jatah harian: ~{formatRupiah(Math.round(budget / 30))}
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid (Matching Screen 2 & 3 in reference) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Sisa Bulan Ini</span>
              <p className="text-sm font-black text-blue-600 dark:text-sky-400">
                {formatRupiah(remainingBudget)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Limit Bulanan</span>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formatRupiah(budget)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Split Bill Card */}
        <div className="p-6 rounded-[28px] bg-gradient-to-br from-indigo-50 via-blue-50/70 to-sky-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-100/90 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md shadow-blue-500/20 shrink-0">
              🍕
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-sky-400">
                Fitur Unggulan
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Split Bill Adil & Rp0 Selisih
              </h4>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Patungan makan bareng teman? Hitung proporsional pajak, service, dan diskon per menu pesanan masing-masing.
          </p>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('split')}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <span>Buka Kalkulator Split Bill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  </div>
);
};
