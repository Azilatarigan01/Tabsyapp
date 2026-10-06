'use client';

import React, { useState } from 'react';
import { UserProfile, DEFAULT_AVATARS } from '@/types';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  UtensilsCrossed,
  Receipt,
  CheckCircle2,
  Lock,
  Wallet,
  X,
} from 'lucide-react';
import { formatRupiah } from '@/lib/domain/calculator';

interface OnboardingModalProps {
  initialProfile?: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialProfile,
  onComplete,
  onClose,
  canDismiss = false,
}) => {
  const [name, setName] = useState(initialProfile?.name || 'Zila');
  const [avatar, setAvatar] = useState(initialProfile?.avatar || '👩‍💼');
  const [budget, setBudget] = useState<number | ''>(
    initialProfile?.monthlyBudget || 3500000
  );
  const [selectedFeatureTab, setSelectedFeatureTab] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onComplete({
      name: name.trim(),
      avatar,
      monthlyBudget: typeof budget === 'number' && budget > 0 ? budget : 3500000,
      isSetup: true,
    });
  };

  const featurePills = [
    {
      icon: Zap,
      title: 'Catat Kilat 3 Detik',
      desc: 'Masukkan pengeluaran harian instan, sisa limit budget harian langsung dihitung otomatis.',
      tag: 'Hemat Waktu',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300/40',
    },
    {
      icon: UtensilsCrossed,
      title: 'Split Bill Adil & Presisi',
      desc: 'Bebas bagi rata atau beda menu per orang. Pajak, diskon, dan biaya servis terbagi proporsional Rp0 selisih.',
      tag: 'Tanpa Selisih',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-sky-400 border-blue-300/40',
    },
    {
      icon: Receipt,
      title: 'Porsi Masuk Pengeluaran',
      desc: 'Selesai patungan bersama teman? Satu klik, nominal porsi makan Anda langsung tercatat rapi ke buku pengeluaran!',
      tag: 'Otomatis',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Dynamic Animated Gradient Blobs (Pinterest Soft Glow Effect) */}
      <div className="fixed top-12 -left-20 w-80 h-80 bg-sky-400/25 dark:bg-sky-500/20 rounded-full blur-3xl animate-blob pointer-events-none" />
      <div className="fixed top-1/2 -right-20 w-80 h-80 bg-blue-500/25 dark:bg-indigo-500/20 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
      <div className="fixed -bottom-20 left-1/3 w-80 h-80 bg-amber-400/20 dark:bg-amber-500/15 rounded-full blur-3xl animate-blob animation-delay-4000 pointer-events-none" />

      {/* Main Card Container */}
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[36px] border border-blue-100/90 dark:border-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.22)] p-5 sm:p-7 space-y-6 my-auto overflow-hidden">
        
        {/* Optional Close Button if Dismissable */}
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 flex items-center justify-center transition-all z-20"
            title="Tutup & Kembali"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Floating Playful Badges (Pinterest 'Goyang-Goyang' Micro-Animations) */}
        <div className="relative pt-1 sm:pt-2">
          {/* Floating Pill 1: Top Left */}
          <div className="absolute -top-2 left-0 sm:-left-3 z-10 animate-float flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black text-[11px] shadow-lg shadow-amber-500/25 border border-amber-200 select-none">
            <span className="text-xs">🍕</span>
            <span>Beda Menu Pas!</span>
          </div>

          {/* Floating Pill 2: Top Right */}
          <div className="absolute -top-1 right-8 sm:-right-2 z-10 animate-float-delayed flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-emerald-950 font-black text-[11px] shadow-lg shadow-emerald-500/25 border border-emerald-200 select-none">
            <span className="text-xs">⚡</span>
            <span>Rp0 Selisih</span>
          </div>

          {/* Center Mascot & Header */}
          <div className="text-center space-y-3 pt-6 sm:pt-4">
            <div className="relative inline-block">
              {/* Mascot Bubble */}
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30 text-4xl font-black animate-wiggle">
                ⚡
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shadow-md animate-pulse-soft border-2 border-white dark:border-slate-900">
                ✨
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-sky-400 text-[11px] font-black tracking-wider uppercase border border-blue-100 dark:border-slate-700">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Selamat Datang di Tabsy
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
                Patungan & Catat Kilat
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Solusi cerdas bagi tagihan makan adil tanpa selisih, sekaligus kontrol pengeluaran harian 100% privat di browsermu.
            </p>
          </div>
        </div>

        {/* 3 Superpowers Interactive Highlights */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Keunggulan Tabsy</span>
            <span className="text-blue-600 dark:text-sky-400">Pilih untuk info</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {featurePills.map((f, idx) => {
              const Icon = f.icon;
              const isSelected = selectedFeatureTab === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedFeatureTab(idx)}
                  className={`p-2.5 rounded-2xl text-left transition-all duration-200 flex flex-col items-center justify-center text-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-slate-800/90 border-blue-400 dark:border-sky-400 shadow-sm scale-102'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100/70 text-slate-500'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black leading-tight text-slate-800 dark:text-slate-200">
                    {f.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Highlight Description Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-sky-50/50 to-indigo-50/70 dark:from-slate-800/60 dark:to-slate-800/40 border border-blue-100/80 dark:border-slate-700 text-xs leading-relaxed animate-in fade-in">
            <p className="font-extrabold text-blue-900 dark:text-sky-300 flex items-center gap-1.5 mb-0.5">
              <span>⚡</span> {featurePills[selectedFeatureTab].title}
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              {featurePills[selectedFeatureTab].desc}
            </p>
          </div>
        </div>

        {/* Personalized Form Setup */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Avatar Selector with Bouncy Spring Physics */}
          <div className="space-y-2 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Pilih Avatar Kamu:</span>
              <span className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold">
                Sentuh untuk ganti
              </span>
            </label>
            <div className="flex justify-between gap-1.5 pt-0.5 overflow-x-auto pb-1">
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl text-xl flex items-center justify-center shrink-0 spring-bounce transition-all ${
                    avatar === av
                      ? 'bg-gradient-to-tr from-blue-600 to-sky-400 text-white scale-110 shadow-lg shadow-blue-500/40 ring-2 ring-sky-300 dark:ring-sky-500'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Budget in Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Nama Panggilan *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Zila"
                maxLength={30}
                required
                className="w-full h-11 px-3.5 text-sm font-bold rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            {/* Target Budget */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Target Anggaran/Bulan
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) =>
                    setBudget(e.target.value ? parseInt(e.target.value, 10) : '')
                  }
                  placeholder="3500000"
                  min="0"
                  className="w-full h-11 pl-9 pr-3 text-sm font-bold rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Live Greeting Card */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-sky-50 dark:bg-slate-800/70 border border-sky-100 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Sapaan di tagihan:
            </span>
            <span className="font-black text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
              <span>{avatar}</span>
              <span>{name.trim() || 'Teman Tabsy'}</span>
            </span>
          </div>

          {/* 100% Privacy & No Registration Guarantee */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="leading-tight">
              <strong>Tanpa registrasi, email, & password!</strong> Seluruh catatan keuangan Anda tersimpan 100% privat dan offline di browser perangkat ini.
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            type="submit"
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:opacity-95 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 active:scale-95 spring-bounce cursor-pointer transition-all"
          >
            <span>Mulai Gunakan Tabsy Sekarang</span>
            <ArrowRight className="w-4 h-4 animate-bounce-soft" />
          </button>
        </form>
      </div>
    </div>
  );
};
