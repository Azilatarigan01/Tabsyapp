'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Tag,
  Percent,
  Receipt,
  UtensilsCrossed,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  validateReceiptImageFile,
  preprocessReceiptImage,
  ProcessedImageResult,
} from '@/lib/ocr/imagePreprocess';
import { runOcrOnImage, terminateActiveOcr, checkOfflineOcrReady } from '@/lib/ocr/ocrEngine';
import { parseReceiptText } from '@/lib/ocr/receiptParser';
import { ReceiptParseResult, ReceiptItem, OcrProgressState } from '@/types/ocr';
import { formatRupiah } from '@/lib/domain/calculator';
import { RECEIPT_DATASET } from '@/lib/ocr/receiptDataset';

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportToSplitBill?: (draftData: {
    title: string;
    date: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    discount: number;
    tax: number;
    service: number;
  }) => void;
  onSaveAsTransaction?: (transactionData: {
    description: string;
    amountRupiah: number;
    date: string;
    category: string;
  }) => void;
}

export const ReceiptScanModal: React.FC<ReceiptScanModalProps> = ({
  isOpen,
  onClose,
  onImportToSplitBill,
  onSaveAsTransaction,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHeicOrPdf, setIsHeicOrPdf] = useState<boolean>(false);
  const [isOfflineReady, setIsOfflineReady] = useState<boolean>(false);

  // OCR state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [progressState, setProgressState] = useState<OcrProgressState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const cancelTokenRef = useRef<{ isCancelled: boolean }>({ isCancelled: false });

  // Parsed and editable receipt draft
  const [parsedResult, setParsedResult] = useState<ReceiptParseResult | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'raw'>('form');

  // Editable fields in draft
  const [merchant, setMerchant] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [service, setService] = useState<number>(0);
  const [printedTotal, setPrintedTotal] = useState<number>(0);

  // New item row input
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number | ''>(1);
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      checkOfflineOcrReady().then((ready) => setIsOfflineReady(ready));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate live reconciled totals from editable fields
  const itemsSum = items.reduce((acc, it) => acc + it.quantity * it.price, 0);
  const calculatedTotal = Math.max(0, itemsSum - discount + tax + service);
  const discrepancy = printedTotal > 0 ? calculatedTotal - printedTotal : 0;
  const isReconciled = printedTotal > 0 && discrepancy === 0;

  const handleFileChange = (file: File) => {
    setErrorMessage(null);
    setIsHeicOrPdf(false);

    const validation = validateReceiptImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'File tidak valid.');
      setIsHeicOrPdf(!!validation.isUnsupportedHeicOrPdf);
      return;
    }

    setSelectedFile(file);
    setRotation(0);
    setParsedResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRotate = async () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    if (previewDataUrl) {
      try {
        const processed = await preprocessReceiptImage(selectedFile!, nextRot, enhanceContrast);
        setPreviewDataUrl(processed.dataUrl);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStartScan = async () => {
    if (!selectedFile && !previewDataUrl) return;

    setIsScanning(true);
    cancelTokenRef.current = { isCancelled: false };
    setErrorMessage(null);

    try {
      // Step 1: Preprocess with Canvas API
      setProgressState({
        status: 'preprocessing',
        progress: 10,
        message: 'Mengoptimalkan kontras & orientasi gambar...',
      });

      const processed: ProcessedImageResult = await preprocessReceiptImage(
        selectedFile || previewDataUrl!,
        rotation,
        enhanceContrast
      );

      // Step 2: Run Tesseract Worker
      const ocrResult = await runOcrOnImage(processed.canvas, {
        cancellationToken: cancelTokenRef.current,
        onProgress: (p) => setProgressState(p),
      });

      // Step 3: Parse rule-based receipt text
      const parsed = parseReceiptText(ocrResult.text, ocrResult.confidence);
      setParsedResult(parsed);

      // Populate editable fields
      setMerchant(parsed.merchantName || 'Struk Belanja');
      setReceiptDate(parsed.date || new Date().toISOString().split('T')[0]);
      setItems(parsed.items);
      setDiscount(parsed.discount);
      setTax(parsed.tax);
      setService(parsed.service);
      setPrintedTotal(parsed.total || parsed.calculatedTotal);
    } catch (err: any) {
      if (!cancelTokenRef.current.isCancelled) {
        setErrorMessage(err?.message || 'Gagal memproses struk.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleCancelScan = async () => {
    cancelTokenRef.current.isCancelled = true;
    await terminateActiveOcr();
    setIsScanning(false);
    setProgressState({
      status: 'cancelled',
      progress: 0,
      message: 'Pemindaian dibatalkan.',
    });
  };

  const handleLoadDemoReceipt = (index: number = 0) => {
    const sample = RECEIPT_DATASET[index];
    const parsed = parseReceiptText(sample.rawText, 98);
    setParsedResult(parsed);
    setSelectedFile(null);
    setPreviewDataUrl(null);
    setMerchant(parsed.merchantName);
    setReceiptDate(parsed.date || new Date().toISOString().split('T')[0]);
    setItems(parsed.items);
    setDiscount(parsed.discount);
    setTax(parsed.tax);
    setService(parsed.service);
    setPrintedTotal(parsed.total);
    setErrorMessage(null);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice || Number(newItemPrice) <= 0) return;

    const qty = Number(newItemQty) > 0 ? Number(newItemQty) : 1;
    const price = Number(newItemPrice);

    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        name: newItemName.trim(),
        quantity: qty,
        price,
        total: qty * price,
      },
    ]);

    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleUpdateItemPrice = (id: string, newPrice: number) => {
    setItems(
      items.map((it) => (it.id === id ? { ...it, price: newPrice, total: it.quantity * newPrice } : it))
    );
  };

  const handleUpdateItemQty = (id: string, newQty: number) => {
    if (newQty <= 0) return;
    setItems(
      items.map((it) => (it.id === id ? { ...it, quantity: newQty, total: newQty * it.price } : it))
    );
  };

  const handleConfirmSplitBill = () => {
    if (onImportToSplitBill) {
      onImportToSplitBill({
        title: merchant || 'Struk Belanja',
        date: receiptDate || new Date().toISOString().split('T')[0],
        items: items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
        })),
        discount,
        tax,
        service,
      });
    }
    onClose();
  };

  const handleConfirmTransaction = () => {
    if (onSaveAsTransaction) {
      onSaveAsTransaction({
        description: merchant || 'Pengeluaran Struk',
        amountRupiah: calculatedTotal || printedTotal,
        date: receiptDate || new Date().toISOString().split('T')[0],
        category: 'makanan',
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] border border-blue-50/80 dark:border-slate-800 shadow-[0_20px_60px_rgba(30,58,138,0.18)] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-b from-blue-50/40 dark:from-blue-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Scan Struk Lokal (OCR)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  {isOfflineReady ? 'Tercache Offline' : 'Privasi Lokal 100%'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pindai foto struk langsung di perangkat tanpa kirim ke AI cloud.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Error & PDF/HEIC Warning */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">{isHeicOrPdf ? 'Petunjuk Konversi File' : 'Peringatan'}</p>
                <p className="leading-relaxed">{errorMessage}</p>
                {isHeicOrPdf && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                    💡 <strong>Tips:</strong> Buka file tersebut di galeri HP Anda lalu lakukan <em>screenshot</em> atau simpan sebagai JPG/PNG sebelum diunggah ke Tabsy.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload / Capture Stage (when no parsed result yet) */}
          {!parsedResult && (
            <div className="space-y-4">
              {/* File Dropzone */}
              {!previewDataUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-3xl p-8 text-center cursor-pointer transition-all hover:bg-blue-50/30 dark:hover:bg-slate-800/30 group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.pdf,.heic"
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-blue-600 dark:text-sky-400 group-hover:scale-110 transition-transform mb-3 shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Pilih atau Tarik Foto Struk ke Sini
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Mendukung format JPG, PNG, WebP (Maksimal 5 MB)
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto / Upload
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadDemoReceipt(0);
                      }}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      Coba Contoh Struk
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview & Adjustments */
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center max-h-72">
                    <img
                      src={previewDataUrl}
                      alt="Receipt Preview"
                      className="object-contain max-h-72 w-full transition-transform"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs">
                      <button
                        type="button"
                        onClick={handleRotate}
                        className="hover:text-sky-400 flex items-center gap-1 font-bold"
                        title="Putar 90 derajat"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Putar ({rotation}°)
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewDataUrl(null);
                        }}
                        className="hover:text-rose-400 font-bold"
                      >
                        Ganti Foto
                      </button>
                    </div>
                  </div>

                  {/* Preprocessing Toggles */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/50 dark:bg-slate-800/50 border border-blue-100/80 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        Penajaman Kontras Otomatis (Canvas)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enhanceContrast}
                        onChange={(e) => setEnhanceContrast(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Scanning Progress Bar */}
                  {isScanning && (
                    <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2.5 animate-pulse">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-sky-300">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 animate-spin" />
                          {progressState.message || 'Menganalisis struk...'}
                        </span>
                        <span>{progressState.progress}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-blue-200/60 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300 rounded-full"
                          style={{ width: `${progressState.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleCancelScan}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
                        >
                          Batal Pemindaian
                        </button>
                      </div>
                    </div>
                  )}

                  {!isScanning && (
                    <button
                      type="button"
                      onClick={handleStartScan}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Receipt className="w-4 h-4" />
                      Mulai Pindai Struk dengan OCR Lokal
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Result Review & Correction Screen (when OCR finished) */}
          {parsedResult && (
            <div className="space-y-4">
              {/* Tab Navigation: Form Koreksi vs Raw OCR Text */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                <div className="grid grid-cols-2 gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('form')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'form'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Form Koreksi & Draft ({items.length} Menu)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('raw')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'raw'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Teks Sumber Mentah OCR
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedResult(null);
                    setPreviewDataUrl(null);
                  }}
                  className="px-3 text-xs font-bold text-slate-500 hover:text-blue-600"
                  title="Pindai struk lain"
                >
                  Ulangi
                </button>
              </div>

              {/* Reconciliation Status Badge */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                  isReconciled
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isReconciled ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-extrabold block">
                      {isReconciled ? '✓ Total Sesuai & Rekonsiliasi Tepat' : '⚠️ Selisih Terdeteksi'}
                    </span>
                    <span className="text-[11px] opacity-90">
                      {isReconciled
                        ? `Total item, diskon & pajak tepat senilai ${formatRupiah(calculatedTotal)}.`
                        : `Hitungan item (${formatRupiah(calculatedTotal)}) selisih ${formatRupiah(
                            Math.abs(discrepancy)
                          )} dibanding struk (${formatRupiah(printedTotal)}).`}
                    </span>
                  </div>
                </div>
                <span className="font-black text-sm shrink-0 ml-2">
                  {formatRupiah(calculatedTotal)}
                </span>
              </div>

              {/* Tab 1: Form Koreksi */}
              {activeTab === 'form' && (
                <div className="space-y-4">
                  {/* Merchant & Date Header */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Nama Toko / Merchant
                      </label>
                      <input
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder="Contoh: Kopi Kenangan"
                        className="w-full h-10 px-3.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Tanggal Transaksi
                      </label>
                      <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Daftar Menu Pesanan</span>
                      <span>Subtotal: {formatRupiah(itemsSum)}</span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2"
                        >
                          <div className="flex-1">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                setItems(
                                  items.map((it) =>
                                    it.id === item.id ? { ...it, name: e.target.value } : it
                                  )
                                )
                              }
                              className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQty(item.id, parseInt(e.target.value, 10) || 1)
                                }
                                className="w-12 h-6 text-center text-xs font-bold rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                              />
                              <span className="text-[10px] text-slate-400">@ Rp</span>
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) =>
                                  handleUpdateItemPrice(item.id, parseInt(e.target.value, 10) || 0)
                                }
                                className="w-24 h-6 px-1.5 text-xs font-bold rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-blue-600 dark:text-sky-400">
                              {formatRupiah(item.quantity * item.price)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                              title="Hapus baris menu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Item Row */}
                    <form
                      onSubmit={handleAddItem}
                      className="grid grid-cols-12 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                    >
                      <input
                        type="text"
                        placeholder="Nama menu baru..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="col-span-6 h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={newItemQty}
                        onChange={(e) =>
                          setNewItemQty(e.target.value ? parseInt(e.target.value, 10) : '')
                        }
                        className="col-span-2 h-9 text-center text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                      <input
                        type="number"
                        placeholder="Harga"
                        value={newItemPrice}
                        onChange={(e) =>
                          setNewItemPrice(e.target.value ? parseInt(e.target.value, 10) : '')
                        }
                        className="col-span-3 h-9 px-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="submit"
                        className="col-span-1 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-sm"
                        title="Tambah Menu"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>
                  </div>

                  {/* Financial Adjustments (Discounts, Tax, Service) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Penyesuaian Biaya & Diskon
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                          Diskon (-Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={discount || ''}
                          onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                          className="w-full h-8 px-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/60 text-amber-700"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Pajak PB1 (+Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tax || ''}
                          onChange={(e) => setTax(parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                          className="w-full h-8 px-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Servis (+Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={service || ''}
                          onChange={(e) => setService(parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                          className="w-full h-8 px-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Raw Text OCR */}
              {activeTab === 'raw' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Teks Mentah Hasil Ekstraksi Tesseract:</span>
                    <span>Confidence: {Math.round(parsedResult.confidenceScore || 0)}%</span>
                  </div>
                  <textarea
                    readOnly
                    rows={10}
                    value={parsedResult.rawText}
                    className="w-full p-3 font-mono text-xs rounded-2xl bg-slate-900 text-emerald-400 border border-slate-800 resize-none focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 italic">
                    * Catatan: Nilai confidence bukan jaminan angka 100% benar. Pengguna dapat memperbaiki field pada tab Form Koreksi sebelum konfirmasi.
                  </p>
                </div>
              )}

              {/* Action Buttons to Import or Save */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmSplitBill}
                    className="h-11 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    Kirim ke Split Bill (Beda Menu)
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTransaction}
                    className="h-11 px-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Simpan Transaksi Pengeluaran
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
