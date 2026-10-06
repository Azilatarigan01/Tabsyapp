'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Sparkles,
  CheckCircle2,
  Lock,
  X,
  Gift,
  Award,
  Star,
  ChevronRight,
  ShoppingBag,
  Shield,
  Palette,
  Check,
  HelpCircle,
} from 'lucide-react';
import { UserGamification, AchievementBadge, UserProfile, ShopItem } from '@/types';
import {
  getGamificationProfile,
  getAchievements,
  addExpAndGems,
  getShopItems,
  buyShopItem,
} from '@/lib/db/gamification';
import { playCelebrationChime } from '@/lib/domain/audioChime';
import { saveStoredUserProfile } from '@/lib/db/userProfile';

interface GamificationModalProps {
  userProfile: UserProfile;
  counts: {
    transactions: number;
    habitsCompleted: number;
    activitiesCompleted: number;
    splitBills: number;
  };
  onClose: () => void;
  onRewardClaimed?: (gems: number) => void;
}

export const GamificationModal: React.FC<GamificationModalProps> = ({
  userProfile,
  counts,
  onClose,
  onRewardClaimed,
}) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'shop' | 'panduan'>('badges');
  const [profile, setProfile] = useState<UserGamification>(getGamificationProfile());
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [claimedDailyGift, setClaimedDailyGift] = useState<boolean>(false);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>(getShopItems());

  const achievements = getAchievements(counts);
  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const expPercentage = Math.min(100, Math.round((profile.currentExp / profile.targetExp) * 100));

  const filteredBadges = achievements.filter((badge) => {
    if (filter === 'unlocked') return badge.isUnlocked;
    if (filter === 'locked') return !badge.isUnlocked;
    return true;
  });

  const handleClaimDailyChest = () => {
    if (claimedDailyGift) return;
    const res = addExpAndGems(50, 30);
    setProfile(getGamificationProfile());
    setClaimedDailyGift(true);
    playCelebrationChime();
    setRewardToast('🎉 Selamat! Anda mendapat +50 EXP dan +30 💎 Gems Harian!');
    if (onRewardClaimed) onRewardClaimed(res.totalGems);
    setTimeout(() => setRewardToast(null), 4000);
  };

  const handleBuyItem = (item: ShopItem) => {
    const res = buyShopItem(item.id);
    if (res.success) {
      playCelebrationChime();
      const updatedProfile = getGamificationProfile();
      setProfile(updatedProfile);
      setShopItems(getShopItems());
      setRewardToast(`✨ Berhasil menukarkan ${item.costGems} 💎 untuk ${item.title}!`);

      // If it's an avatar, ask user if they want to apply it right away
      if (item.category === 'avatar') {
        saveStoredUserProfile({
          ...userProfile,
          avatar: item.icon,
        });
      }

      if (onRewardClaimed && res.remainingGems !== undefined) {
        onRewardClaimed(res.remainingGems);
      }
      setTimeout(() => setRewardToast(null), 4000);
    } else {
      alert(res.error || 'Gagal menukarkan Gems.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#F4F7FD] dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* ============================================================ */}
        {/* HEADER: Cute Mascot & Level Ring                             */}
        {/* ============================================================ */}
        <div className="relative bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 p-6 sm:p-7 text-white shrink-0 overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 relative z-10">
            {/* Mascot Avatar with Crown */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white p-1 shadow-lg shadow-black/10 overflow-hidden flex items-center justify-center">
                <img
                  src="/tabsy_mascot_hero.jpg"
                  alt="Tabsy Mascot"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
              <div className="absolute -top-2 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] shadow-sm flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-950" />
                <span>Lv.{profile.level}</span>
              </div>
            </div>

            {/* User Level Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-100">
                Pusat Gamifikasi & Hadiah Tabsy
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                {userProfile.name} • Level {profile.level} 👑
              </h2>
              
              {/* EXP Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] text-sky-100 font-bold">
                  <span>Progres Level</span>
                  <span>{profile.currentExp} / {profile.targetExp} EXP ({expPercentage}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden p-0.5">
                  <div
                    className="bg-amber-300 h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${expPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill Row */}
          <div className="grid grid-cols-3 gap-2 pt-4 relative z-10">
            <div className="px-3 py-2 rounded-2xl bg-white/15 backdrop-blur-md flex items-center gap-2">
              <span className="text-lg">💎</span>
              <div>
                <p className="text-[10px] text-sky-100 leading-none">Tabsy Gems</p>
                <p className="text-xs font-black text-white">{profile.gems}</p>
              </div>
            </div>

            <div className="px-3 py-2 rounded-2xl bg-white/15 backdrop-blur-md flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-[10px] text-sky-100 leading-none">Streak Harian</p>
                <p className="text-xs font-black text-white">{profile.streakDays} Hari</p>
              </div>
            </div>

            <div className="px-3 py-2 rounded-2xl bg-white/15 backdrop-blur-md flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div>
                <p className="text-[10px] text-sky-100 leading-none">Perisai Streak</p>
                <p className="text-xs font-black text-white">{profile.streakShields || 0} Aktif</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SUBHEADER TABS: PIALA vs TOKO HADIAH GEMS                    */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('badges')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'badges'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Piala & Lencana ({unlockedCount}/{totalCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('shop')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'shop'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
              <span>Toko Hadiah ({profile.gems} 💎)</span>
            </button>

            <button
              onClick={() => setActiveTab('panduan')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'panduan'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>Panduan & FAQ</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BODY: TAB 1 (PIALA) & TAB 2 (TOKO HADIAH GEMS)               */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Toast Alert */}
          {rewardToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{rewardToast}</span>
            </div>
          )}

          {/* Daily Mystery Chest (Kado Harian) */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-2xl shadow-xs shrink-0">
                🎁
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  Kado Maskot Tabsy Hari Ini
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {claimedDailyGift ? 'Sudah diklaim hari ini! Datang lagi besok.' : 'Klaim gratis +50 EXP & +30 💎 sekarang!'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClaimDailyChest}
              disabled={claimedDailyGift}
              className={`px-4 py-2 rounded-2xl font-black text-xs transition-all shrink-0 cursor-pointer ${
                claimedDailyGift
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-[#1E75FF] hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 active:scale-95'
              }`}
            >
              {claimedDailyGift ? 'Terklaim ✓' : 'Buka Kado 🎁'}
            </button>
          </div>

          {/* ========================================================== */}
          {/* TAB 1: PIALA & LENCANA                                      */}
          {/* ========================================================== */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              {/* Badges Section Filter Pills */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Daftar Piala & Lencana</span>
                </h3>

                <div className="flex items-center gap-1.5">
                  {(['all', 'unlocked', 'locked'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filter === f
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {f === 'all' && 'Semua'}
                      {f === 'unlocked' && `Terbuka (${unlockedCount})`}
                      {f === 'locked' && `Terkunci (${totalCount - unlockedCount})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredBadges.map((badge) => {
                  const pct = Math.min(100, Math.round((badge.currentProgress / badge.maxProgress) * 100));

                  return (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-3xl border transition-all ${
                        badge.isUnlocked
                          ? 'bg-white dark:bg-slate-800 border-amber-200/80 dark:border-amber-900/40 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                            badge.isUnlocked
                              ? 'bg-amber-100 dark:bg-amber-950/60 shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 grayscale'
                          }`}
                        >
                          {badge.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {badge.title}
                            </h4>
                            {badge.isUnlocked ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {badge.description}
                          </p>

                          {/* Progress bar inside card */}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span>Progres</span>
                              <span>{badge.currentProgress} / {badge.maxProgress}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  badge.isUnlocked ? 'bg-amber-400' : 'bg-blue-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Rewards Footer */}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] font-black">
                            <span className="text-amber-600 dark:text-amber-400">+{badge.rewardExp} EXP</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-blue-600 dark:text-sky-400">+{badge.rewardGems} 💎</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: TOKO HADIAH & PENUKARAN GEMS                        */}
          {/* ========================================================== */}
          {activeTab === 'shop' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    <span>Toko Penukaran Gems Tabsy 💎</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gunakan Gems yang kamu kumpulkan dari habit harian untuk membuka avatar VIP & perisai streak!
                  </p>
                </div>

                <div className="px-3 py-1.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 font-black text-xs border border-blue-200">
                  Saldo: {profile.gems} 💎
                </div>
              </div>

              {/* Shop Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {shopItems.map((item) => {
                  const canAfford = profile.gems >= item.costGems;
                  const isCurrentAvatar = userProfile.avatar === item.icon;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-sky-100 to-blue-50 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-3xl shadow-xs shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {item.category === 'avatar' && 'Avatar VIP'}
                              {item.category === 'perk' && 'Perk Pelindung'}
                              {item.category === 'theme' && 'Tema Warna'}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Buy / Use Action Button */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs font-black text-blue-600 dark:text-sky-400">
                          <span>{item.costGems}</span>
                          <span>💎</span>
                        </div>

                        {item.unlocked ? (
                          item.category === 'avatar' ? (
                            <button
                              type="button"
                              onClick={() => {
                                saveStoredUserProfile({ ...userProfile, avatar: item.icon });
                                setRewardToast(`Avatar profil diganti menjadi ${item.icon}!`);
                                setTimeout(() => setRewardToast(null), 3000);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                isCurrentAvatar
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isCurrentAvatar ? 'Dipakai ✓' : 'Pakai Avatar'}
                            </button>
                          ) : (
                            <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Dimiliki</span>
                            </span>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuyItem(item)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                              canAfford
                                ? 'bg-[#1E75FF] hover:bg-blue-700 text-white shadow-blue-500/20'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}
                          >
                            Tukar {item.costGems} 💎
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: PANDUAN LENGKAP LEVEL, STREAK & FITUR               */}
          {/* ============================================================ */}
          {activeTab === 'panduan' && (
            <div className="space-y-4 animate-in fade-in duration-200 text-xs">
              {/* Question 1: Level & EXP */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400 font-black">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>1. Mengapa Ada Level & EXP?</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Level mencerminkan tingkat konsistensi dan produktivitas harianmu. Setiap kamu menyelesaikan aktivitas di Tabsy, kamu akan mendapatkan EXP (Experience Points):
                </p>
                <ul className="space-y-1 text-slate-500 dark:text-slate-400 pl-2">
                  <li>• <strong>Menyelesaikan Habit Rutinitas:</strong> +25 EXP</li>
                  <li>• <strong>Menuntaskan Agenda Harian:</strong> +30 EXP</li>
                  <li>• <strong>Mencatat Pengeluaran Transaksi:</strong> +20 EXP</li>
                  <li>• <strong>Menghitung Patungan Split Bill:</strong> +40 EXP</li>
                </ul>
                <p className="text-[11px] text-slate-400 pt-1">
                  Semakin tinggi levelmu, semakin banyak lencana kehormatan dan avatar khusus yang terbuka.
                </p>
              </div>

              {/* Question 2: Streak Harian */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>2. Apa Arti Streak Harian (🔥)?</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Streak adalah pengukur disiplin tanpa putus. Saat pertama kali akun dibuat, kamu berada di <strong>Hari ke-1</strong>. Jika besok kamu kembali aktif mencatat atau menyelesaikan tugas, streak akan naik menjadi <strong>Hari ke-2</strong>.
                </p>
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-[11px]">
                  ⚠️ <strong>Aturan Reset:</strong> Jika kamu tidak membuka dan mencatat aktivitas selama lebih dari 1 hari kalender, streak akan kembali ke Hari ke-1 (kecuali kamu mengaktifkan Perisai Streak).
                </div>
              </div>

              {/* Question 3: Gems & Toko Hadiah */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                  <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  <span>3. Untuk Apa Gems (💎) Dikumpulkan?</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Gems adalah permata virtual hasil penghargaan konsistensimu. Gems dapat dikumpulkan dari klaim Kado Misteri harian, menuntaskan target lencana, dan pencapaian streak.
                </p>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gems dapat kamu gunakan di tab <strong>Toko Hadiah</strong> untuk menukarkan Avatar Eksklusif, Perisai Pelindung Streak, dan kustomisasi profil.
                </p>
              </div>

              {/* Question 4: Privasi, Verifikasi Email, & Lupa Kata Sandi */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span>4. Keamanan Akun & Pemulihan Kata Sandi</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Kenapa tidak butuh admin / verifikasi email server?</strong><br />
                  Tabsy mengusung arsitektur <em>Local-First & Client-Side Privacy</em>. Seluruh catatan keuangan dan jadwalmu tersimpan privat di peramban/HP lokal tanpa transmisi ke server cloud pihak ketiga. Tidak ada admin yang bisa melihat data keuanganmu.
                </p>
                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/60 text-purple-900 dark:text-purple-200 text-[11px]">
                  🔑 <strong>Jika Lupa Password:</strong> Kamu dapat menggunakan tombol <strong>"Lupa Kata Sandi?"</strong> di halaman Masuk. Masukkan email terdaftarmu di perangkat ini untuk langsung mereset kata sandi baru.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
