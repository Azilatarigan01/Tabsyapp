'use client';

import React, { useState, useEffect } from 'react';
import { parseQuickInput } from '@/lib/domain/parser';
import { formatRupiah } from '@/lib/domain/calculator';
import { addTransaction, getLocalTodayDate } from '@/lib/db';
import { CATEGORIES, ExpenseCategory } from '@/types';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, Calendar, Tag } from 'lucide-react';

interface RecordScreenProps {
  onTransactionSaved: () => void;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({ onTransactionSaved }) => {
  const [quickText, setQuickText] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('makan');
  const [date, setDate] = useState(getLocalTodayDate());
  const [isManualExpanded, setIsManualExpanded] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time quick parsing
  useEffect(() => {
    if (!quickText.trim()) {
      return;
    }
    const parsed = parseQuickInput(quickText);
    if (parsed.description) {
      setDescription(parsed.description);
    }
    if (parsed.amountRupiah !== null) {
      setAmount(parsed.amountRupiah);
    }
    if (parsed.suggestedCategory) {
      setCategory(parsed.suggestedCategory);
    }
  }, [quickText]);

  const handleQuickChipClick = (example: string) => {
    setQuickText(example);
    const parsed = parseQuickInput(example);
    setDescription(parsed.description);
    if (parsed.amountRupiah !== null) setAmount(parsed.amountRupiah);
    if (parsed.suggestedCategory) setCategory(parsed.suggestedCategory);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setSuccessToast(`Berhasil menyimpan: ${description.trim()} (${formatRupiah(nominal)})`);
      // Reset form
      setQuickText('');
      setDescription('');
      setAmount('');
      setCategory('makan');
      setDate(getLocalTodayDate());
      setIsManualExpanded(false);

      onTransactionSaved();

      setTimeout(() => {
        setSuccessToast(null);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan transaksi. Coba lagi.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCategoryInfo = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const hasPreview = Boolean(description && amount && Number(amount) > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Pencatatan Kilat
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ketik singkat contoh: <span className="font-semibold text-slate-700 dark:text-slate-300">kopi 25k</span> atau <span className="font-semibold text-slate-700 dark:text-slate-300">parkir 5rb</span>
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {date === getLocalTodayDate() ? 'Hari Ini' : date}
          </span>
        </div>

        {/* Quick Input Input Box */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder='Ketik di sini (cth: "kopi 25k" atau "nasi 25000")...'
              className="w-full h-13 px-4 text-base rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Coba cepat:</span>
            {[
              'kopi 25k',
              'nasi padang 28000',
              'parkir 5rb',
              'bensin 35k',
              'paket data 50rb',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickChipClick(chip)}
                className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Card */}
        {hasPreview && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Hasil Deteksi Otomatis
              </span>
              <span className="text-[11px] font-normal text-slate-500">Siap disimpan</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-white capitalize">
                  {description}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${activeCategoryInfo.color}`}>
                    {activeCategoryInfo.label}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {date}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
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
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 flex items-center gap-1"
          >
            {isManualExpanded ? 'Sembunyikan form manual ▲' : 'Ubah tanggal / kategori / form lengkap ▼'}
          </button>
        </div>

        {/* Manual Expanded Fields */}
        {isManualExpanded && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengeluaran
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan"
                  maxLength={100}
                  className="w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nominal (Rupiah)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="25000"
                  min="1"
                  max="1000000000"
                  className="w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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

        {/* Category Quick Selector Chips */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Pilih Kategori:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !description.trim() || !amount}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99]"
        >
          {isSaving ? (
            <span>Menyimpan ke IndexedDB...</span>
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
