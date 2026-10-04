'use client';

import React from 'react';
import { Zap, History, Users, User, Bell, ShieldCheck } from 'lucide-react';
import { UserProfile } from '@/types';

export type NavTab = 'catat' | 'riwayat' | 'split' | 'pengaturan';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  userProfile: UserProfile;
  totalTransactions: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  userProfile,
  totalTransactions,
}) => {
  const tabs = [
    { id: 'catat' as NavTab, label: 'Catat', icon: Zap },
    { id: 'riwayat' as NavTab, label: 'Aktivitas', icon: History, badge: totalTransactions > 0 ? totalTransactions : undefined },
    { id: 'split' as NavTab, label: 'Split Bill', icon: Users },
    { id: 'pengaturan' as NavTab, label: 'Akun Saya', icon: User },
  ];

  return (
    <>
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-sky-600/95 via-blue-600/95 to-blue-700/90 backdrop-blur-xl text-white border-b border-white/10 transition-all">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* User Profile Greeting */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('pengaturan')}
              className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-xl shadow-inner hover:scale-105 transition-transform"
            >
              {userProfile?.avatar || '👩‍💼'}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-sky-200 tracking-wide uppercase">
                  Tabsy Personal
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-base font-black tracking-tight text-white leading-tight">
                Halo, {userProfile?.name || 'Zila'}! 👋
              </h1>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Akun Terlindungi</span>
              <span className="sm:hidden">Aman</span>
            </div>

            <button
              onClick={() => onTabChange('pengaturan')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
              title="Notifikasi & Akun"
            >
              <Bell className="w-4 h-4 text-sky-100" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Pill Bottom Navigation Bar (Matching Neo-banking Reference) */}
      <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-full shadow-2xl shadow-sky-950/15 px-3 py-2 flex items-center justify-around transition-all">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {tab.badge !== undefined && tab.badge > 0 && !isActive && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[8px] font-black bg-rose-500 text-white rounded-full">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                {isActive && <span>{tab.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
