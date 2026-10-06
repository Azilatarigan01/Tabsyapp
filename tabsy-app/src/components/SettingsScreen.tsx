'use client';

import React, { useState, useRef } from 'react';
import { Transaction, UserProfile, DEFAULT_AVATARS } from '@/types';
import { exportTransactionsToCSV } from '@/lib/export/csv';
import { generateBackupJSON, parseAndValidateBackup } from '@/lib/export/backup';
import { importTransactions, clearAllTransactions, getAllBillDrafts, saveBillDraft } from '@/lib/db';
import { formatRupiah } from '@/lib/domain/calculator';
import {
  User,
  ShieldCheck,
  Download,
  Upload,
  FileSpreadsheet,
  Cloud,
  HelpCircle,
  MessageSquare,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Wallet,
  Sparkles,
  LogOut,
} from 'lucide-react';

interface SettingsScreenProps {
  transactions: Transaction[];
  onTransactionsChanged: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenIntro?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  transactions,
  onTransactionsChanged,
  userProfile,
  onUpdateProfile,
  onOpenIntro,
  onOpenAuth,
  onLogout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar);
  const [editBudget, setEditBudget] = useState<number | ''>(userProfile.monthlyBudget);
  const [editPaydayDate, setEditPaydayDate] = useState<number | ''>(userProfile.paydayDate || 25);

  // Restore Modal State
  const [restoreCandidate, setRestoreCandidate] = useState<any>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreReport, setRestoreReport] = useState<{ added: number; skipped: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    const updated: UserProfile = {
      ...userProfile,
      name: editName.trim(),
      avatar: editAvatar,
      monthlyBudget: typeof editBudget === 'number' && editBudget > 0 ? editBudget : 3500000,
      paydayDate: typeof editPaydayDate === 'number' && editPaydayDate >= 1 && editPaydayDate <= 31 ? editPaydayDate : 25,
    };

    onUpdateProfile(updated);
    setIsEditingProfile(false);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Belum ada riwayat transaksi untuk diunduh.');
      return;
    }
    exportTransactionsToCSV(transactions);
  };

  const handleBackupFile = async () => {
    try {
      const drafts = await getAllBillDrafts();
      if (transactions.length === 0 && drafts.length === 0) {
        alert('Belum ada data untuk dicadangkan.');
        return;
      }
      generateBackupJSON(transactions, drafts, userProfile);
    } catch {
      generateBackupJSON(transactions, [], userProfile);
    }
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
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;

    setIsProcessing(true);
    try {
      // 1. Restore transactions
      const report = await importTransactions(restoreCandidate.transactions);

      // 2. Restore bill drafts if present
      let draftsRestored = 0;
      if (Array.isArray(restoreCandidate.billDrafts)) {
        for (const draft of restoreCandidate.billDrafts) {
          await saveBillDraft(draft);
          draftsRestored++;
        }
      }

      // 3. Restore user profile if present
      if (restoreCandidate.userProfile) {
        onUpdateProfile(restoreCandidate.userProfile);
      }

      setRestoreReport({ added: report.added, skipped: report.skipped });
      setRestoreCandidate(null);
      onTransactionsChanged();
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : 'Gagal memulihkan data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh data transaksi akun ini? Tindakan ini tidak dapat dibatalkan.')) {
      await clearAllTransactions();
      onTransactionsChanged();
      alert('Seluruh data transaksi berhasil dibersihkan.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* User Profile Card (Matching Neo-banking Reference) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-sky-500/20 shrink-0">
              {userProfile.avatar || '👩‍💼'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {userProfile.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {userProfile.email ? 'Akun Terhubung' : 'Lokal Offline'}
                </span>
              </div>
              {userProfile.email && (
                <p className="text-[11px] font-semibold text-slate-400">{userProfile.email}</p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                Target Budget: <strong className="text-slate-700 dark:text-slate-300">{formatRupiah(userProfile.monthlyBudget)}</strong>/bln
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                {userProfile.email ? 'Kelola Akun' : 'Masuk / Daftar'}
              </button>
            )}
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors border border-sky-200 dark:border-slate-700 cursor-pointer"
            >
              {isEditingProfile ? 'Tutup' : 'Ubah Profil'}
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin keluar dari akun Tabsy? Sesi akan diakhiri dan kembali ke layar sambutan.')) {
                    onLogout();
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Avatar:</label>
              <div className="flex gap-2">
                {DEFAULT_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEditAvatar(av)}
                    className={`w-9 h-9 rounded-xl text-base flex items-center justify-center ${
                      editAvatar === av ? 'bg-sky-500 text-white scale-105' : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Panggilan</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Anggaran Bulanan (Rp)</label>
                <input
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Gajian Bulanan (1–31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={editPaydayDate}
                onChange={(e) => setEditPaydayDate(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="25"
                className="w-full h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
              <span className="text-[10px] text-slate-400">
                Digunakan untuk rumus Batas Aman Belanja Harian Dinamis (Safe-to-Spend)
              </span>
            </div>

            <button
              type="submit"
              className="w-full h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
            >
              Simpan Profil Baru
            </button>
          </form>
        )}
      </div>

      {/* Welcome Intro Screen Tour Banner */}
      {onOpenIntro && (
        <div className="p-4 rounded-3xl bg-blue-50/60 dark:bg-slate-800/80 border border-blue-200/60 dark:border-slate-700/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center text-sm font-black shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Orientasi & Pengenalan Aplikasi</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300 font-bold">Panduan</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Buka kembali ringkasan fitur produktivitas, keuangan, dan kustomisasi persona
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenIntro}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            Buka Panduan
          </button>
        </div>
      )}

      {/* Financial Management & Reports (Professional Fintech Section) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-sky-500" />
          Manajemen Data & Ekspor
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* Download Spreadsheet */}
          <button
            onClick={handleExportCSV}
            className="w-full py-3 flex items-center justify-between hover:text-sky-600 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Ekspor Laporan Transaksi (.xlsx / .csv)</p>
                <p className="text-[11px] text-slate-500">Format kompatibel untuk Microsoft Excel, Google Sheets, dan Numbers</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
          </button>

          {/* Backup File */}
          <button
            onClick={handleBackupFile}
            className="w-full py-3 flex items-center justify-between hover:text-sky-600 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Cadangkan Seluruh Basis Data (JSON)</p>
                <p className="text-[11px] text-slate-500">Simpan salinan cadangan lengkap mencakup transaksi, draft tagihan, dan profil</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
          </button>

          {/* Restore File */}
          <div className="w-full py-3 flex items-center justify-between group">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 cursor-pointer flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Pulihkan Data dari Cadangan</p>
                <p className="text-[11px] text-slate-500">Impor file cadangan JSON untuk memulihkan riwayat catatan</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Restore Report */}
        {restoreReport && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Berhasil memulihkan {restoreReport.added} transaksi baru (dilewati {restoreReport.skipped} transaksi duplikat).</span>
          </div>
        )}

        {/* Restore Error */}
        {restoreError && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}

        {/* Restore Preview Confirmation */}
        {restoreCandidate && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-in fade-in">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Konfirmasi Pemulihan Akun:
            </p>
            <p className="text-[11px] text-slate-500">
              Ditemukan {restoreCandidate.transactions.length} transaksi dalam file cadangan.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-600 text-white"
              >
                {isProcessing ? 'Memulihkan...' : 'Lanjutkan Pulihkan'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Support & Privacy (Proper Consumer App Section) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-sky-500" />
          Keamanan & Privasi Data
        </h3>

        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">Privasi Terisolasi di Perangkat</p>
            <p className="text-[11px] leading-relaxed">
              Tabsy beroperasi secara lokal. Seluruh riwayat transaksi keuangan dan rutinitas harian Anda tersimpan secara privat di memori peramban tanpa transmisi ke pihak ketiga.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">Migrasi Antar Perangkat</p>
            <p className="text-[11px] leading-relaxed">
              Sebelum berganti perangkat, gunakan fitur <strong>Cadangkan Seluruh Basis Data</strong> di atas, lalu pulihkan file cadangan pada perangkat baru Anda.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href="mailto:support@tabsy.app?subject=Bantuan%20Penggunaan%20Tabsy"
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Layanan Bantuan & Dukungan
          </a>
        </div>
      </div>

      {/* Danger Zone (Styled cleanly at the bottom) */}
      <div className="p-4 rounded-3xl border border-rose-200/70 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-rose-800 dark:text-rose-400">Reset Seluruh Transaksi</p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/70">Hapus permanen semua riwayat catatan pengeluaran dari perangkat ini</p>
        </div>
        <button
          onClick={handleClearAll}
          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Bersihkan Data
        </button>
      </div>

      {/* App Version Info */}
      <div className="text-center text-[11px] text-slate-400 pt-2 pb-6">
        Tabsy • Personal Productivity & Finance Ledger
      </div>
    </div>
  );
};
