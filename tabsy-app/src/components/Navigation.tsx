'use client';

import React from 'react';
import {
  Zap,
  History,
  Users,
  CalendarCheck,
  Settings,
  Bell,
  ShieldCheck,
  Sparkles,
  Flame,
  Search,
  Home,
  CheckCircle,
  Trophy,
  LogOut,
} from 'lucide-react';
import { UserProfile, UserGamification } from '@/types';
import { getGamificationProfile } from '@/lib/db/gamification';

export type NavTab = 'catat' | 'jadwal' | 'split' | 'riwayat' | 'pengaturan';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  userProfile: UserProfile;
  totalTransactions: number;
  gamification?: UserGamification;
  onOpenIntro?: () => void;
  onOpenGamification?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  userProfile,
  totalTransactions,
  gamification,
  onOpenIntro,
  onOpenGamification,
  onOpenAuth,
  onLogout,
}) => {
  const currentGamification = gamification || getGamificationProfile();
  const tabs = [
    { id: 'catat' as NavTab, label: 'Dashboard & Transaksi', icon: Zap, shortLabel: 'Dashboard' },
    { id: 'jadwal' as NavTab, label: 'Agenda & Kebiasaan', icon: CalendarCheck, shortLabel: 'Agenda' },
    { id: 'split' as NavTab, label: 'Bagi Tagihan (Split Bill)', icon: Users, shortLabel: 'Split Bill' },
    { id: 'riwayat' as NavTab, label: 'Riwayat Transaksi', icon: History, shortLabel: 'Riwayat', badge: totalTransactions > 0 ? totalTransactions : undefined },
    { id: 'pengaturan' as NavTab, label: 'Pengaturan', icon: Settings, shortLabel: 'Pengaturan' },
  ];

  return (
    <>
      {/* ============================================================== */}
      {/* 1. DESKTOP / IPAD LEFT SIDEBAR                                 */}
      {/* ============================================================== */}
      <aside className="hidden md:flex flex-col justify-between w-64 xl:w-72 fixed left-0 top-0 bottom-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-5 z-40 select-none shadow-xs">
        
        {/* Top Part: Brand Logo + Navigation Links */}
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center text-white shrink-0">
              <span className="text-xl select-none">🐻</span>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white block leading-none">
                Tabsy<span className="text-blue-600">.</span>
              </span>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase mt-1">
                Productivity & Finance
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 pt-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="tracking-tight">{tab.label}</span>
                  </div>

                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-sky-300 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Part: Status & User Profile Card */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Subtle System Status Badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Penyimpanan Lokal & Privat
            </p>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <button
              onClick={() => onTabChange('pengaturan')}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-lg shadow-xs shrink-0">
                {userProfile?.avatar || '👩‍💼'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {userProfile?.name || 'Pengguna'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-0.5">
                  <span className="text-blue-600 font-bold">Lv.{currentGamification.level}</span>
                  <span>•</span>
                  <span>{currentGamification.gems} 💎</span>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onTabChange('pengaturan')}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Pengaturan Akun"
              >
                <Settings className="w-4 h-4" />
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-8 h-8 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                  title="Keluar dari Akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. TOP HEADER                                                  */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 py-3 px-4 sm:px-8 shadow-xs transition-all md:pl-64 xl:pl-72">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Mobile Only: Brand & Greeting */}
          <div className="flex md:hidden items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center text-white shrink-0">
              <span className="text-lg select-none">🐻</span>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Halo, {userProfile?.name ? userProfile.name.split(' ')[0] : 'Pengguna'}! 👋
              </h1>
            </div>
          </div>

          {/* Desktop/iPad: Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                onClick={() => onTabChange('riwayat')}
                placeholder="Cari aktivitas, jadwal harian, atau transaksi..."
                className="w-full h-10 pl-10 pr-4 text-xs font-semibold rounded-xl bg-slate-100/80 hover:bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none cursor-pointer transition-all"
              />
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Streak Counter Button */}
            <button
              onClick={onOpenGamification}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200/70 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Konsistensi Disiplin Harian (Klik untuk Panduan)"
            >
              <span className="text-amber-500">🔥</span>
              <span>{currentGamification.streakDays} Hari</span>
            </button>

            {/* Gamification Trophy & Level Button */}
            <button
              onClick={onOpenGamification}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-sky-300 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Pencapaian & Hadiah"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Lv.{currentGamification.level}</span>
              <span className="text-blue-300">•</span>
              <span>{currentGamification.gems} 💎</span>
            </button>

            {/* User Profile Pill */}
            <button
              onClick={() => onTabChange('pengaturan')}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/70 dark:border-slate-700 cursor-pointer"
              title="Pengaturan Profil"
            >
              <span className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-sm shadow-2xs">
                {userProfile?.avatar || '👤'}
              </span>
              <span className="hidden sm:inline">
                {userProfile?.name ? userProfile.name.split(' ')[0] : 'Akun'}
              </span>
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 3. MOBILE FLOATING PILL NAVBAR (< md Only)                     */}
      {/* ============================================================== */}
      <div
        id="tabsy-bottom-navbar"
        className="md:hidden fixed bottom-3 sm:bottom-4 inset-x-0 z-[9999] flex items-center justify-center px-2 pointer-events-none select-none"
      >
        <div className="pointer-events-auto flex items-center gap-2 w-full max-w-[440px]">
          {/* Main Tabs Capsule */}
          <nav className="flex-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 rounded-full shadow-[0_12px_36px_rgba(15,23,42,0.18)] py-1.5 px-1.5 sm:px-2 flex items-center justify-around">
            {tabs.slice(0, 4).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex flex-col items-center justify-center py-1.5 px-2 sm:px-3 rounded-full text-[10px] sm:text-[11px] font-extrabold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/30 scale-105'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                    {tab.badge !== undefined && tab.badge > 0 && !isActive && (
                      <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[8px] font-black bg-rose-500 text-white rounded-full">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Dedicated Circular Profile Avatar Button */}
          <button
            onClick={() => onTabChange('pengaturan')}
            title="Akun Saya"
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl shadow-[0_10px_30px_rgba(15,23,42,0.16)] transition-all duration-200 shrink-0 active:scale-95 ${
              activeTab === 'pengaturan'
                ? 'bg-blue-600 border-white text-white shadow-blue-600/40 ring-2 ring-blue-400 scale-105'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 hover:border-blue-400'
            }`}
          >
            {userProfile?.avatar || '👩‍💼'}
          </button>
        </div>
      </div>
    </>
  );
};
