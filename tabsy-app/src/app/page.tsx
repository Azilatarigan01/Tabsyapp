'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigation, NavTab } from '@/components/Navigation';
import { RecordScreen } from '@/components/RecordScreen';
import { HistoryScreen } from '@/components/HistoryScreen';
import { SplitBillScreen } from '@/components/SplitBillScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { DailyScheduleScreen } from '@/components/DailyScheduleScreen';
import { OnboardingModal } from '@/components/OnboardingModal';
import { AppLaunchScreen } from '@/components/AppLaunchScreen';
import { GamificationModal } from '@/components/GamificationModal';
import { AuthModal } from '@/components/AuthModal';
import { getAllTransactions, seedSampleData, getLocalTodayDate } from '@/lib/db';
import { getStoredUserProfile, saveStoredUserProfile, DEFAULT_PROFILE } from '@/lib/db/userProfile';
import { getGamificationProfile, addExpAndGems, INITIAL_GAMIFICATION } from '@/lib/db/gamification';
import { getCurrentSession, logoutUser } from '@/lib/db/auth';
import { Transaction, UserProfile, UserGamification } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('catat');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [gamification, setGamification] = useState<UserGamification>(INITIAL_GAMIFICATION);
  const [showGamification, setShowGamification] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [hasLaunched, setHasLaunched] = useState<boolean>(false);
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

    // Load profile & ensure landing page opens first
    const profile = getStoredUserProfile();
    setUserProfile(profile);
    setGamification(getGamificationProfile());
    // User requested: "halam pertama yang dibuak adalah landing page ini aatau welvcome page"
    setHasLaunched(false);

    const initData = async () => {
      try {
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

  const handleLogout = useCallback(() => {
    logoutUser();
    setUserProfile(DEFAULT_PROFILE);
    setTransactions([]);
    setHasLaunched(false);
  }, []);

  const handleTransactionSaved = () => {
    refreshTransactions();
    addExpAndGems(25, 10);
    setGamification(getGamificationProfile());
    setActiveTab('riwayat');
  };

  const activityCounts = useMemo(() => ({
    transactions: transactions.length,
    habitsCompleted: 3,
    activitiesCompleted: 2,
    splitBills: 1,
  }), [transactions.length]);

  // 1. Initial Launch / Onboarding Experience (Screen 1 style: Responsive Mobile, iPad, Desktop)
  if (isLoaded && !hasLaunched) {
    return (
      <AppLaunchScreen
        initialProfile={userProfile}
        onGetStarted={async (profile) => {
          handleUpdateProfile(profile);
          await refreshTransactions();
          setHasLaunched(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F6FD] dark:bg-slate-950 pb-36 md:pb-12 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Header & Left Sidebar (Desktop/iPad) + Floating Bottom Nav (Mobile) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userProfile={userProfile}
        totalTransactions={transactions.length}
        gamification={gamification}
        onOpenIntro={() => setHasLaunched(false)}
        onOpenGamification={() => {
          setGamification(getGamificationProfile());
          setShowGamification(true);
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Tab Screen Content (Offset on desktop/iPad for Left Sidebar) */}
      <main className="flex-1 w-full md:pl-64 xl:pl-72 animate-in fade-in duration-150">
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
            {activeTab === 'jadwal' && (
              <DailyScheduleScreen
                userProfile={userProfile}
                onNavigateTab={setActiveTab}
                onTransactionAdded={refreshTransactions}
              />
            )}
            {activeTab === 'riwayat' && (
              <HistoryScreen
                transactions={transactions}
                onTransactionsChanged={refreshTransactions}
                onGoToRecord={() => setActiveTab('catat')}
              />
            )}
            {activeTab === 'split' && (
              <SplitBillScreen
                currentUserName={userProfile.name}
                onNavigateTab={setActiveTab}
                onTransactionAdded={refreshTransactions}
              />
            )}
            {activeTab === 'pengaturan' && (
              <SettingsScreen
                transactions={transactions}
                onTransactionsChanged={refreshTransactions}
                userProfile={userProfile}
                onUpdateProfile={handleUpdateProfile}
                onOpenIntro={() => setHasLaunched(false)}
                onOpenAuth={() => setShowAuthModal(true)}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* Welcome / Onboarding Screen with Playful Animations */}
      {showOnboarding && (
        <OnboardingModal
          initialProfile={userProfile}
          canDismiss={userProfile.isSetup}
          onClose={() => setShowOnboarding(false)}
          onComplete={(profile) => {
            handleUpdateProfile(profile);
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Gamification & Badges Lingora-Style Modal */}
      {showGamification && (
        <GamificationModal
          userProfile={userProfile}
          counts={activityCounts}
          onClose={() => setShowGamification(false)}
          onRewardClaimed={() => setGamification(getGamificationProfile())}
        />
      )}

      {/* Account Login / Registration Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={async (user) => {
            const updated = getStoredUserProfile();
            setUserProfile(updated);
            await refreshTransactions();
            setShowAuthModal(false);
          }}
        />
      )}
    </div>
  );
}
