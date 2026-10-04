'use client';

import React, { useState, useRef } from 'react';
import { Transaction, BackupDataV1 } from '@/types';
import { exportTransactionsToCSV } from '@/lib/export/csv';
import { generateBackupJSON, parseAndValidateBackup } from '@/lib/export/backup';
import { importTransactions, clearAllTransactions } from '@/lib/db';
import {
  Settings,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface SettingsScreenProps {
  transactions: Transaction[];
  onTransactionsChanged: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  transactions,
  onTransactionsChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore Preview Modal state
  const [restoreCandidate, setRestoreCandidate] = useState<BackupDataV1 | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreReport, setRestoreReport] = useState<{ added: number; skipped: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Belum ada transaksi untuk diekspor.');
      return;
    }
    exportTransactionsToCSV(transactions);
  };

  const handleBackupJSON = () => {
    if (transactions.length === 0) {
      alert('Belum ada transaksi untuk dicadangkan.');
      return;
    }
    generateBackupJSON(transactions);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreReport(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseAndValidateBackup(content);
      if (result.success) {
        setRestoreCandidate(result.data);
      } else {
        setRestoreError(result.error);
      }
    };
    reader.onerror = () => {
      setRestoreError('Gagal membaca file dari perangkat.');
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;

    setIsProcessing(true);
    try {
      const report = await importTransactions(restoreCandidate.transactions);
      setRestoreReport({ added: report.added, skipped: report.skipped });
      setRestoreCandidate(null);
      onTransactionsChanged();
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : 'Gagal memulihkan transaksi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SELURUH transaksi lokal? Tindakan ini tidak dapat dibatalkan.')) {
      await clearAllTransactions();
      onTransactionsChanged();
      alert('Seluruh transaksi lokal berhasil dihapus.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-500" />
          Pengaturan & Penyimpanan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Kelola data lokal, unduh laporan, cadangkan (backup), dan pulihkan (restore).
        </p>
      </div>

      {/* Storage Information Card (PRD Requirement) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Status Penyimpanan Lokal
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50">
            IndexedDB Aktif
          </span>
        </div>

        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            • <strong>Lokasi Data:</strong> Data Anda disimpan 100% lokal pada memori internal browser perangkat ini melalui <strong>IndexedDB (Dexie)</strong>.
          </p>
          <p>
            • <strong>Batas Offline & Privasi:</strong> Transaksi tidak dikirim ke server hosting manapun (MVP). Data tidak otomatis tersinkronisasi ke perangkat lain atau browser lain.
          </p>
          <p>
            • <strong>Penting:</strong> Menghapus <em>Site Data/Cookies</em> browser atau menggunakan mode penyamaran (<em>Private/Incognito</em>) dapat menghapus transaksi Anda. Sangat disarankan rutin mencadangkan data JSON di bawah ini.
          </p>
        </div>

        <div className="pt-1 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Jumlah Transaksi Tersimpan:</span>
          <span className="text-slate-900 dark:text-white text-sm font-bold">
            {transactions.length} transaksi
          </span>
        </div>
      </div>

      {/* Backup and Export Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Cadangkan & Ekspor Data
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-850 hover:bg-emerald-50/30 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Ekspor CSV (Excel)</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bisa dibuka langsung di Microsoft Excel & Google Sheets.
            </p>
          </button>

          {/* Backup JSON */}
          <button
            onClick={handleBackupJSON}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-850 hover:bg-blue-50/30 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileJson className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Cadangkan Data (JSON)</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Simpan file backup formatVersion 1 untuk dipulihkan nanti.
            </p>
          </button>
        </div>
      </div>

      {/* Restore Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Pemulihan Data (Restore)
        </h3>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept=".json,application/json"
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-2">
            <Upload className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Klik untuk memilih file backup JSON
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Mendukung file .json yang diekspor dari CatatCepat
          </p>
        </div>

        {/* Restore Error Alert */}
        {restoreError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{restoreError}</span>
          </div>
        )}

        {/* Restore Success Report */}
        {restoreReport && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Pemulihan Selesai!</span>
            </div>
            <p>
              • Transaksi berhasil ditambahkan: <strong>{restoreReport.added}</strong>
            </p>
            <p>
              • Transaksi dilewati (ID sudah ada): <strong>{restoreReport.skipped}</strong>
            </p>
          </div>
        )}

        {/* Restore Confirmation Preview Modal */}
        {restoreCandidate && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Pratinjau File Backup:
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white font-bold">
                Format v{restoreCandidate.formatVersion} Valid
              </span>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p>• Diekspor pada: {new Date(restoreCandidate.exportedAt).toLocaleString('id-ID')}</p>
              <p>• Total transaksi di file: <strong>{restoreCandidate.transactions.length} item</strong></p>
              <p className="text-[11px] text-slate-400">
                Sistem akan memvalidasi UUID dan hanya menambahkan transaksi yang belum ada.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-1"
              >
                {isProcessing ? 'Memproses...' : 'Konfirmasi Pulihkan Data'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help & FAQ Section (Tahap 9 Requirement) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Panduan & Tanya Jawab (FAQ)
        </h3>
        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Q: Bagaimana cara mencatat pengeluaran kilat?</p>
            <p>Cukup ketik nama dan nominal di tab <strong>Catat</strong>, contoh: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 font-mono">kopi 25k</code> atau <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 font-mono">parkir 5rb</code>, lalu tekan Enter atau klik Simpan.</p>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Q: Bagaimana jika ganti HP, laptop, atau pindah domain web?</p>
            <p>Penyimpanan browser terikat pada <em>Origin</em> (alamat web & browser saat ini). Sebelum berganti perangkat atau domain, lakukan <strong>Cadangkan Data (JSON)</strong> di atas, lalu pulihkan di perangkat baru.</p>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Q: Apakah data saya aman dan pribadi?</p>
            <p>Ya, 100% aman dan privat. Tidak ada server hosting atau pihak ketiga yang menyimpan data transaksi Anda di versi MVP ini.</p>
          </div>
        </div>
      </div>

      {/* Feedback Channel (Tahap 9 Requirement) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-blue-500" />
          Kanal Feedback & Dukungan
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Punya saran fitur atau menemukan kendala? Masukan Anda sangat berharga untuk pengembangan rilis berikutnya (v1.1 Split Item & v1.2 OCR).
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href="mailto:support@catatcepat.app?subject=Feedback%20CatatCepat%20v1.0"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            ✉️ Kirim Email Feedback
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            🐙 Laporkan Bug di GitHub
          </a>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-950/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          Zona Bahaya
        </h3>
        <p className="text-xs text-slate-500">
          Menghapus seluruh transaksi yang tersimpan di IndexedDB browser perangkat ini.
        </p>
        <button
          onClick={handleClearAll}
          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900/60 transition-colors"
        >
          Hapus Semua Data Transaksi Lokal
        </button>
      </div>
    </div>
  );
};
