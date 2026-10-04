'use client';

import React, { useState, useMemo } from 'react';
import { calculateSplitBill, formatRupiah } from '@/lib/domain/calculator';
import { FeeInputType } from '@/types';
import { Users, Plus, Trash2, Copy, Check, Share2, Info, Calculator } from 'lucide-react';

export const SplitBillScreen: React.FC = () => {
  const [subtotal, setSubtotal] = useState<number | ''>(100000);
  const [taxType, setTaxType] = useState<FeeInputType>('percent');
  const [taxValue, setTaxValue] = useState<number | ''>(10);
  const [serviceType, setServiceType] = useState<FeeInputType>('percent');
  const [serviceValue, setServiceValue] = useState<number | ''>(5);

  const [participants, setParticipants] = useState<string[]>(['Asep', 'Budi', 'Citra']);
  const [newParticipant, setNewParticipant] = useState('');
  const [copied, setCopied] = useState(false);

  const calculationResult = useMemo(() => {
    const subNum = typeof subtotal === 'number' ? subtotal : parseInt(String(subtotal), 10);
    const taxNum = typeof taxValue === 'number' ? taxValue : parseFloat(String(taxValue)) || 0;
    const srvNum = typeof serviceValue === 'number' ? serviceValue : parseFloat(String(serviceValue)) || 0;

    if (!subNum || subNum <= 0 || participants.length === 0) {
      return null;
    }

    try {
      return calculateSplitBill({
        subtotal: subNum,
        taxType,
        taxValue: taxNum,
        serviceType,
        serviceValue: srvNum,
        participants,
      });
    } catch (err) {
      console.error('Calculation error:', err);
      return null;
    }
  }, [subtotal, taxType, taxValue, serviceType, serviceValue, participants]);

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newParticipant.trim();
    if (!trimmed) return;
    setParticipants([...participants, trimmed]);
    setNewParticipant('');
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 1) {
      alert('Minimal harus ada 1 peserta.');
      return;
    }
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const generateShareText = (): string => {
    if (!calculationResult) return '';
    const lines = [
      '🧾 *REKAP PATUNGAN MAKAN (CatatCepat)*',
      '────────────────────────────',
      `Subtotal       : ${formatRupiah(calculationResult.subtotal)}`,
      `Pajak          : ${formatRupiah(calculationResult.taxAmount)} (${taxType === 'percent' ? `${taxValue}%` : 'Nominal'})`,
      `Service Charge : ${formatRupiah(calculationResult.serviceAmount)} (${serviceType === 'percent' ? `${serviceValue}%` : 'Nominal'})`,
      `*TOTAL TAGIHAN : ${formatRupiah(calculationResult.total)}*`,
      '────────────────────────────',
      '*Rincian Bagian Peserta:*',
      ...calculationResult.shares.map(
        (s) =>
          `• *${s.name}*: ${formatRupiah(s.finalAmount)}${
            s.extraRemainder > 0 ? ' _(+1 sisa pembulatan)_' : ''
          }`
      ),
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
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-500" />
          Kalkulator Bagi Tagihan (Split Bill)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Hitung patungan makan adil & transparan. Sisa pembulatan dialokasikan otomatis sehingga total tepat 100%.
        </p>
      </div>

      {/* Inputs Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Subtotal */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Subtotal Tagihan (Rupiah) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">Rp</span>
            <input
              type="number"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value ? parseInt(e.target.value, 10) : '')}
              placeholder="100000"
              min="1"
              max="1000000000"
              className="w-full h-11 pl-11 pr-4 text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Tax and Service */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tax */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pajak (PB1 / PPN)
              </label>
              <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => setTaxType('percent')}
                  className={`px-2 py-0.5 font-bold ${
                    taxType === 'percent'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setTaxType('nominal')}
                  className={`px-2 py-0.5 font-bold ${
                    taxType === 'nominal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Rp
                </button>
              </div>
            </div>
            <input
              type="number"
              value={taxValue}
              onChange={(e) => setTaxValue(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder={taxType === 'percent' ? '10' : '10000'}
              className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-400">Dihitung dari subtotal</p>
          </div>

          {/* Service */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Biaya Layanan (Service)
              </label>
              <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => setServiceType('percent')}
                  className={`px-2 py-0.5 font-bold ${
                    serviceType === 'percent'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType('nominal')}
                  className={`px-2 py-0.5 font-bold ${
                    serviceType === 'nominal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Rp
                </button>
              </div>
            </div>
            <input
              type="number"
              value={serviceValue}
              onChange={(e) => setServiceValue(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder={serviceType === 'percent' ? '5' : '5000'}
              className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-400">Dihitung dari subtotal</p>
          </div>
        </div>

        {/* Participants Management */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
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
              placeholder="Ketik nama peserta (cth: Dodi)..."
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
      </div>

      {/* Calculation Results Card */}
      {calculationResult ? (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Total Tagihan Final</span>
              <p className="text-2xl font-black text-emerald-400">
                {formatRupiah(calculationResult.total)}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-0.5">
              <p>Subtotal: {formatRupiah(calculationResult.subtotal)}</p>
              <p>Pajak: {formatRupiah(calculationResult.taxAmount)}</p>
              <p>Service: {formatRupiah(calculationResult.serviceAmount)}</p>
            </div>
          </div>

          {/* Breakdown per participant */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300">
              Rincian Pembagian per Orang:
            </span>
            <div className="space-y-1.5">
              {calculationResult.shares.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">{s.name}</span>
                    {s.extraRemainder > 0 && (
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

      {/* Info Notice as required by PRD */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700 dark:text-slate-300">Catatan Independen:</strong> Kalkulator ini adalah alat bantu hitung murni dan tidak otomatis mencatat ke pengeluaran pribadi Anda pada versi ini.
        </p>
      </div>
    </div>
  );
};
