'use client';

import React, { useState, useRef } from 'react';
import { Transaction, UserProfile, DEFAULT_AVATARS } from '@/types';
import { exportTransactionsToCSV } from '@/lib/export/csv';
import { generateBackupJSON, parseAndValidateBackup } from '@/lib/export/backup';
import { importTransactions, clearAllTransactions } from '@/lib/db';
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
} from 'lucide-react';

interface SettingsScreenProps {
  transactions: Transaction[];
  onTransactionsChanged: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  transactions,
  onTransactionsChanged,
  userProfile,
  onUpdateProfile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar);
  const [editBudget, setEditBudget] = useState<number | ''>(userProfile.monthlyBudget);

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

  const handleBackupFile = () => {
    if (transactions.length === 0) {
      alert('Belum ada data untuk dicadangkan.');
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
    e.target.value = '';
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
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* User Profile Card (Matching Neo-banking Reference) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-sky-500/20">
              {userProfile.avatar || '👩‍💼'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {userProfile.name}
                </h2>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Tabsy Plus
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Target Budget: <strong className="text-slate-700 dark:text-slate-300">{formatRupiah(userProfile.monthlyBudget)}</strong>/bln
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors border border-sky-200 dark:border-slate-700"
          >
            {isEditingProfile ? 'Tutup' : 'Ubah Profil'}
          </button>
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

            <button
              type="submit"
              className="w-full h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
            >
              Simpan Profil Baru
            </button>
          </form>
        )}
      </div>

      {/* Financial Management & Reports (Professional Fintech Section) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-sky-500" />
          Laporan & Keamanan Akun
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
                <p className="font-bold text-slate-900 dark:text-white">Unduh Laporan Keuangan (.xlsx / .csv)</p>
                <p className="text-[11px] text-slate-500">Buka langsung di Microsoft Excel atau Google Spreadsheet</p>
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
                <p className="font-bold text-slate-900 dark:text-white">Cadangkan Akun Saya</p>
                <p className="text-[11px] text-slate-500">Simpan riwayat transaksi untuk dipindahkan ke HP lain</p>
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
                <p className="text-[11px] text-slate-500">Pilih file cadangan yang pernah Anda simpan</p>
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
          <HelpCircle className="w-4 h-4 text-sky-500" />
          Bantuan & Privasi
        </h3>

        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">🔒 Privasi Data Akun Anda</p>
            <p className="text-[11px] leading-relaxed">
              Tabsy tidak mengirim data transaksi Anda ke server internet mana pun. Seluruh catatan tersimpan 100% aman di memori perangkat HP/browser ini.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">💡 Tips Sebelum Ganti HP</p>
            <p className="text-[11px] leading-relaxed">
              Jika ingin berganti ponsel atau laptop, klik <strong>"Cadangkan Akun Saya"</strong> di atas untuk menyimpan file cadangan, lalu buka Tabsy di HP baru dan pulihkan.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href="mailto:support@tabsy.app?subject=Bantuan%20Tabsy"
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Bantuan Tabsy
          </a>
        </div>
      </div>

      {/* Danger Zone (Styled cleanly at the bottom) */}
      <div className="p-4 rounded-3xl border border-rose-200/70 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-rose-800 dark:text-rose-400">Reset Seluruh Transaksi</p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/70">Hapus semua riwayat catatan dari perangkat ini</p>
        </div>
        <button
          onClick={handleClearAll}
          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
        >
          Bersihkan
        </button>
      </div>

      {/* App Version Info */}
      <div className="text-center text-[11px] text-slate-400 pt-2 pb-6">
        Tabsy v1.0.0 • Didesain untuk kemudahan pencatatan harian
      </div>
    </div>
  );
};
