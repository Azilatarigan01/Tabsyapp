'use client';

import React, { useState } from 'react';
import { UserProfile, DEFAULT_AVATARS } from '@/types';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [name, setName] = useState('Zila');
  const [avatar, setAvatar] = useState('👩‍💼');
  const [budget, setBudget] = useState<number | ''>(3500000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onComplete({
      name: name.trim(),
      avatar,
      monthlyBudget: typeof budget === 'number' && budget > 0 ? budget : 3000000,
      isSetup: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30 text-2xl font-black">
            ⚡
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Selamat Datang di Tabsy
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan pengeluaran kilat & kalkulator patungan makan tanpa repot.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector */}
          <div className="space-y-1.5 text-center">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pilih Avatar Kamu:
            </label>
            <div className="flex justify-center gap-2 pt-1">
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                    avatar === av
                      ? 'bg-sky-500 text-white scale-110 shadow-md shadow-sky-500/40 ring-2 ring-sky-300'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Panggilan Kamu *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Zila"
              maxLength={30}
              required
              className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Monthly Budget */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Target Anggaran Bulanan (Rp)</span>
              <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="3500000"
                min="0"
                className="w-full h-11 pl-10 pr-3 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] text-sky-800 dark:text-sky-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>Semua data akun dan transaksi disimpan 100% aman di HP Anda sendiri.</span>
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all"
          >
            <span>Mulai Gunakan Tabsy</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
