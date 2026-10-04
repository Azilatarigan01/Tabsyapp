'use client';

import React from 'react';
import { Zap, History, Users, Settings, Database, Wifi, WifiOff } from 'lucide-react';

export type NavTab = 'catat' | 'riwayat' | 'split' | 'pengaturan';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isOnline: boolean;
  totalTransactions: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  isOnline,
  totalTransactions,
}) => {
  const tabs = [
    { id: 'catat' as NavTab, label: 'Catat', icon: Zap },
    { id: 'riwayat' as NavTab, label: 'Riwayat', icon: History, badge: totalTransactions > 0 ? totalTransactions : undefined },
    { id: 'split' as NavTab, label: 'Split Bill', icon: Users },
    { id: 'pengaturan' as NavTab, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black shadow-sm shadow-emerald-500/20">
              ⚡
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                CatatCepat
              </h1>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Pencatatan & Split Bill Kilat
              </span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
              <Database className="w-3 h-3 text-emerald-500" />
              <span className="hidden sm:inline">IndexedDB</span> Aktif
            </div>

            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
                isOnline
                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/50'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-slate-500" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="max-w-2xl mx-auto px-2 flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive ? 'scale-110' : ''
                    }`}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-3 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500 text-white rounded-full">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
