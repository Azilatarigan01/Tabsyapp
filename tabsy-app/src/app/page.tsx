'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigation, NavTab } from '@/components/Navigation';
import { RecordScreen } from '@/components/RecordScreen';
import { HistoryScreen } from '@/components/HistoryScreen';
import { SplitBillScreen } from '@/components/SplitBillScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { OnboardingModal } from '@/components/OnboardingModal';
import { getAllTransactions, seedSampleData, getLocalTodayDate } from '@/lib/db';
import { getStoredUserProfile, saveStoredUserProfile, DEFAULT_PROFILE } from '@/lib/db/userProfile';
import { Transaction, UserProfile } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('catat');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
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

  // Compute monthTotal and todayTotal for the Tabsy Card
  const todayStr = getLocalTodayDate();
  const currentMonthPrefix = todayStr.substring(0, 7);

  const todayTotal = useMemo(() => {
    return transactions
      .filter((t) => t.date === todayStr)
      .reduce((sum, cur) => sum + cur.amountRupiah, 0);
  }, [transactions, todayStr]);

  const monthTotal = useMemo(() => {
    return transactions
      .filter((t) => t.date.startsWith(currentMonthPrefix))
      .reduce((sum, cur) => sum + cur.amountRupiah, 0);
  }, [transactions, currentMonthPrefix]);

  // Initial load
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load profile
    const profile = getStoredUserProfile();
    setUserProfile(profile);

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

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    saveStoredUserProfile(newProfile);
  };

  const handleTransactionSaved = () => {
    refreshTransactions();
    setActiveTab('riwayat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Header & Floating Bottom Nav */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userProfile={userProfile}
        totalTransactions={transactions.length}
      />

      {/* Main Tab Screen Content */}
      <main className="flex-1 w-full animate-in fade-in duration-150">
        {!isLoaded ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="w-9 h-9 rounded-full border-3 border-sky-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              Membuka Tabsy...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'catat' && (
              <RecordScreen
                onTransactionSaved={handleTransactionSaved}
                userProfile={userProfile}
                monthTotal={monthTotal}
                todayTotal={todayTotal}
                onNavigateTab={setActiveTab}
              />
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
                userProfile={userProfile}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </>
        )}
      </main>

      {/* Onboarding Modal if needed */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={(profile) => {
            handleUpdateProfile(profile);
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
