'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  decodeBillFromUrlPayload,
  PublicBillData,
} from '@/lib/domain/shareableBill';
import { formatRupiah } from '@/lib/domain/calculator';
import {
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  Share2,
  Receipt,
  UtensilsCrossed,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function PublicBillPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [bill, setBill] = useState<PublicBillData | null>(null);
  const [transferredMap, setTransferredMap] = useState<Record<string, boolean>>({});
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    // 1. Try reading from URL payload ?d=
    const payload = searchParams.get('d');
    if (payload) {
      const decoded = decodeBillFromUrlPayload(payload);
      if (decoded) {
        setBill(decoded);
        return;
      }
    }

    const billId = params?.id as string;
    if (billId) {
      // 2. Try fetching from /api/bills?token=...
      fetch(`/api/bills?token=${billId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setBill(data);
          } else {
            // 3. Fallback: try reading from localStorage
            try {
              const cached = localStorage.getItem(`tabsy_public_bill_${billId}`);
              if (cached) setBill(JSON.parse(cached));
            } catch (e) {
              console.error(e);
            }
          }
        })
        .catch(() => {
          try {
            const cached = localStorage.getItem(`tabsy_public_bill_${billId}`);
            if (cached) setBill(JSON.parse(cached));
          } catch (e) {
            console.error(e);
          }
        });
    }
  }, [params, searchParams]);

  // Load transferred toggle state from localStorage
  useEffect(() => {
    if (!bill?.id) return;
    try {
      const key = `tabsy_transfers_${bill.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setTransferredMap(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [bill?.id]);

  const handleToggleTransferred = (participantName: string) => {
    if (!bill?.id) return;
    const next = {
      ...transferredMap,
      [participantName]: !transferredMap[participantName],
    };
    setTransferredMap(next);
    try {
      localStorage.setItem(`tabsy_transfers_${bill.id}`, JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyAccount = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCopyShareUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  if (!bill) {
    return (
      <div className="min-h-screen bg-[#F3F6FD] dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">
          🧾
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          Tagihan Tidak Ditemukan
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
          Link tagihan mungkin tidak lengkap atau belum dibagikan. Pastikan membuka link lengkap dari WhatsApp.
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Buka Beranda Tabsy
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6FD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-lg shadow-sm">
              🐻
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white block leading-none">
                Tabsy Split Bill
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Rincian Publik Read-Only
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyShareUrl}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-sky-300 text-xs font-bold border border-blue-200/60 dark:border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedShare ? 'Tersalin!' : 'Bagikan Link'}
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-all"
            >
              App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 animate-in fade-in duration-200">
        
        {/* Bill Hero Card */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600 text-white p-6 sm:p-7 shadow-xl shadow-blue-500/15 space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-sky-100 tracking-wider uppercase">
              {bill.date}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-sky-100 font-semibold">
              <ShieldCheck className="w-4 h-4 text-sky-200" />
              <span>Dihitung Otomatis</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {bill.title}
            </h1>
            <p className="text-xs text-sky-100 mt-1">
              Dibagikan oleh <strong className="text-white">{bill.hostName}</strong>
            </p>
          </div>

          <div className="pt-2 border-t border-white/20 flex items-center justify-between">
            <span className="text-xs font-bold text-sky-100">Total Tagihan Kasir</span>
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatRupiah(bill.totalBill)}
            </span>
          </div>
        </div>

        {/* Breakdown Per Person (Bagian Tiap Teman) */}
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Bagian Bayar Tiap Orang
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Tap untuk tandai transfer
            </span>
          </div>

          <div className="space-y-2.5">
            {bill.participants.map((p, idx) => {
              const isChecked = transferredMap[p.name] ?? p.isPaid;
              return (
                <div
                  key={idx}
                  onClick={() => handleToggleTransferred(p.name)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                      : 'bg-slate-50/80 border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isChecked
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isChecked ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-900 dark:text-white block">
                        {p.name}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {isChecked ? 'Sudah Ditransfer ✅' : 'Menunggu Transfer ⏳'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-blue-600 dark:text-sky-400 block">
                      {formatRupiah(p.amountToPay)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Termasuk pajak & diskon
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group Debt Simplification (Rencana Pelunasan Paling Ringkas) */}
        {bill.transfers && bill.transfers.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 border border-blue-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Cara Pelunasan Paling Ringkas
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dihitung otomatis dengan algoritma ringkas utang agar tidak ada transfer bolak-balik:
            </p>

            <div className="space-y-2 pt-1">
              {bill.transfers.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <strong className="text-blue-900 dark:text-sky-300 font-bold">{t.from}</strong>
                    <span className="text-slate-400 font-medium">transfer ke</span>
                    <strong className="text-blue-900 dark:text-sky-300 font-bold">{t.to}</strong>
                  </div>
                  <span className="font-black text-blue-600 dark:text-sky-400 text-sm">
                    {formatRupiah(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rekening & Pembayaran Kasir */}
        {bill.paymentInfo && (
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Tujuan Transfer
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  {bill.paymentInfo.bankName || 'Rekening / E-Wallet'}
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white font-mono tracking-wide">
                  {bill.paymentInfo.accountNumber}
                </span>
                {bill.paymentInfo.accountHolder && (
                  <span className="text-xs text-slate-500 block">
                    a.n. {bill.paymentInfo.accountHolder}
                  </span>
                )}
              </div>

              {bill.paymentInfo.accountNumber && (
                <button
                  type="button"
                  onClick={() => handleCopyAccount(bill.paymentInfo!.accountNumber!)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-blue-600 dark:text-sky-400 flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                >
                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedAccount ? 'Tersalin' : 'Salin'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rincian Menu Pesanan */}
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Menu Pesanan ({bill.items.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {bill.items.map((it, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {it.name} {it.quantity > 1 && `(${it.quantity}x)`}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Porsi: {it.assignedNames.join(', ')}
                  </span>
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {formatRupiah(it.price * it.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Subtotal & Taxes Breakdown */}
          <div className="pt-3 border-t border-slate-100 dark:divide-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Diskon Promo</span>
                <span>-{formatRupiah(bill.discountAmount)}</span>
              </div>
            )}
            {bill.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Pajak (PB1)</span>
                <span>{formatRupiah(bill.taxAmount)}</span>
              </div>
            )}
            {bill.serviceAmount > 0 && (
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span>{formatRupiah(bill.serviceAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm text-slate-900 dark:text-white">
              <span>Total Akhir</span>
              <span>{formatRupiah(bill.totalBill)}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 space-y-2">
          <p className="text-[11px] text-slate-400">
            Dibuat secara privat tanpa login menggunakan <strong>Tabsy</strong> ⚡
          </p>
          <Link
            href="/"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-sky-400 underline"
          >
            Buat Split Bill Kamu Sendiri →
          </Link>
        </div>
      </main>
    </div>
  );
}
