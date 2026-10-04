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
  Sparkles,
  Receipt,
  ArrowRight,
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

    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    if (subtotal <= 0) return null;

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
      if (newItemSharedWith.length === 1) return;
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
      'Dihitung presisi tanpa selisih via Tabsy ⚡',
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    const text = generateShareText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Rekap Patungan Makan - Tabsy',
          text,
        });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleShareWhatsApp();
        }
        return;
      }
    }
    handleShareWhatsApp();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Header Card: Sleek Neo-Banking Rounded Design */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider block">
              Alat Patungan
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Kalkulator Bagi Tagihan
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hitung patungan makan adil tanpa selisih senilai 1 rupiah pun. Mendukung resto tanpa pajak hingga pesanan beda menu.
        </p>

        {/* Mode Selector Capsule */}
        <div className="flex p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setSplitMode('rata')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              splitMode === 'rata'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1. Bagi Rata (Simple)
          </button>
          <button
            type="button"
            onClick={() => setSplitMode('item')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              splitMode === 'item'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            2. Beda Menu (Per Item)
          </button>
        </div>
      </div>

      {/* Participants Management Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Daftar Peserta
          </label>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-100 dark:border-blue-900">
            {participants.length} Orang
          </span>
        </div>

        {/* Add participant input */}
        <form onSubmit={handleAddParticipant} className="flex gap-2">
          <input
            type="text"
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            placeholder="Ketik nama teman (cth: Dodi)..."
            className="flex-1 h-11 px-4 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          <button
            type="submit"
            className="px-4 h-11 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </form>

        {/* Participants Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {participants.map((name, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50/70 dark:bg-slate-800 text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-slate-700"
            >
              <span>{name}</span>
              <button
                type="button"
                onClick={() => handleRemoveParticipant(idx)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="Hapus peserta"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Mode 1: Bagi Rata Subtotal Input */}
      {splitMode === 'rata' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-3">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Subtotal Tagihan Bersih (Sebelum Pajak & Servis)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-sm font-extrabold text-blue-500">Rp</span>
            <input
              type="number"
              value={subtotalSimple}
              onChange={(e) => setSubtotalSimple(e.target.value ? parseInt(e.target.value, 10) : '')}
              placeholder="100000"
              min="1"
              max="1000000000"
              className="w-full h-12 pl-12 pr-4 text-lg font-black rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>
      )}

      {/* Mode 2: Per Item Form */}
      {splitMode === 'item' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Menu Pesanan ({items.length} item)
            </h3>
            <span className="text-xs font-bold text-blue-600 dark:text-sky-400">
              Subtotal: {formatRupiah(items.reduce((s, it) => s + it.price, 0))}
            </span>
          </div>

          {/* Form Tambah Item Menu */}
          <form onSubmit={handleAddItem} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              + Tambah Menu Pesanan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nama menu (cth: Ayam Geprek)"
                className="h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="Harga (cth: 25000)"
                className="h-10 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Checkbox siapa yang makan */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Siapa yang menikmati menu ini? (Bisa lebih dari 1 orang untuk patungan)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {participants.map((pName) => {
                  const isChecked = newItemSharedWith.includes(pName);
                  return (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => toggleConsumerForNewItem(pName)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
              className="w-full h-10 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              + Simpan Menu ke Tagihan
            </button>
          </form>

          {/* List Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs shadow-sm"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dimakan oleh: <strong className="text-blue-600 dark:text-sky-400">{item.sharedWith.join(', ')}</strong>
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
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax and Service Controls with ON / OFF Toggles */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Pengaturan Pajak & Biaya Layanan
          </h3>
          <span className="text-[11px] font-medium text-slate-400">
            {(!hasTax && !hasService) ? 'Mode: Bersih Tanpa Tambahan' : 'Dihitung dari Subtotal'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tax Control */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pajak Resto (PB1 / PPN)
              </span>
              <button
                type="button"
                onClick={() => setHasTax(!hasTax)}
                className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                  hasTax ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'
                }`}
              >
                {hasTax ? <ToggleRight className="w-6 h-6 text-blue-600 dark:text-sky-400" /> : <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600" />}
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
                  className="flex-1 h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:border-blue-500 focus:outline-none"
                />
                <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[11px] p-0.5 bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setTaxType('percent')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all ${
                      taxType === 'percent'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType('nominal')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all ${
                      taxType === 'nominal'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Rp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Service Control */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Biaya Layanan (Service)
              </span>
              <button
                type="button"
                onClick={() => setHasService(!hasService)}
                className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                  hasService ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'
                }`}
              >
                {hasService ? <ToggleRight className="w-6 h-6 text-blue-600 dark:text-sky-400" /> : <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600" />}
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
                  className="flex-1 h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:border-blue-500 focus:outline-none"
                />
                <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[11px] p-0.5 bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setServiceType('percent')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all ${
                      serviceType === 'percent'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('nominal')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all ${
                      serviceType === 'nominal'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Rp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calculation Results Card: Neo-Banking Luminous Blue Card (Replacing Ugly Dark Box) */}
      {activeResult ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 text-white p-6 rounded-[32px] shadow-xl shadow-blue-500/25 space-y-5 animate-in fade-in">
          {/* Subtle Ambient Background Ring */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

          {/* Card Header & Total */}
          <div className="relative z-10 flex items-start justify-between pb-4 border-b border-white/15">
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200 block mb-1">
                Total Tagihan Final
              </span>
              <p className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
                {formatRupiah(activeResult.total)}
              </p>
            </div>
            <div className="text-right text-[11px] text-blue-100/90 space-y-0.5 font-medium">
              <p>Subtotal: <strong className="text-white">{formatRupiah(activeResult.subtotal)}</strong></p>
              <p>Pajak: <strong className="text-white">{formatRupiah(activeResult.taxAmount)}</strong></p>
              <p>Service: <strong className="text-white">{formatRupiah(activeResult.serviceAmount)}</strong></p>
            </div>
          </div>

          {/* Breakdown per participant */}
          <div className="relative z-10 space-y-2.5">
            <span className="text-xs font-extrabold text-blue-100 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              Rincian Bagian per Orang ({splitMode === 'rata' ? 'Bagi Rata' : 'Sesuai Menu'}):
            </span>
            <div className="space-y-2">
              {activeResult.shares.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-white/25 text-white text-[11px] font-black flex items-center justify-center shadow-inner">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white tracking-tight">{s.name}</span>
                    {('extraRemainder' in s && s.extraRemainder > 0) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black">
                        +Rp1 sisa
                      </span>
                    )}
                  </div>
                  <span className="text-base font-black text-white tracking-tight">
                    {formatRupiah(s.finalAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Share Action Buttons */}
          <div className="relative z-10 grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleCopy}
              className="h-12 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center justify-center gap-2 backdrop-blur-md border border-white/25 active:scale-95 transition-all shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-200" />
                  <span>Salin Rekap Teks</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="h-12 rounded-2xl bg-white hover:bg-sky-50 text-blue-700 text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-black/10"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Bagikan Tagihan</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300">
          Masukkan subtotal dan minimal satu peserta untuk melihat hasil pembagian tagihan.
        </div>
      )}

      {/* Info Notice: Clean Sky Blue Tint */}
      <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/60 flex items-start gap-3 text-xs text-sky-800 dark:text-sky-300">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-sky-950 dark:text-sky-200">Catatan Independen:</strong> Kalkulator ini adalah alat bantu hitung murni dan tidak otomatis mencatat ke pengeluaran pribadi Anda pada versi ini.
        </p>
      </div>
    </div>
  );
};
