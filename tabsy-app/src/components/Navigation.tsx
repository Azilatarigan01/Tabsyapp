'use client';

import React from 'react';
import { Zap, History, Users, Settings, Bell, ShieldCheck } from 'lucide-react';
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
    { id: 'split' as NavTab, label: 'Split Bill', icon: Users },
    { id: 'riwayat' as NavTab, label: 'Aktivitas', icon: History, badge: totalTransactions > 0 ? totalTransactions : undefined },
  ];

  return (
    <>
      {/* Top Header with Soft Glass Effect */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-blue-700 via-blue-600 to-sky-500 text-white pt-2 pb-3 px-4 shadow-md transition-all">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* User Profile Sapaan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('pengaturan')}
              className="w-11 h-11 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner active:scale-95 transition-all"
            >
              {userProfile?.avatar || '👩‍💼'}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-sky-200">
                  Tabsy Account
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
            <div className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Aman</span>
            </div>

            <button
              onClick={() => onTabChange('pengaturan')}
              className="w-9 h-9 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/20"
              title="Pengaturan Akun"
            >
              <Bell className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Pill Bottom Navigation Bar (Guaranteed ALWAYS VISIBLE on all mobile sizes) */}
      <div
        id="tabsy-bottom-navbar"
        className="fixed bottom-3 sm:bottom-4 inset-x-0 z-[9999] flex items-center justify-center px-3 pointer-events-none select-none"
      >
        <div className="pointer-events-auto flex items-center gap-2 w-full max-w-[380px]">
          {/* Main Tabs Capsule */}
          <nav className="flex-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 rounded-full shadow-[0_12px_36px_rgba(15,23,42,0.18)] py-1.5 px-2 flex items-center justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[11px] font-extrabold transition-all duration-200 ${
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
                  <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Dedicated Circular Profile Avatar Button (Matching Reference Image) */}
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
