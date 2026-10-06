'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  calculateSplitBill,
  formatRupiah,
} from '@/lib/domain/calculator';
import {
  calculateItemSplit,
  validateBillDraftForFinalization,
} from '@/lib/domain/itemSplit';
import {
  saveBillDraft,
  getAllBillDrafts,
  deleteBillDraft,
  createDefaultBillDraft,
  createSampleBillDraft,
  getLocalTodayDate,
  addTransaction,
} from '@/lib/db';
import {
  formatPublicBillData,
  encodeBillToUrlPayload,
} from '@/lib/domain/shareableBill';
import { simplifyGroupDebts } from '@/lib/domain/debtSimplifier';
import {
  BillDraft,
  BillItem,
  Participant,
  Payment,
  FeeInputType,
} from '@/types';
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
  Receipt,
  Tag,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Save,
  ArrowRightLeft,
  DollarSign,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export interface SplitBillScreenProps {
  currentUserName?: string;
  onNavigateTab?: (tab: 'catat' | 'split' | 'riwayat' | 'pengaturan') => void;
  onTransactionAdded?: () => void;
}

export const SplitBillScreen: React.FC<SplitBillScreenProps> = ({
  currentUserName = 'Saya',
  onNavigateTab,
  onTransactionAdded,
}) => {
  // Mode: 'rata' (Bagi Rata Simple) | 'item' (Pesanan per Item & Pembayaran)
  const [splitMode, setSplitMode] = useState<'rata' | 'item'>('rata');

  // ==========================================
  // MODE 1: BAGI RATA (SIMPLE) STATE (Start Clean!)
  // ==========================================
  const [subtotalSimple, setSubtotalSimple] = useState<number | ''>('');
  const [hasTaxSimple, setHasTaxSimple] = useState(true);
  const [hasServiceSimple, setHasServiceSimple] = useState(true);
  const [taxTypeSimple, setTaxTypeSimple] = useState<FeeInputType>('percent');
  const [taxValueSimple, setTaxValueSimple] = useState<number | ''>(10);
  const [serviceTypeSimple, setServiceTypeSimple] = useState<FeeInputType>('percent');
  const [serviceValueSimple, setServiceValueSimple] = useState<number | ''>(5);
  const [participantsSimple, setParticipantsSimple] = useState<string[]>([currentUserName || 'Saya']);
  const [newParticipantSimple, setNewParticipantSimple] = useState('');

  // ==========================================
  // MODE 2: TAHAP 10 ITEM SPLIT & DRAFT STATE (Start Clean!)
  // ==========================================
  const [draft, setDraft] = useState<BillDraft>(() => createDefaultBillDraft(currentUserName || 'Saya'));
  const [savedDrafts, setSavedDrafts] = useState<BillDraft[]>([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<string | null>(null);

  // New item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');
  const [newItemQty, setNewItemQty] = useState<number | ''>(1);
  const [newItemAssigned, setNewItemAssigned] = useState<string[]>([]);

  // New participant input
  const [newParticipantName, setNewParticipantName] = useState('');

  // New payment input
  const [paymentPayerId, setPaymentPayerId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentNote, setPaymentNote] = useState('');

  // Feedback states
  const [copied, setCopied] = useState(false);

  // Fitur 3: Payment Bank & E-Wallet Info for WhatsApp & Public Share
  const [paymentBankName, setPaymentBankName] = useState('BCA');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentAccountHolder, setPaymentAccountHolder] = useState(currentUserName || 'Saya');
  const [showPaymentInfoInput, setShowPaymentInfoInput] = useState(false);

  // Recording Personal Share to Expenses (Aktifitas Catatan Sendiri)
  const [recordedStatus, setRecordedStatus] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleRecordMyShare = async (amount: number, description: string) => {
    if (!amount || amount <= 0 || isRecording) return;
    setIsRecording(true);
    try {
      await addTransaction({
        description,
        amountRupiah: Math.round(amount),
        category: 'makan',
        date: getLocalTodayDate(),
      });
      setRecordedStatus(`✓ Bagian Anda sebesar ${formatRupiah(Math.round(amount))} sukses dicatat ke Buku Pengeluaran & Riwayat!`);
      onTransactionAdded?.();
      setTimeout(() => setRecordedStatus(null), 5000);
    } catch (err) {
      console.error('Gagal mencatat bagian sendiri ke transaksi:', err);
      alert('Gagal mencatat transaksi ke penyimpanan lokal.');
    } finally {
      setIsRecording(false);
    }
  };

  // Load saved drafts on mount & auto-load active draft from OCR
  const refreshDrafts = useCallback(async () => {
    try {
      const all = await getAllBillDrafts();
      setSavedDrafts(all);

      if (typeof window !== 'undefined') {
        const activeDraftId = localStorage.getItem('tabsy_active_draft_id');
        if (activeDraftId) {
          const matched = all.find((d) => d.id === activeDraftId);
          if (matched) {
            setDraft(matched);
            setSplitMode('item');
            localStorage.removeItem('tabsy_active_draft_id');
            setDraftSaveStatus(`✓ Draft "${matched.title}" berhasil dimuat!`);
            setTimeout(() => setDraftSaveStatus(null), 3500);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching bill drafts:', err);
    }
  }, []);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  // Synchronize new item assignment default when participants change
  useEffect(() => {
    if (draft.participants.length > 0 && newItemAssigned.length === 0) {
      setNewItemAssigned([draft.participants[0].id]);
    }
    if (!paymentPayerId && draft.participants.length > 0) {
      setPaymentPayerId(draft.participants[0].id);
    }
  }, [draft.participants, newItemAssigned.length, paymentPayerId]);

  // Helper: Bagi Rata Semua Menu ke Semua Peserta
  const handleAssignAllItemsToAll = () => {
    if (draft.participants.length === 0 || draft.items.length === 0) return;
    const allIds = draft.participants.map((p) => p.id);
    const updatedItems = draft.items.map((it) => ({
      ...it,
      assignedParticipantIds: allIds,
    }));
    const updated: BillDraft = { ...draft, items: updatedItems, updatedAt: new Date().toISOString() };
    setDraft(updated);
    saveBillDraft(updated);
    setDraftSaveStatus('✓ Semua menu berhasil dibagikan rata ke semua peserta!');
    setTimeout(() => setDraftSaveStatus(null), 3000);
  };

  // Helper: Talangi Lunas ke Kasir oleh orang pertama ("Saya")
  const handleQuickFullPaymentByMe = () => {
    if (draft.participants.length === 0) return;
    const payer = draft.participants[0];
    const totalNeeded = calculationItem.totalBill;
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      participantId: payer.id,
      amountPaid: totalNeeded,
      note: 'Talangan lunas ke kasir',
      paidAt: new Date().toISOString(),
    };
    const updated: BillDraft = {
      ...draft,
      payments: [newPayment],
      updatedAt: new Date().toISOString(),
    };
    setDraft(updated);
    saveBillDraft(updated);
    setDraftSaveStatus(`✓ Pembayaran lunas ${formatRupiah(totalNeeded)} dicatat atas nama ${payer.name}!`);
    setTimeout(() => setDraftSaveStatus(null), 3500);
  };

  // Helper: Finalisasi Tagihan
  const handleToggleFinalize = async () => {
    if (!validation.isValid) {
      alert('Tagihan belum dapat difinalisasi karena masih ada syarat yang belum lengkap.');
      return;
    }
    const updated: BillDraft = {
      ...draft,
      isFinalized: !draft.isFinalized,
      updatedAt: new Date().toISOString(),
    };
    setDraft(updated);
    await saveBillDraft(updated);
    await refreshDrafts();
    setDraftSaveStatus(
      updated.isFinalized
        ? '🎉 Tagihan berhasil difinalisasi & dikunci!'
        : 'Draft tagihan dibuka kembali untuk diedit.'
    );
    setTimeout(() => setDraftSaveStatus(null), 3500);
  };

  // ==========================================
  // MODE 1 CALCULATION
  // ==========================================
  const calculationSimple = useMemo(() => {
    const subNum = typeof subtotalSimple === 'number' ? subtotalSimple : parseInt(String(subtotalSimple), 10);
    if (!subNum || subNum <= 0 || participantsSimple.length === 0) return null;

    const effTax = hasTaxSimple ? (typeof taxValueSimple === 'number' ? taxValueSimple : parseFloat(String(taxValueSimple)) || 0) : 0;
    const effSrv = hasServiceSimple ? (typeof serviceValueSimple === 'number' ? serviceValueSimple : parseFloat(String(serviceValueSimple)) || 0) : 0;

    try {
      return calculateSplitBill({
        subtotal: subNum,
        taxType: taxTypeSimple,
        taxValue: effTax,
        serviceType: serviceTypeSimple,
        serviceValue: effSrv,
        participants: participantsSimple,
      });
    } catch {
      return null;
    }
  }, [subtotalSimple, taxTypeSimple, taxValueSimple, hasTaxSimple, serviceTypeSimple, serviceValueSimple, hasServiceSimple, participantsSimple]);

  // ==========================================
  // MODE 2 CALCULATION & VALIDATION
  // ==========================================
  const validation = useMemo(() => validateBillDraftForFinalization(draft), [draft]);
  const calculationItem = useMemo(() => calculateItemSplit(draft), [draft]);

  // Fitur 2: Group Debt Simplification Memo (Algoritma Ringkas Utang)
  const simplifiedDebtResult = useMemo(() => {
    if (calculationItem.totalBill <= 0 || draft.participants.length <= 1) {
      return null;
    }
    if (calculationItem.isFullyPaid) {
      return simplifyGroupDebts(
        calculationItem.participantBreakdowns.map((b) => ({
          id: b.participantId,
          name: b.participantName,
          totalPaid: b.totalPaid,
          totalShare: b.finalShareAmount,
        }))
      );
    }
    const hostId = draft.participants[0]?.id;
    return simplifyGroupDebts(
      calculationItem.participantBreakdowns.map((b) => ({
        id: b.participantId,
        name: b.participantName,
        totalPaid: b.participantId === hostId ? calculationItem.totalBill : 0,
        totalShare: b.finalShareAmount,
      }))
    );
  }, [calculationItem, draft.participants]);

  // Save current draft to IndexedDB
  const handleSaveDraft = async () => {
    try {
      await saveBillDraft(draft);
      setDraftSaveStatus('Draft tagihan tersimpan di browser!');
      await refreshDrafts();
      setTimeout(() => setDraftSaveStatus(null), 3000);
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Gagal menyimpan draft tagihan.');
    }
  };

  const handleLoadDraft = (selected: BillDraft) => {
    setDraft(selected);
    setShowDraftsModal(false);
  };

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus draft ini dari penyimpanan browser?')) {
      await deleteBillDraft(id);
      await refreshDrafts();
    }
  };

  const handleStartNewDraft = () => {
    setDraft(createDefaultBillDraft('Saya'));
  };

  const handleLoadDemoSimple = () => {
    setSubtotalSimple(100000);
    setParticipantsSimple(['Asep', 'Budi', 'Citra']);
    setHasTaxSimple(true);
    setHasServiceSimple(true);
    setTaxValueSimple(10);
    setServiceValueSimple(5);
  };

  const handleLoadDemoItem = () => {
    setDraft(createSampleBillDraft());
  };

  // Participant management for Mode 2
  const handleAddParticipantMode2 = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newParticipantName.trim();
    if (!trimmed) return;
    if (draft.participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('Nama peserta sudah ada.');
      return;
    }

    const newP: Participant = {
      id: `p-${Date.now()}`,
      name: trimmed,
    };

    const updatedParticipants = [...draft.participants, newP];
    // Automatically include the newly added friend in all existing items
    const updatedItems = draft.items.map((it) => ({
      ...it,
      assignedParticipantIds: Array.from(new Set([...it.assignedParticipantIds, newP.id])),
    }));

    const updated: BillDraft = {
      ...draft,
      participants: updatedParticipants,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setDraft(updated);
    saveBillDraft(updated);
    setNewParticipantName('');
  };

  const handleRemoveParticipantMode2 = (id: string) => {
    if (draft.participants.length <= 1) {
      alert('Minimal harus ada 1 peserta.');
      return;
    }

    setDraft({
      ...draft,
      participants: draft.participants.filter((p) => p.id !== id),
      items: draft.items.map((it) => ({
        ...it,
        assignedParticipantIds: it.assignedParticipantIds.filter((pId) => pId !== id),
      })),
      payments: draft.payments.filter((pmt) => pmt.participantId !== id),
    });
  };

  // Item management for Mode 2
  const handleAddItemMode2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice || newItemPrice <= 0) {
      alert('Nama menu dan harga harus diisi.');
      return;
    }
    const qty = typeof newItemQty === 'number' ? newItemQty : parseInt(String(newItemQty), 10) || 1;
    if (qty <= 0) {
      alert('Kuantitas harus bilangan bulat minimal 1.');
      return;
    }

    const newItem: BillItem = {
      id: `it-${Date.now()}`,
      name: newItemName.trim(),
      price: Number(newItemPrice),
      quantity: qty,
      assignedParticipantIds: [...newItemAssigned],
    };

    setDraft({
      ...draft,
      items: [...draft.items, newItem],
    });

    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty(1);
  };

  const handleRemoveItemMode2 = (id: string) => {
    setDraft({
      ...draft,
      items: draft.items.filter((it) => it.id !== id),
    });
  };

  const toggleAssigneeForItem = (itemId: string, participantId: string) => {
    const updatedItems = draft.items.map((it) => {
      if (it.id !== itemId) return it;
      const exists = it.assignedParticipantIds.includes(participantId);
      const updated = exists
        ? it.assignedParticipantIds.filter((id) => id !== participantId)
        : [...it.assignedParticipantIds, participantId];
      return {
        ...it,
        assignedParticipantIds: updated,
      };
    });
    const updated = { ...draft, items: updatedItems, updatedAt: new Date().toISOString() };
    setDraft(updated);
    saveBillDraft(updated);
  };

  // Assign a single item to all participants (Makan Bareng)
  const assignItemToAll = (itemId: string) => {
    const allIds = draft.participants.map((p) => p.id);
    const updatedItems = draft.items.map((it) => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        assignedParticipantIds: allIds,
      };
    });
    const updated = { ...draft, items: updatedItems, updatedAt: new Date().toISOString() };
    setDraft(updated);
    saveBillDraft(updated);
  };

  // Reset all item assignments so each participant can claim their own menu
  const handleResetAllItemAssignments = () => {
    const updatedItems = draft.items.map((it) => ({
      ...it,
      assignedParticipantIds: [],
    }));
    const updated = { ...draft, items: updatedItems, updatedAt: new Date().toISOString() };
    setDraft(updated);
    saveBillDraft(updated);
    setDraftSaveStatus('Pilihan menu dikosongkan. Silakan tap nama teman di masing-masing menu.');
    setTimeout(() => setDraftSaveStatus(null), 3000);
  };

  // Payments management for Mode 2
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPayerId) {
      alert('Pilih peserta yang membayar.');
      return;
    }
    const amt = typeof paymentAmount === 'number' ? paymentAmount : parseInt(String(paymentAmount), 10);
    if (!amt || amt <= 0) {
      alert('Nominal pembayaran harus bilangan bulat lebih dari 0.');
      return;
    }

    const newPayment: Payment = {
      id: `pmt-${Date.now()}`,
      participantId: paymentPayerId,
      amountPaid: amt,
      note: paymentNote.trim() || undefined,
      paidAt: new Date().toISOString(),
    };

    setDraft({
      ...draft,
      payments: [...draft.payments, newPayment],
    });

    setPaymentAmount('');
    setPaymentNote('');
  };

  const handleRemovePayment = (id: string) => {
    setDraft({
      ...draft,
      payments: draft.payments.filter((pmt) => pmt.id !== id),
    });
  };

  // ==========================================
  // SHARE / COPY FORMATTER
  // ==========================================
  const generateShareText = (): string => {
    if (splitMode === 'rata') {
      if (!calculationSimple) return '';
      const lines = [
        '🧾 *REKAP PATUNGAN MAKAN (Bagi Rata)*',
        '────────────────────────────',
        `Subtotal       : ${formatRupiah(calculationSimple.subtotal)}`,
        `Pajak          : ${hasTaxSimple ? `${formatRupiah(calculationSimple.taxAmount)} (${taxTypeSimple === 'percent' ? `${taxValueSimple}%` : 'Nominal'})` : 'Rp0 (Tanpa Pajak)'}`,
        `Service Charge : ${hasServiceSimple ? `${formatRupiah(calculationSimple.serviceAmount)} (${serviceTypeSimple === 'percent' ? `${serviceValueSimple}%` : 'Nominal'})` : 'Rp0 (Tanpa Service)'}`,
        `*TOTAL TAGIHAN : ${formatRupiah(calculationSimple.total)}*`,
        '────────────────────────────',
        '*Rincian Pembayaran Tiap Orang:*',
        ...calculationSimple.shares.map((s) => `• *${s.name}*: ${formatRupiah(s.finalAmount)}`),
        '────────────────────────────',
        'Dihitung presisi tanpa selisih via Tabsy ⚡',
      ];
      return lines.join('\n');
    }

    // Mode 2 Share Text
    const res = calculationItem;
    const lines = [
      `🧾 *REKAP PATUNGAN: ${draft.title.toUpperCase()}*`,
      `Tanggal: ${draft.date}`,
      '────────────────────────────',
      '*Daftar Menu:*',
      ...draft.items.map((it) => {
        const assignedNames = it.assignedParticipantIds
          .map((id) => draft.participants.find((p) => p.id === id)?.name || id)
          .join(', ');
        return `• ${it.name} (${it.quantity}x @${formatRupiah(it.price)}) = ${formatRupiah(it.price * it.quantity)}\n  ↳ Dibagi: ${assignedNames || 'Belum dipilih'}`;
      }),
      '────────────────────────────',
      `Subtotal Kotor : ${formatRupiah(res.grossSubtotal)}`,
      res.discountAmount > 0 ? `Diskon Promo   : -${formatRupiah(res.discountAmount)}` : null,
      `Subtotal Bersih: ${formatRupiah(res.netSubtotal)}`,
      `Pajak          : ${formatRupiah(res.taxAmount)}`,
      `Service Charge : ${formatRupiah(res.serviceAmount)}`,
      `*TOTAL TAGIHAN : ${formatRupiah(res.totalBill)}*`,
      '────────────────────────────',
      '*Bagian & Saldo Tiap Peserta:*',
      ...res.participantBreakdowns.map((b) => {
        const statusStr = b.balance === 0
          ? '✅ LUNAS'
          : b.balance > 0
          ? `⚠️ Kurang ${formatRupiah(b.balance)}`
          : `🎉 Uang Kembali ${formatRupiah(Math.abs(b.balance))}`;
        return `• *${b.participantName}*: Bagian ${formatRupiah(b.finalShareAmount)} | Bayar ${formatRupiah(b.totalPaid)} (${statusStr})`;
      }),
      '────────────────────────────',
      res.isFullyPaid
        ? `*Status Tagihan: LUNAS KE KASIR (Tinggal Pelunasan Antar Teman)*`
        : `*Status Kasir: Total Rp${res.totalBill.toLocaleString('id-ID')} (Menunggu Pelunasan)*`,
      (() => {
        const transfers = res.settlementTransfers.length > 0
          ? res.settlementTransfers
          : (simplifiedDebtResult?.transfers || []).map((t) => ({
              fromParticipantName: t.fromName,
              toParticipantName: t.toName,
              amount: t.amount,
            }));
        if (transfers.length === 0) return null;
        return [
          '\n💸 *RENCANA PELUNASAN TRANSFER:*',
          ...transfers.map(
            (t) => `• *${t.fromParticipantName}* transfer ke *${t.toParticipantName}*: ${formatRupiah(t.amount)}`
          ),
        ].join('\n');
      })(),
      paymentAccountNumber ? '────────────────────────────' : null,
      paymentAccountNumber ? `💳 *TUJUAN TRANSFER:*\n• ${paymentBankName}: *${paymentAccountNumber}* (a.n. ${paymentAccountHolder})` : null,
      '────────────────────────────',
      `🔗 *Link Rincian & Ceklis Transfer:*\n${getPublicShareUrl()}`,
      '*(Bisa dibuka langsung tanpa perlu login)*',
      '────────────────────────────',
      'Dihitung presisi tanpa selisih via Tabsy ⚡',
    ].filter(Boolean) as string[];

    return lines.join('\n');
  };

  const getPublicShareUrl = () => {
    const publicData = formatPublicBillData(draft, calculationItem, {
      bankName: paymentBankName,
      accountNumber: paymentAccountNumber,
      accountHolder: paymentAccountHolder,
    });

    // Save to /api/bills in background so it can be opened with clean 8-char URL
    if (typeof window !== 'undefined') {
      fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publicData),
      }).catch(() => {});
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tabsy.app';
    const token = draft.shareToken || publicData.shareToken;
    return `${baseUrl}/b/${token}`;
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
          title: `Rekap Patungan ${splitMode === 'rata' ? 'Bagi Rata' : draft.title} - Tabsy`,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Header Card: Neo-Banking Rounded Design */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider block">
                Finansial Komparatif
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Bagi Tagihan & Patungan
              </h2>
            </div>
          </div>

          {/* Draft Management Button (Mode 2) */}
          {splitMode === 'item' && (
            <button
              onClick={() => setShowDraftsModal(true)}
              className="p-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-sky-300 border border-blue-100 dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95"
              title="Daftar Draft Tersimpan"
            >
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Draft</span>
              {savedDrafts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                  {savedDrafts.length}
                </span>
              )}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Kalkulator pembagian tagihan presisi dengan alokasi proporsional diskon, pajak restoran, dan biaya layanan tanpa selisih pembulatan.
        </p>

        {/* Mode Selector Capsule: Symmetrical, Crisp, No-Wrap */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 text-xs font-bold gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setSplitMode('rata')}
            className={`h-11 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
              splitMode === 'rata'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm font-black ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 font-semibold'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-blue-600 dark:text-sky-400" />
            <span>Bagi Rata (Sederhana)</span>
          </button>
          <button
            type="button"
            onClick={() => setSplitMode('item')}
            className={`h-11 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
              splitMode === 'item'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm font-black ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 font-semibold'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0 text-blue-600 dark:text-sky-400" />
            <span>Rinci per Menu (Itemized)</span>
          </button>
        </div>
      </div>

      {/* Draft Save Feedback Banner */}
      {draftSaveStatus && (
        <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{draftSaveStatus}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: BAGI RATA (SIMPLE) VIEW                                */}
      {/* ============================================================== */}
      {splitMode === 'rata' && (
        <>
          {/* Participants Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Daftar Peserta ({participantsSimple.length} Orang)
              </label>
              <button
                type="button"
                onClick={handleLoadDemoSimple}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-sky-400 flex items-center gap-1 hover:underline"
                title="Isi contoh 3 peserta dan Rp100.000 untuk simulasi"
              >
                <Sparkles className="w-3 h-3" />
                Contoh Demo
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newParticipantSimple.trim();
                if (!trimmed || participantsSimple.includes(trimmed)) return;
                setParticipantsSimple([...participantsSimple, trimmed]);
                setNewParticipantSimple('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newParticipantSimple}
                onChange={(e) => setNewParticipantSimple(e.target.value)}
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

            <div className="flex flex-wrap gap-2 pt-1">
              {participantsSimple.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50/70 dark:bg-slate-800 text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-slate-700"
                >
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (participantsSimple.length <= 1) {
                        alert('Minimal harus ada 1 peserta.');
                        return;
                      }
                      setParticipantsSimple(participantsSimple.filter((_, i) => i !== idx));
                    }}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Subtotal Input */}
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

          {/* Tax & Service Settings */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Pengaturan Pajak & Biaya Layanan
              </h3>
              <span className="text-[11px] font-medium text-slate-400">
                {(!hasTaxSimple && !hasServiceSimple) ? 'Mode: Bersih Tanpa Tambahan' : 'Dihitung dari Subtotal'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tax */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pajak Resto (PB1 / PPN)
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasTaxSimple(!hasTaxSimple)}
                    className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                      hasTaxSimple ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'
                    }`}
                  >
                    {hasTaxSimple ? <ToggleRight className="w-6 h-6 text-blue-600 dark:text-sky-400" /> : <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600" />}
                    {hasTaxSimple ? 'Aktif' : 'Mati (0)'}
                  </button>
                </div>

                {hasTaxSimple && (
                  <div className="flex gap-2 animate-in fade-in">
                    <input
                      type="number"
                      value={taxValueSimple}
                      onChange={(e) => setTaxValueSimple(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={taxTypeSimple === 'percent' ? '10' : '10000'}
                      className="flex-1 h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[11px] p-0.5 bg-slate-100 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => setTaxTypeSimple('percent')}
                        className={`px-3 py-1 font-bold rounded-lg transition-all ${
                          taxTypeSimple === 'percent' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxTypeSimple('nominal')}
                        className={`px-3 py-1 font-bold rounded-lg transition-all ${
                          taxTypeSimple === 'nominal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Rp
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Service */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Biaya Layanan (Service)
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasServiceSimple(!hasServiceSimple)}
                    className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                      hasServiceSimple ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'
                    }`}
                  >
                    {hasServiceSimple ? <ToggleRight className="w-6 h-6 text-blue-600 dark:text-sky-400" /> : <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600" />}
                    {hasServiceSimple ? 'Aktif' : 'Mati (0)'}
                  </button>
                </div>

                {hasServiceSimple && (
                  <div className="flex gap-2 animate-in fade-in">
                    <input
                      type="number"
                      value={serviceValueSimple}
                      onChange={(e) => setServiceValueSimple(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={serviceTypeSimple === 'percent' ? '5' : '5000'}
                      className="flex-1 h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[11px] p-0.5 bg-slate-100 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => setServiceTypeSimple('percent')}
                        className={`px-3 py-1 font-bold rounded-lg transition-all ${
                          serviceTypeSimple === 'percent' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceTypeSimple('nominal')}
                        className={`px-3 py-1 font-bold rounded-lg transition-all ${
                          serviceTypeSimple === 'nominal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
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

          {/* Results Card */}
          {calculationSimple ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 text-white p-6 rounded-[32px] shadow-xl shadow-blue-500/25 space-y-5 animate-in fade-in">
              <div className="relative z-10 flex items-start justify-between pb-4 border-b border-white/15">
                <div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200 block mb-1">
                    Total Tagihan Final
                  </span>
                  <p className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
                    {formatRupiah(calculationSimple.total)}
                  </p>
                </div>
                <div className="text-right text-[11px] text-blue-100/90 space-y-0.5 font-medium">
                  <p>Subtotal: <strong className="text-white">{formatRupiah(calculationSimple.subtotal)}</strong></p>
                  <p>Pajak: <strong className="text-white">{formatRupiah(calculationSimple.taxAmount)}</strong></p>
                  <p>Service: <strong className="text-white">{formatRupiah(calculationSimple.serviceAmount)}</strong></p>
                </div>
              </div>

              <div className="relative z-10 space-y-2.5">
                <span className="text-xs font-extrabold text-blue-100 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  Rincian Bagian per Orang (Bagi Rata):
                </span>
                <div className="space-y-2">
                  {calculationSimple.shares.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-white/25 text-white text-[11px] font-black flex items-center justify-center shadow-inner">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-white tracking-tight">{s.name}</span>
                        {s.extraRemainder > 0 && (
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

              {/* Mode 1 Catat Porsi Saya ke Buku Pengeluaran */}
              {(() => {
                const myShareObj =
                  calculationSimple.shares.find((s) => s.name === currentUserName || s.name === 'Saya') ||
                  calculationSimple.shares[0];
                const myShareAmount = myShareObj?.finalAmount || 0;
                if (myShareAmount <= 0) return null;
                return (
                  <div className="relative z-10 pt-2 space-y-2">
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={() =>
                        handleRecordMyShare(
                          myShareAmount,
                          `Patungan: ${subtotalSimple ? 'Makan Bersama' : 'Tagihan'}`
                        )
                      }
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>
                        {isRecording
                          ? 'Menyimpan ke Buku...'
                          : `Catat Porsi Saya (${formatRupiah(myShareAmount)}) ke Pengeluaran ⚡`}
                      </span>
                    </button>

                    {recordedStatus && (
                      <div className="p-3 rounded-2xl bg-emerald-500/30 border border-emerald-300/40 text-white text-xs font-bold flex items-center justify-between animate-in fade-in">
                        <span>{recordedStatus}</span>
                        {onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab('riwayat')}
                            className="underline text-emerald-200 hover:text-white font-black ml-2 shrink-0"
                          >
                            Lihat Riwayat →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300">
              Masukkan subtotal dan minimal satu peserta untuk melihat hasil pembagian tagihan.
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* MODE 2: TAHAP 10 ITEM SPLIT, DISCOUNTS & SETTLEMENT           */}
      {/* ============================================================== */}
      {splitMode === 'item' && (
        <>
          {/* Quick 3-Step Guided Workflow Banner */}
          <div className="p-4 rounded-[24px] bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/90 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-100 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-sky-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Alur 3 Langkah Patungan
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                Cepat • Akurat • Tanpa Selisih
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-blue-100/60 dark:border-slate-700/60 flex items-start gap-2 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white text-[11px]">Tulis Menu Pesanan</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">Ketik nama menu, porsi, dan harga.</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-blue-100/60 dark:border-slate-700/60 flex items-start gap-2 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white text-[11px]">Tambah Teman & Bagi</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">Ketik nama teman atau klik Bagi Rata.</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-blue-100/60 dark:border-slate-700/60 flex items-start gap-2 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white text-[11px]">Pelunasan & WhatsApp</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">Klik "Saya Bayar Lunas" & bagikan rekap.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Title & Actions Header */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Nama & Tanggal Tagihan
                </label>
                <span className="text-[10px] text-slate-400">
                  {draft.title || 'Belum ada nama'} • {draft.items.length} Menu
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={handleStartNewDraft}
                  className="h-8.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Baru</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Judul tagihan / nama resto..."
                className="col-span-2 h-10 px-3.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="h-10 px-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Participants Management Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Daftar Peserta ({draft.participants.length} Orang)
              </label>
              {draft.items.length > 0 && draft.participants.length > 1 && (
                <button
                  type="button"
                  onClick={handleAssignAllItemsToAll}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-sky-400 flex items-center gap-1 hover:underline"
                  title="Alokasikan semua menu ke seluruh peserta secara merata"
                >
                  <Sparkles className="w-3 h-3" />
                  Bagi Rata Semua
                </button>
              )}
            </div>

            <form onSubmit={handleAddParticipantMode2} className="flex gap-2">
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder="Ketik nama teman..."
                className="flex-1 h-10 px-3.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 h-10 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </form>

            {/* Quick Suggestions for friends */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
              <span className="text-[10px] font-semibold text-slate-400 mr-0.5">Saran cepat:</span>
              {['Budi', 'Citra', 'Denis', 'Siti', 'Andi'].map((suggestedName) => {
                const alreadyAdded = draft.participants.some((p) => p.name.toLowerCase() === suggestedName.toLowerCase());
                if (alreadyAdded) return null;
                return (
                  <button
                    key={suggestedName}
                    type="button"
                    onClick={() => {
                      const newP: Participant = { id: `p-${Date.now()}`, name: suggestedName };
                      const updatedParticipants = [...draft.participants, newP];
                      const updated: BillDraft = {
                        ...draft,
                        participants: updatedParticipants,
                        updatedAt: new Date().toISOString(),
                      };
                      setDraft(updated);
                      saveBillDraft(updated);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                  >
                    + {suggestedName}
                  </button>
                );
              })}
            </div>

            {draft.participants.length === 1 && (
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-sky-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Ketik nama teman di atas lalu klik <strong>+ Tambah</strong> untuk membagi menu dengan mereka.</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {draft.participants.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50/70 dark:bg-slate-800 text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-slate-700 shadow-xs"
                >
                  <span>{p.name}</span>
                  {draft.participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipantMode2(p.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title={`Hapus ${p.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Menu Items Management Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Menu Pesanan ({draft.items.length} Item)
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadDemoItem}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-sky-400 flex items-center gap-1 hover:underline"
                  title="Muat menu contoh untuk simulasi"
                >
                  <Sparkles className="w-3 h-3" />
                  Isi Contoh Demo
                </button>
                <span className="text-xs font-black text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl">
                  Subtotal: {formatRupiah(calculationItem.grossSubtotal)}
                </span>
              </div>
            </div>

            {/* Bulk Action Toolbar for 12 Items Assignment */}
            {draft.items.length > 0 && draft.participants.length > 1 && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/80 to-sky-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Cara Cepat Bagi Banyak Menu:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAssignAllItemsToAll}
                      className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1"
                      title="Bagi rata seluruh menu ke semua peserta"
                    >
                      <Sparkles className="w-3 h-3" />
                      ⚡ Bagi Rata Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAllItemAssignments}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700 shadow-xs active:scale-95 transition-all flex items-center gap-1"
                      title="Kosongkan alokasi menu agar teman bisa pilih menunya masing-masing"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      Reset Pilihan
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  👉 Jika masing-masing orang memesan menu berbeda, klik <strong>Reset Pilihan</strong> lalu cukup tap nama teman di setiap menu. Menu bersama cukup klik tombol <strong>Semua</strong>.
                </p>
              </div>
            )}

            {/* Form Tambah Item Menu */}
            <form onSubmit={handleAddItemMode2} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                + Tambah Item Menu Baru
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nama menu (cth: Mie Goreng)"
                  className="col-span-2 h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="Qty"
                  min="1"
                  className="h-10 px-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="Harga per unit (cth: 25000)"
                  min="1"
                  className="w-full h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Checkbox siapa yang makan */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Siapa yang menikmati menu ini? (Pilih satu atau lebih):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {draft.participants.map((p) => {
                    const isChecked = newItemAssigned.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            if (newItemAssigned.length === 1) return;
                            setNewItemAssigned(newItemAssigned.filter((id) => id !== p.id));
                          } else {
                            setNewItemAssigned([...newItemAssigned, p.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 active:scale-95 ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isChecked ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                + Masukkan ke Tagihan
              </button>
            </form>

            {/* Empty State when no items added yet */}
            {draft.items.length === 0 ? (
              <div className="p-6 rounded-2xl bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mx-auto text-blue-500">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Belum Ada Menu Pesanan
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs mx-auto">
                    Ketik menu pesanan Anda pada formulir di atas atau gunakan contoh pesanan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDemoItem}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 text-xs font-bold border border-blue-200 dark:border-slate-700 shadow-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-all inline-flex items-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Isi Contoh Pesanan (Demo)
                </button>
              </div>
            ) : (
              /* List Items with Modern Participant Claim Chips */
              <div className="space-y-3">
              {draft.items.map((item) => {
                const isUnassigned = item.assignedParticipantIds.length === 0;
                const isAllAssigned =
                  draft.participants.length > 1 &&
                  item.assignedParticipantIds.length === draft.participants.length;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnassigned
                        ? 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60 shadow-sm'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</p>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                            {item.quantity}x
                          </span>
                        </div>
                        <p className="text-xs font-black text-blue-600 dark:text-sky-400 mt-0.5">
                          {formatRupiah(item.price * item.quantity)}
                          {item.quantity > 1 && (
                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                              (@{formatRupiah(item.price)})
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemMode2(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Hapus menu ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Assigned Participants Interactive Chips */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Siapa yang makan menu ini?
                        </span>
                        {draft.participants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => assignItemToAll(item.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 ${
                              isAllAssigned
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                            title="Bagi rata menu ini ke semua teman"
                          >
                            <Users className="w-3 h-3" />
                            {isAllAssigned ? '✓ Semua Peserta' : '👥 Bagi ke Semua'}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {draft.participants.map((p) => {
                          const isAssigned = item.assignedParticipantIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleAssigneeForItem(item.id, p.id)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                                isAssigned
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                              }`}
                            >
                              {isAssigned ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Plus className="w-3 h-3 text-slate-400" />
                              )}
                              <span>{p.name}</span>
                            </button>
                          );
                        })}
                      </div>

                      {isUnassigned && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-900/60">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span>Belum ada yang klaim menu ini — tap nama teman di atas untuk membaginya.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

          {/* Pre-Tax Discount & Fee Settings Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-blue-600" />
              Diskon Promo & Pajak/Layanan
            </h3>

            {/* Diskon Nominal Sebelum Pajak & Service */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Diskon Nominal Promo (Sebelum Pajak & Servis)
                </label>
                {draft.discountAmount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Aktif (-{formatRupiah(draft.discountAmount)})
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-extrabold text-amber-600">Rp</span>
                <input
                  type="number"
                  value={draft.discountAmount || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      discountAmount: e.target.value ? Math.max(0, parseInt(e.target.value, 10)) : 0,
                    })
                  }
                  placeholder="0 (cth: 20000)"
                  min="0"
                  className="w-full h-9 pl-9 pr-3 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400">
                Diskon dialokasikan proporsional ke tiap peserta dengan metode Largest Remainder.
              </p>
            </div>

            {/* Pajak & Service Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pajak Resto (% atau Rp)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={draft.taxValue || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        taxValue: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    placeholder="10"
                    className="flex-1 h-9 px-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        taxType: draft.taxType === 'percent' ? 'nominal' : 'percent',
                      })
                    }
                    className="px-2.5 h-9 rounded-xl bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-sky-300 text-xs font-bold border border-blue-200 dark:border-slate-700"
                  >
                    {draft.taxType === 'percent' ? '%' : 'Rp'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Service Charge (% atau Rp)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={draft.serviceValue || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        serviceValue: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    placeholder="5"
                    className="flex-1 h-9 px-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        serviceType: draft.serviceType === 'percent' ? 'nominal' : 'percent',
                      })
                    }
                    className="px-2.5 h-9 rounded-xl bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-sky-300 text-xs font-bold border border-blue-200 dark:border-slate-700"
                  >
                    {draft.serviceType === 'percent' ? '%' : 'Rp'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warnings (Blocks finalization if item without participants) */}
          {!validation.isValid && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 space-y-1.5 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Belum dapat difinalisasi:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {validation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mode 2 Results: Luminous Blue Card with Exact Breakdowns */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 text-white p-6 rounded-[32px] shadow-xl shadow-blue-500/25 space-y-5 animate-in fade-in">
            {/* Header & Total */}
            <div className="relative z-10 flex items-start justify-between pb-4 border-b border-white/15">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200 block mb-1">
                  Total Tagihan Final ({draft.title})
                </span>
                <p className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  {formatRupiah(calculationItem.totalBill)}
                </p>
              </div>
              <div className="text-right text-[11px] text-blue-100/90 space-y-0.5 font-medium">
                <p>Kotor: <strong className="text-white">{formatRupiah(calculationItem.grossSubtotal)}</strong></p>
                {calculationItem.discountAmount > 0 && (
                  <p className="text-amber-200">Diskon: -{formatRupiah(calculationItem.discountAmount)}</p>
                )}
                <p>Pajak: <strong className="text-white">{formatRupiah(calculationItem.taxAmount)}</strong></p>
                <p>Service: <strong className="text-white">{formatRupiah(calculationItem.serviceAmount)}</strong></p>
              </div>
            </div>

            {/* Breakdown per participant */}
            <div className="relative z-10 space-y-2.5">
              <span className="text-xs font-extrabold text-blue-100 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Alokasi Bagian Tiap Peserta:
              </span>
              <div className="space-y-2">
                {calculationItem.participantBreakdowns.map((b) => (
                  <div
                    key={b.participantId}
                    className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white tracking-tight">
                        {b.participantName}
                      </span>
                      <span className="text-base font-black text-white">
                        {formatRupiah(b.finalShareAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-blue-100/80 pt-1 border-t border-white/10">
                      <span>Menu: {formatRupiah(b.rawItemSubtotal)}</span>
                      {b.allocatedDiscount > 0 && (
                        <span className="text-amber-300">-Diskon {formatRupiah(b.allocatedDiscount)}</span>
                      )}
                      <span>Pajak+Srv: {formatRupiah(b.allocatedTax + b.allocatedService)}</span>
                    </div>

                    {/* Paid & Balance */}
                    <div className="flex items-center justify-between text-[11px] font-bold pt-1">
                      <span className="text-blue-100">
                        Sudah Bayar: {formatRupiah(b.totalPaid)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          b.balance === 0
                            ? 'bg-emerald-400/25 text-emerald-200'
                            : b.balance > 0
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-purple-300 text-purple-950'
                        }`}
                      >
                        {b.balance === 0
                          ? '✓ Lunas'
                          : b.balance > 0
                          ? `Kurang ${formatRupiah(b.balance)}`
                          : `Lebih ${formatRupiah(Math.abs(b.balance))}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Status Badge */}
            <div className="relative z-10 p-3.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-between text-xs font-bold">
              <span>Status Pembayaran Tagihan:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black ${
                  calculationItem.isFullyPaid
                    ? 'bg-emerald-400 text-emerald-950'
                    : calculationItem.totalPayments < calculationItem.totalBill
                    ? 'bg-amber-300 text-amber-950'
                    : 'bg-purple-300 text-purple-950'
                }`}
              >
                {calculationItem.isFullyPaid
                  ? '✓ LUNAS 100%'
                  : calculationItem.totalPayments < calculationItem.totalBill
                  ? `Kurang ${formatRupiah(calculationItem.paymentDifference)}`
                  : `Kelebihan ${formatRupiah(Math.abs(calculationItem.paymentDifference))}`}
              </span>
            </div>

            {/* Share & Copy Buttons */}
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
                <span>Bagikan WhatsApp</span>
              </button>
            </div>

            {/* Fitur 3: Expandable Info Rekening / E-Wallet Tujuan Transfer */}
            <div className="relative z-10 pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentInfoInput(!showPaymentInfoInput)}
                className="text-[11px] font-bold text-sky-100 hover:text-white flex items-center gap-1 underline underline-offset-2 transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {showPaymentInfoInput ? 'Tutup Pengaturan Rekening ▲' : '+ Tambah No. Rekening/E-Wallet ke WhatsApp & Link Publik ▼'}
              </button>

              {showPaymentInfoInput && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 space-y-2 text-xs animate-in fade-in">
                  <span className="font-extrabold text-white text-[11px] block">
                    Info Tujuan Transfer Teman:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={paymentBankName}
                      onChange={(e) => setPaymentBankName(e.target.value)}
                      placeholder="Bank (cth: BCA)"
                      className="h-9 px-2.5 rounded-xl bg-white/90 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none text-xs"
                    />
                    <input
                      type="text"
                      value={paymentAccountNumber}
                      onChange={(e) => setPaymentAccountNumber(e.target.value)}
                      placeholder="No. Rekening"
                      className="h-9 px-2.5 rounded-xl bg-white/90 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none text-xs col-span-2"
                    />
                  </div>
                  <input
                    type="text"
                    value={paymentAccountHolder}
                    onChange={(e) => setPaymentAccountHolder(e.target.value)}
                    placeholder="Atas Nama (a.n.)"
                    className="w-full h-9 px-2.5 rounded-xl bg-white/90 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none text-xs"
                  />
                  <p className="text-[10px] text-sky-100">
                    Otomatis terlampir di chat WhatsApp dan link publik yang dibuka teman.
                  </p>
                </div>
              )}
            </div>

            {/* Mode 2 Catat Porsi Saya ke Buku Pengeluaran */}
            {(() => {
              const myBreakdown =
                calculationItem.participantBreakdowns.find(
                  (b) => b.participantName === currentUserName || b.participantName === 'Saya'
                ) || calculationItem.participantBreakdowns[0];
              const myShareAmount = myBreakdown?.finalShareAmount || 0;
              if (myShareAmount <= 0) return null;
              return (
                <div className="relative z-10 pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() =>
                      handleRecordMyShare(
                        myShareAmount,
                        `Patungan: ${draft.title || 'Makan Bersama'}`
                      )
                    }
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>
                      {isRecording
                        ? 'Menyimpan ke Buku...'
                        : `Catat Porsi Saya (${formatRupiah(myShareAmount)}) ke Pengeluaran ⚡`}
                    </span>
                  </button>

                  {recordedStatus && (
                    <div className="p-3 rounded-2xl bg-emerald-500/30 border border-emerald-300/40 text-white text-xs font-bold flex items-center justify-between animate-in fade-in">
                      <span>{recordedStatus}</span>
                      {onNavigateTab && (
                        <button
                          onClick={() => onNavigateTab('riwayat')}
                          className="underline text-emerald-200 hover:text-white font-black ml-2 shrink-0"
                        >
                          Lihat Riwayat →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Finalization Button */}
            <div className="relative z-10 pt-1">
              <button
                type="button"
                onClick={handleToggleFinalize}
                disabled={!validation.isValid}
                className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 ${
                  draft.isFinalized
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                    : validation.isValid
                    ? 'bg-white hover:bg-sky-50 text-blue-700 shadow-lg shadow-black/10'
                    : 'bg-white/20 text-white/50 cursor-not-allowed border border-white/10'
                }`}
              >
                {draft.isFinalized ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                    <span>✓ Tagihan Telah Difinalisasi (Klik untuk Buka Kunci)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Finalisasi & Kunci Tagihan Ini</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tagihan Finalized Banner */}
          {draft.isFinalized && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tagihan ini sudah berstatus Final. Semua menu dan alokasi transfer terkunci aman.</span>
            </div>
          )}

          {/* Fitur 2: Cara Penyelesaian Paling Ringkas (Group Debt Simplification) */}
          {simplifiedDebtResult && simplifiedDebtResult.transfers.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-100 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  <span>Cara Penyelesaian Paling Ringkas</span>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-sky-300 border border-blue-100 dark:border-slate-700">
                  ⚡ {simplifiedDebtResult.simplifiedTransferCount} Transfer Saja
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {calculationItem.isFullyPaid
                  ? 'Diringkas otomatis dengan algoritma greedy match agar tidak ada transfer silang yang rumit:'
                  : `Simulasi ringkas jika tagihan ditalangi oleh ${draft.participants[0]?.name || 'Saya'}. Teman cukup transfer sesuai daftar berikut:`}
              </p>

              <div className="space-y-2 pt-1">
                {simplifiedDebtResult.transfers.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <strong className="text-blue-900 dark:text-sky-300 font-bold">{t.fromName}</strong>
                      <span className="text-slate-400">transfer ke</span>
                      <strong className="text-blue-900 dark:text-sky-300 font-bold">{t.toName}</strong>
                    </div>
                    <span className="font-black text-blue-700 dark:text-sky-400 text-sm">
                      {formatRupiah(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Recording Ledger Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-blue-50/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(30,58,138,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Catatan Pembayaran Nyata ({draft.payments.length} Entri)
              </h3>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Total Terbayar: {formatRupiah(calculationItem.totalPayments)}
              </span>
            </div>

            {/* Quick 1-Click "Saya Bayar Lunas ke Kasir" Button */}
            {calculationItem.totalBill > 0 && !calculationItem.isFullyPaid && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-800/60 border border-blue-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Talangi Kasir Sekaligus?
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Otomatis catat pembayaran Rp{calculationItem.totalBill.toLocaleString('id-ID')} atas nama {draft.participants[0]?.name || 'Saya'}, agar rincian transfer teman langsung muncul.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleQuickFullPaymentByMe}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Saya Bayar Lunas
                </button>
              </div>
            )}

            {/* Input Pembayaran Baru */}
            <form onSubmit={handleAddPayment} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                + Catat Pembayaran Peserta
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={paymentPayerId}
                  onChange={(e) => setPaymentPayerId(e.target.value)}
                  className="h-10 px-3 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {draft.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="Nominal (cth: 50000)"
                  min="1"
                  className="h-10 px-3 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Catatan (cth: Bayar kasir, transfer QRIS)..."
                className="w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />

              <button
                type="submit"
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl active:scale-95 transition-all"
              >
                + Simpan Pembayaran
              </button>
            </form>

            {/* List Payments */}
            <div className="space-y-2">
              {draft.payments.map((pmt) => {
                const payerName = draft.participants.find((p) => p.id === pmt.participantId)?.name || 'Peserta';
                return (
                  <div
                    key={pmt.id}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{payerName}</p>
                      {pmt.note && <p className="text-[11px] text-slate-400">{pmt.note}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-blue-600 dark:text-sky-400">
                        {formatRupiah(pmt.amountPaid)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(pmt.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal Drafts Tersimpan */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-blue-50 dark:border-slate-800 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Draft Tagihan Tersimpan
              </h3>
              <button
                onClick={() => setShowDraftsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {savedDrafts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Belum ada draft tagihan yang tersimpan di browser.
                </p>
              ) : (
                savedDrafts.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleLoadDraft(d)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{d.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {d.date} • {d.items.length} item • {d.participants.length} orang
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteDraft(d.id, e)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Hapus draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowDraftsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
