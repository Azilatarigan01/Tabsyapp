'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  registerUser,
  loginUser,
  resetPassword,
  requestPasswordResetOtp,
  verifyOtpAndResetPassword,
  AuthUser,
} from '@/lib/db/auth';
import { DEFAULT_AVATARS, UserProfile } from '@/types';
import { playCelebrationChime } from '@/lib/domain/audioChime';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('2002-05-15');
  const [selectedAvatar, setSelectedAvatar] = useState('🧑‍💻');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = requestPasswordResetOtp(email);
    if (res.success && res.otp) {
      setIsOtpSent(true);
      setOtpCode(res.otp); // Pre-fill convenience or let user see code
      setSimulatedOtpNotice(`📩 [Notifikasi Email Tabsy]: Kode Verifikasi OTP Anda adalah ${res.otp} (Berlaku 10 menit).`);
    } else {
      setErrorMsg(res.error || 'Gagal mengirim kode verifikasi.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (tab === 'forgot') {
        if (!isOtpSent) {
          setErrorMsg('Silakan klik "Kirim Kode OTP" terlebih dahulu untuk memverifikasi kepemilikan email Anda.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi kata sandi tidak cocok.');
          return;
        }
        const res = verifyOtpAndResetPassword({
          email,
          otp: otpCode,
          newPassword: password,
        });
        if (res.success) {
          playCelebrationChime();
          setSuccessMsg('Kata sandi berhasil diperbarui dengan verifikasi OTP! Silakan masuk dengan kata sandi baru Anda.');
          setTab('login');
          setPassword('');
          setConfirmPassword('');
          setOtpCode('');
          setIsOtpSent(false);
          setSimulatedOtpNotice(null);
        } else {
          setErrorMsg(res.error || 'Gagal memverifikasi OTP atau mereset kata sandi.');
        }
      } else if (tab === 'login') {
        const res = loginUser(email, password);
        if (res.success && res.user) {
          playCelebrationChime();
          onAuthSuccess(res.user);
          onClose();
        } else {
          setErrorMsg(res.error || 'Gagal masuk akun.');
        }
      } else {
        const res = registerUser({
          name,
          email,
          password,
          avatar: selectedAvatar,
          birthDate,
        });
        if (res.success && res.user) {
          playCelebrationChime();
          onAuthSuccess(res.user);
          onClose();
        } else {
          setErrorMsg(res.error || 'Gagal membuat akun baru.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        
        {/* Header Mascot Banner */}
        <div className="relative bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 p-6 text-white text-center shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl mx-auto mb-2.5 shadow-inner">
            🐻
          </div>

          <h2 className="text-xl font-black tracking-tight">
            {tab === 'login'
              ? 'Masuk ke Tabsy'
              : tab === 'register'
              ? 'Daftar Akun Baru'
              : 'Reset Kata Sandi'}
          </h2>
          <p className="text-xs text-sky-100 mt-1 max-w-xs mx-auto">
            {tab === 'login'
              ? 'Kelola catatan keuangan & rutinitas harianmu tersimpan aman.'
              : tab === 'register'
              ? 'Daftar untuk sinkronisasi akun & bagikan split bill pendek!'
              : 'Setel ulang kata sandi akun lokal Anda di perangkat ini.'}
          </p>

          {/* Toggle Tab Login / Register */}
          {tab !== 'forgot' ? (
            <div className="mt-4 p-1 rounded-2xl bg-white/20 backdrop-blur-md grid grid-cols-2 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  tab === 'login'
                    ? 'bg-white text-blue-700 shadow-sm font-black'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  tab === 'register'
                    ? 'bg-white text-blue-700 shadow-sm font-black'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Daftar Baru
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-white/90 hover:text-white underline font-bold cursor-pointer"
              >
                ← Kembali ke Masuk Akun
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'register' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lengkap / Panggilan
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Nur Azila Tarigan"
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Pilih Avatar Favorit:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all ${
                        selectedAvatar === av
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 scale-105 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Email input with OTP request button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Alamat Email Terdaftar
              </label>
              {tab === 'forgot' && (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  {isOtpSent ? 'Kirim Ulang OTP' : 'Kirim Kode Verifikasi'}
                </button>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsOtpSent(false);
                  setSimulatedOtpNotice(null);
                }}
                placeholder="namaanda@gmail.com"
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Simulated Email Notification Banner */}
          {simulatedOtpNotice && tab === 'forgot' && (
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-blue-900 dark:text-blue-300 text-xs font-bold flex items-start gap-2 animate-in fade-in">
              <Mail className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div className="flex-1">
                <p className="leading-snug">{simulatedOtpNotice}</p>
                <p className="text-[10px] font-normal text-slate-500 mt-0.5">
                  (Simulasi proteksi kepemilikan email: hanya pemilik akun yang dapat menerima kode ini)
                </p>
              </div>
            </div>
          )}

          {/* OTP Input Field */}
          {tab === 'forgot' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Kode Verifikasi OTP (6 Digit) *
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Contoh: 123456"
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black tracking-widest focus:border-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Mencegah orang lain mereset kata sandi Anda tanpa izin verifikasi email.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {tab === 'forgot' ? 'Kata Sandi Baru' : 'Kata Sandi (Password)'}
              </label>
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setTab('forgot');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Lupa Kata Sandi?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {tab === 'forgot' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Ulangi Kata Sandi Baru
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <span>
              {tab === 'login'
                ? 'Masuk ke Aplikasi'
                : tab === 'register'
                ? 'Buat Akun Sekarang'
                : 'Simpan Kata Sandi Baru'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-center text-slate-400 pt-1">
            {tab === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-blue-600 font-bold underline cursor-pointer"
                >
                  Daftar di sini
                </button>
              </>
            ) : tab === 'register' ? (
              <>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-blue-600 font-bold underline cursor-pointer"
                >
                  Masuk akun
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-blue-600 font-bold underline cursor-pointer"
              >
                Kembali ke Form Masuk
              </button>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};
