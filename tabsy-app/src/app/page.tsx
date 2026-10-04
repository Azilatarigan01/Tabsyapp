'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, NavTab } from '@/components/Navigation';
import { RecordScreen } from '@/components/RecordScreen';
import { HistoryScreen } from '@/components/HistoryScreen';
import { SplitBillScreen } from '@/components/SplitBillScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { getAllTransactions, seedSampleData } from '@/lib/db';
import { Transaction } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('catat');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load transactions from IndexedDB
  const refreshTransactions = useCallback(async () => {
    try {
      const data = await getAllTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions from IndexedDB:', err);
    }
  }, []);

  // Initial load and sample seeding
  useEffect(() => {
    // Online/offline detection
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check & auto-seed if empty
    const initData = async () => {
      try {
        await seedSampleData();
        await refreshTransactions();
      } catch (err) {
        console.error('Initial data initialization error:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    initData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshTransactions]);

  const handleTransactionSaved = () => {
    refreshTransactions();
    // Switch to history tab to immediately show the new transaction
    setActiveTab('riwayat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header & Mobile Bottom Nav */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOnline={isOnline}
        totalTransactions={transactions.length}
      />

      {/* Main Tab Screen Content */}
      <main className="flex-1 w-full animate-in fade-in duration-150">
        {!isLoaded ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              Menghubungkan ke IndexedDB lokal...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'catat' && (
              <RecordScreen onTransactionSaved={handleTransactionSaved} />
            )}
            {activeTab === 'riwayat' && (
              <HistoryScreen
                transactions={transactions}
                onTransactionsChanged={refreshTransactions}
                onGoToRecord={() => setActiveTab('catat')}
              />
            )}
            {activeTab === 'split' && <SplitBillScreen />}
            {activeTab === 'pengaturan' && (
              <SettingsScreen
                transactions={transactions}
                onTransactionsChanged={refreshTransactions}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
