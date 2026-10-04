'use client';

import React, { useState, useMemo } from 'react';
import { calculateSplitBill, formatRupiah, roundHalfUp, percentToBps } from '@/lib/domain/calculator';
import { FeeInputType } from '@/types';
import {
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  Share2,
  Info,
  Calculator,
  UtensilsCrossed,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface BillItem {
  id: string;
  name: string;
  price: number;
  sharedWith: string[]; // participant names
}

export const SplitBillScreen: React.FC = () => {
  // Mode: 'rata' (Bagi Rata) | 'item' (Pesanan per Item)
  const [splitMode, setSplitMode] = useState<'rata' | 'item'>('rata');

  // Common fee settings
  const [hasTax, setHasTax] = useState(true);
  const [hasService, setHasService] = useState(true);
  const [taxType, setTaxType] = useState<FeeInputType>('percent');
  const [taxValue, setTaxValue] = useState<number | ''>(10);
  const [serviceType, setServiceType] = useState<FeeInputType>('percent');
  const [serviceValue, setServiceValue] = useState<number | ''>(5);

  const [participants, setParticipants] = useState<string[]>(['Asep', 'Budi', 'Citra']);
  const [newParticipant, setNewParticipant] = useState('');
  const [copied, setCopied] = useState(false);

  // Mode 1: Bagi Rata State
  const [subtotalSimple, setSubtotalSimple] = useState<number | ''>(100000);

  // Mode 2: Per Item State
  const [items, setItems] = useState<BillItem[]>([
    { id: 'item-1', name: 'Nasi Goreng Spesial', price: 28000, sharedWith: ['Asep'] },
    { id: 'item-2', name: 'Steak Ayam BBQ', price: 45000, sharedWith: ['Budi'] },
    { id: 'item-3', name: 'Es Teh Manis (3 gelas)', price: 15000, sharedWith: ['Asep', 'Budi', 'Citra'] },
    { id: 'item-4', name: 'Kentang Goreng Platter', price: 27000, sharedWith: ['Citra', 'Asep'] },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');
  const [newItemSharedWith, setNewItemSharedWith] = useState<string[]>(['Asep']);

  // Effective Tax and Service values based on toggle
  const effectiveTaxVal = hasTax ? (typeof taxValue === 'number' ? taxValue : parseFloat(String(taxValue)) || 0) : 0;
  const effectiveSrvVal = hasService ? (typeof serviceValue === 'number' ? serviceValue : parseFloat(String(serviceValue)) || 0) : 0;

  // Calculation for Mode 1 (Bagi Rata)
  const calculationSimple = useMemo(() => {
    const subNum = typeof subtotalSimple === 'number' ? subtotalSimple : parseInt(String(subtotalSimple), 10);
    if (!subNum || subNum <= 0 || participants.length === 0) return null;

    try {
      return calculateSplitBill({
        subtotal: subNum,
        taxType,
        taxValue: effectiveTaxVal,
        serviceType,
        serviceValue: effectiveSrvVal,
        participants,
      });
    } catch {
      return null;
    }
  }, [subtotalSimple, taxType, effectiveTaxVal, serviceType, effectiveSrvVal, participants]);

  // Calculation for Mode 2 (Split per Item)
  const calculationItemMode = useMemo(() => {
    if (items.length === 0 || participants.length === 0) return null;

    // Subtotal is sum of all item prices
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    if (subtotal <= 0) return null;

    // Calculate tax & service
    let taxAmount = 0;
    if (hasTax) {
      if (taxType === 'percent') {
        const bps = percentToBps(effectiveTaxVal);
        taxAmount = roundHalfUp((subtotal * bps) / 10000);
      } else {
        taxAmount = Math.round(effectiveTaxVal);
      }
    }

    let serviceAmount = 0;
    if (hasService) {
      if (serviceType === 'percent') {
        const bps = percentToBps(effectiveSrvVal);
        serviceAmount = roundHalfUp((subtotal * bps) / 10000);
      } else {
        serviceAmount = Math.round(effectiveSrvVal);
      }
    }

    const total = subtotal + taxAmount + serviceAmount;

    // Calculate base item cost per participant
    const participantBases: Record<string, number> = {};
    participants.forEach((p) => {
      participantBases[p] = 0;
    });

    items.forEach((item) => {
      const consumers = item.sharedWith.filter((name) => participants.includes(name));
      if (consumers.length > 0) {
        const sharePrice = Math.floor(item.price / consumers.length);
        const remainder = item.price % consumers.length;
        consumers.forEach((consumer, idx) => {
          const extra = idx < remainder ? 1 : 0;
          participantBases[consumer] = (participantBases[consumer] || 0) + sharePrice + extra;
        });
      }
    });

    // Allocate Tax and Service proportionally to each participant's item subtotal
    const shares = participants.map((name) => {
      const pSubtotal = participantBases[name] || 0;
      const ratio = subtotal > 0 ? pSubtotal / subtotal : 0;

      const pTax = roundHalfUp(taxAmount * ratio);
      const pSrv = roundHalfUp(serviceAmount * ratio);
      const rawFinal = pSubtotal + pTax + pSrv;

      return {
        name,
        itemSubtotal: pSubtotal,
        taxShare: pTax,
        serviceShare: pSrv,
        finalAmount: rawFinal,
      };
    });

    // Reconcile rounding difference to match exact total
    const currentSum = shares.reduce((sum, s) => sum + s.finalAmount, 0);
    const diff = total - currentSum;
    if (diff !== 0 && shares.length > 0) {
      shares[0].finalAmount += diff;
    }

    return {
      subtotal,
      taxAmount,
      serviceAmount,
      total,
      shares,
    };
  }, [items, participants, hasTax, hasService, taxType, effectiveTaxVal, serviceType, effectiveSrvVal]);

  const activeResult = splitMode === 'rata' ? calculationSimple : calculationItemMode;

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newParticipant.trim();
    if (!trimmed || participants.includes(trimmed)) return;
    setParticipants([...participants, trimmed]);
    setNewParticipant('');
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 1) {
      alert('Minimal harus ada 1 peserta.');
      return;
    }
    const removedName = participants[index];
    setParticipants(participants.filter((_, i) => i !== index));
    // Clean up items referencing this participant
    setItems(items.map((it) => ({
      ...it,
      sharedWith: it.sharedWith.filter((p) => p !== removedName),
    })));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice || newItemPrice <= 0) {
      alert('Nama menu dan harga harus diisi.');
      return;
    }
    if (newItemSharedWith.length === 0) {
      alert('Pilih minimal satu peserta yang menikmati menu ini.');
      return;
    }

    const newItem: BillItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      price: Number(newItemPrice),
      sharedWith: [...newItemSharedWith],
    };

    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const toggleConsumerForNewItem = (pName: string) => {
    if (newItemSharedWith.includes(pName)) {
      if (newItemSharedWith.length === 1) return; // Keep at least one
      setNewItemSharedWith(newItemSharedWith.filter((p) => p !== pName));
    } else {
      setNewItemSharedWith([...newItemSharedWith, pName]);
    }
  };

  const generateShareText = (): string => {
    if (!activeResult) return '';
    const modeLabel = splitMode === 'rata' ? 'Bagi Rata' : 'Beda Menu (Per Item)';
    const lines = [
      `🧾 *REKAP PATUNGAN MAKAN (${modeLabel})*`,
      '────────────────────────────',
      `Subtotal       : ${formatRupiah(activeResult.subtotal)}`,
      `Pajak          : ${hasTax ? `${formatRupiah(activeResult.taxAmount)} (${taxType === 'percent' ? `${taxValue}%` : 'Nominal'})` : 'Rp0 (Tanpa Pajak)'}`,
      `Service Charge : ${hasService ? `${formatRupiah(activeResult.serviceAmount)} (${serviceType === 'percent' ? `${serviceValue}%` : 'Nominal'})` : 'Rp0 (Tanpa Service)'}`,
      `*TOTAL TAGIHAN : ${formatRupiah(activeResult.total)}*`,
      '────────────────────────────',
      '*Rincian Pembayaran Tiap Orang:*',
      ...activeResult.shares.map((s) => `• *${s.name}*: ${formatRupiah(s.finalAmount)}`),
      '────────────────────────────',
      'Dihitung presisi tanpa selisih via CatatCepat ⚡',
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-500" />
          Kalkulator Bagi Tagihan (Split Bill)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Hitung patungan makan adil tanpa selisih. Mendukung resto tanpa pajak hingga pesanan beda-beda menu.
        </p>

        {/* Mode Selector: Bagi Rata vs Beda Menu */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold pt-1">
          <button
            type="button"
            onClick={() => setSplitMode('rata')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              splitMode === 'rata'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1. Bagi Rata (Simple)
          </button>
          <button
            type="button"
            onClick={() => setSplitMode('item')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              splitMode === 'item'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            2. Beda Menu (Per Item)
          </button>
        </div>
      </div>

      {/* Participants Management Card (Used in both modes) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            Daftar Peserta ({participants.length} orang):
          </span>
        </label>

        {/* Add participant input */}
        <form onSubmit={handleAddParticipant} className="flex gap-2">
          <input
            type="text"
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            placeholder="Tambah nama peserta (cth: Dodi)..."
            className="flex-1 h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="px-3 h-9 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </form>

        {/* Participants Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {participants.map((name, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <span>{name}</span>
              <button
                type="button"
                onClick={() => handleRemoveParticipant(idx)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="Hapus peserta"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Mode 1: Bagi Rata Subtotal Input */}
      {splitMode === 'rata' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Subtotal Tagihan (Rupiah) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">Rp</span>
            <input
              type="number"
              value={subtotalSimple}
              onChange={(e) => setSubtotalSimple(e.target.value ? parseInt(e.target.value, 10) : '')}
              placeholder="100000"
              min="1"
              max="1000000000"
              className="w-full h-11 pl-11 pr-4 text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Mode 2: Per Item Form */}
      {splitMode === 'item' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Menu Pesanan ({items.length} item)
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Subtotal: {formatRupiah(items.reduce((s, it) => s + it.price, 0))}
            </span>
          </div>

          {/* Form Tambah Item Menu */}
          <form onSubmit={handleAddItem} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              + Tambah Menu Pesanan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nama menu (cth: Ayam Geprek)"
                className="h-9 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="Harga (cth: 25000)"
                className="h-9 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {/* Checkbox siapa yang makan */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Siapa yang menikmati menu ini? (Bisa lebih dari 1 orang untuk menu sharing)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {participants.map((pName) => {
                  const isChecked = newItemSharedWith.includes(pName);
                  return (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => toggleConsumerForNewItem(pName)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isChecked ? '✓ ' : ''}{pName}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-8 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg"
            >
              + Simpan Menu ke Tagihan
            </button>
          </form>

          {/* List Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    Dimakan oleh: <strong className="text-emerald-600">{item.sharedWith.join(', ')}</strong>
                    {item.sharedWith.length > 1 && ` (dibagi ${item.sharedWith.length})`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900 dark:text-white">
                    {formatRupiah(item.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax and Service Controls with ON / OFF Toggles */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Pengaturan Pajak & Biaya Layanan
          </h3>
          <span className="text-[11px] text-slate-400">
            {(!hasTax && !hasService) ? 'Mode: Tanpa Pajak & Servis' : 'Dihitung dari Subtotal'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tax Control */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pajak Resto (PB1 / PPN)
              </span>
              <button
                type="button"
                onClick={() => setHasTax(!hasTax)}
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  hasTax ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {hasTax ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                {hasTax ? 'Aktif' : 'Mati (0)'}
              </button>
            </div>

            {hasTax && (
              <div className="flex gap-2 animate-in fade-in">
                <input
                  type="number"
                  value={taxValue}
                  onChange={(e) => setTaxValue(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder={taxType === 'percent' ? '10' : '10000'}
                  className="flex-1 h-9 px-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTaxType('percent')}
                    className={`px-2 font-bold ${taxType === 'percent' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType('nominal')}
                    className={`px-2 font-bold ${taxType === 'nominal' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Rp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Service Control */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Biaya Layanan (Service)
              </span>
              <button
                type="button"
                onClick={() => setHasService(!hasService)}
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  hasService ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {hasService ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                {hasService ? 'Aktif' : 'Mati (0)'}
              </button>
            </div>

            {hasService && (
              <div className="flex gap-2 animate-in fade-in">
                <input
                  type="number"
                  value={serviceValue}
                  onChange={(e) => setServiceValue(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder={serviceType === 'percent' ? '5' : '5000'}
                  className="flex-1 h-9 px-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setServiceType('percent')}
                    className={`px-2 font-bold ${serviceType === 'percent' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('nominal')}
                    className={`px-2 font-bold ${serviceType === 'nominal' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Rp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calculation Results Card */}
      {activeResult ? (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Total Tagihan Final</span>
              <p className="text-2xl font-black text-emerald-400">
                {formatRupiah(activeResult.total)}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-0.5">
              <p>Subtotal: {formatRupiah(activeResult.subtotal)}</p>
              <p>Pajak: {formatRupiah(activeResult.taxAmount)}</p>
              <p>Service: {formatRupiah(activeResult.serviceAmount)}</p>
            </div>
          </div>

          {/* Breakdown per participant */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300">
              Rincian Bagian per Orang ({splitMode === 'rata' ? 'Bagi Rata' : 'Sesuai Menu Pesanan'}):
            </span>
            <div className="space-y-1.5">
              {activeResult.shares.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">{s.name}</span>
                    {('extraRemainder' in s && s.extraRemainder > 0) && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">
                        +Rp1 sisa
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black text-emerald-400">
                    {formatRupiah(s.finalAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Share Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Rekap Teks</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-emerald-500/30"
            >
              <Share2 className="w-4 h-4" />
              <span>Kirim ke WhatsApp</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
          Masukkan subtotal dan minimal satu peserta untuk melihat hasil pembagian tagihan.
        </div>
      )}

      {/* Info Notice */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700 dark:text-slate-300">Catatan Independen:</strong> Kalkulator ini adalah alat bantu hitung murni dan tidak otomatis mencatat ke pengeluaran pribadi Anda pada versi ini.
        </p>
      </div>
    </div>
  );
};
