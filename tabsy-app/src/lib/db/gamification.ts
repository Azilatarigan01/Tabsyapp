import { UserGamification, AchievementBadge } from '@/types';
import { getLocalTodayDate } from './index';

const STORAGE_KEY = 'tabsy_gamification_v1';

export const INITIAL_GAMIFICATION: UserGamification = {
  level: 1,
  currentExp: 0,
  targetExp: 100,
  gems: 0,
  streakDays: 1, // Hari ke-1 (dimulai sejak akun dibuat)
  lastActiveDate: getLocalTodayDate(),
  unlockedBadgeIds: [],
};

export const BADGE_DEFINITIONS: Omit<AchievementBadge, 'currentProgress' | 'isUnlocked' | 'unlockedAt'>[] = [
  {
    id: 'badge-first-step',
    title: 'Langkah Pertama 🐣',
    description: 'Mencatat pengeluaran pertama di Tabsy.',
    icon: '🐣',
    category: 'record',
    maxProgress: 1,
    rewardGems: 25,
    rewardExp: 50,
  },
  {
    id: 'badge-fast-tracker',
    title: 'Pencatat Kilat ⚡',
    description: 'Catat total 5 pengeluaran harian.',
    icon: '⚡',
    category: 'record',
    maxProgress: 5,
    rewardGems: 50,
    rewardExp: 100,
  },
  {
    id: 'badge-split-master',
    title: 'Master Patungan 🍕',
    description: 'Bagi tagihan makan bersama teman dengan split bill presisi Rp0 selisih.',
    icon: '🍕',
    category: 'split',
    maxProgress: 1,
    rewardGems: 60,
    rewardExp: 120,
  },
  {
    id: 'badge-habit-hero',
    title: 'Pahlawan Rutinitas 🏃',
    description: 'Selesaikan 3 habit rutinitas sehat.',
    icon: '🏃',
    category: 'habit',
    maxProgress: 3,
    rewardGems: 40,
    rewardExp: 80,
  },
  {
    id: 'badge-agenda-pro',
    title: 'Master Jadwal 📅',
    description: 'Tuntaskan 3 agenda harian di timeline time-blocking.',
    icon: '📅',
    category: 'special',
    maxProgress: 3,
    rewardGems: 50,
    rewardExp: 100,
  },
  {
    id: 'badge-streak-fire',
    title: 'Konsistensi Api 🔥',
    description: 'Pertahankan streak aktivitas harian selama 5 hari berturut-turut.',
    icon: '🔥',
    category: 'streak',
    maxProgress: 5,
    rewardGems: 80,
    rewardExp: 150,
  },
  {
    id: 'badge-gem-collector',
    title: 'Kolektor Berlian 💎',
    description: 'Kumpulkan total 250 Gems Tabsy dari berbagai aktivitas.',
    icon: '💎',
    category: 'special',
    maxProgress: 250,
    rewardGems: 100,
    rewardExp: 200,
  },
];

export function getGamificationProfile(): UserGamification {
  if (typeof window === 'undefined') return INITIAL_GAMIFICATION;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveGamificationProfile(INITIAL_GAMIFICATION);
      return INITIAL_GAMIFICATION;
    }
    const parsed = JSON.parse(raw);
    return { ...INITIAL_GAMIFICATION, ...parsed };
  } catch (err) {
    console.error('Error loading gamification profile:', err);
    return INITIAL_GAMIFICATION;
  }
}

export function saveGamificationProfile(data: UserGamification): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving gamification profile:', err);
  }
}

export function expNeededForLevel(level: number): number {
  return 100 + (level - 1) * 75;
}

export interface AddRewardResult {
  leveledUp: boolean;
  newLevel: number;
  gainedExp: number;
  gainedGems: number;
  totalGems: number;
  currentExp: number;
  targetExp: number;
}

export function addExpAndGems(amountExp: number, amountGems: number): AddRewardResult {
  const current = getGamificationProfile();
  let exp = current.currentExp + amountExp;
  let level = current.level;
  let target = expNeededForLevel(level);
  let leveledUp = false;

  while (exp >= target) {
    exp -= target;
    level += 1;
    target = expNeededForLevel(level);
    leveledUp = true;
  }

  const updated: UserGamification = {
    ...current,
    level,
    currentExp: exp,
    targetExp: target,
    gems: current.gems + amountGems,
    lastActiveDate: getLocalTodayDate(),
  };

  saveGamificationProfile(updated);

  return {
    leveledUp,
    newLevel: level,
    gainedExp: amountExp,
    gainedGems: amountGems,
    totalGems: updated.gems,
    currentExp: exp,
    targetExp: target,
  };
}

export interface ActivityCounts {
  transactions: number;
  habitsCompleted: number;
  activitiesCompleted: number;
  splitBills: number;
}

export function getAchievements(counts: ActivityCounts): AchievementBadge[] {
  const profile = getGamificationProfile();
  const unlockedSet = new Set(profile.unlockedBadgeIds || []);

  return BADGE_DEFINITIONS.map((def) => {
    let progress = 0;
    if (def.id === 'badge-first-step') {
      progress = counts.transactions >= 1 ? 1 : 0;
    } else if (def.id === 'badge-fast-tracker') {
      progress = Math.min(def.maxProgress, counts.transactions);
    } else if (def.id === 'badge-split-master') {
      progress = counts.splitBills >= 1 ? 1 : 0;
    } else if (def.id === 'badge-habit-hero') {
      progress = Math.min(def.maxProgress, counts.habitsCompleted);
    } else if (def.id === 'badge-agenda-pro') {
      progress = Math.min(def.maxProgress, counts.activitiesCompleted);
    } else if (def.id === 'badge-streak-fire') {
      progress = Math.min(def.maxProgress, profile.streakDays);
    } else if (def.id === 'badge-gem-collector') {
      progress = Math.min(def.maxProgress, profile.gems);
    }

    const isUnlocked = unlockedSet.has(def.id) || progress >= def.maxProgress;

    return {
      ...def,
      currentProgress: progress,
      isUnlocked,
    };
  });
}

export const SHOP_ITEMS_CATALOG: Omit<import('@/types').ShopItem, 'unlocked'>[] = [
  {
    id: 'item-bear-king',
    title: 'Beruang Mahkota Emas 👑',
    description: 'Avatar eksklusif raja disiplin. Tunjukkan status konsistensi tinggimu!',
    icon: '👑',
    costGems: 100,
    category: 'avatar',
  },
  {
    id: 'item-astro-pro',
    title: 'Astronot Karir Masa Depan 🚀',
    description: 'Avatar spesial penjelajah karir dan pencari masa depan gemilang.',
    icon: '🚀',
    costGems: 120,
    category: 'avatar',
  },
  {
    id: 'item-wizard-time',
    title: 'Penyihir Fokus & Waktu 🧙‍♂️',
    description: 'Avatar bagi master time-blocking yang tak terkalahkan.',
    icon: '🧙‍♂️',
    costGems: 150,
    category: 'avatar',
  },
  {
    id: 'item-lucky-cat',
    title: 'Kucing Rezeki Cerdas 🐱',
    description: 'Avatar pemikat rezeki dan kelancaran finansial harian.',
    icon: '🐱',
    costGems: 80,
    category: 'avatar',
  },
  {
    id: 'item-streak-shield',
    title: 'Perisai Api Streak 🛡️',
    description: 'Melindungi api streak agar tidak hangus walau kamu sakit atau lupa 1 hari.',
    icon: '🛡️',
    costGems: 50,
    category: 'perk',
  },
  {
    id: 'item-theme-sakura',
    title: 'Nuansa Pastel Sakura 🌸',
    description: 'Sentuhan visual kartu pastel lembut menenangkan mata saat mencatat.',
    icon: '🌸',
    costGems: 100,
    category: 'theme',
  },
  {
    id: 'item-theme-cyber',
    title: 'Neon Cyberpunk 🌌',
    description: 'Palet futuristik gelap dengan aksen biru dan ungu elektrik.',
    icon: '🌌',
    costGems: 120,
    category: 'theme',
  },
];

export function getShopItems(): import('@/types').ShopItem[] {
  const profile = getGamificationProfile();
  const unlocked = new Set(profile.unlockedShopItemIds || []);

  return SHOP_ITEMS_CATALOG.map((item) => ({
    ...item,
    unlocked: unlocked.has(item.id),
  }));
}

export function buyShopItem(itemId: string): { success: boolean; error?: string; remainingGems?: number } {
  const profile = getGamificationProfile();
  const target = SHOP_ITEMS_CATALOG.find((i) => i.id === itemId);

  if (!target) {
    return { success: false, error: 'Item toko tidak ditemukan.' };
  }

  const unlocked = new Set(profile.unlockedShopItemIds || []);
  if (unlocked.has(itemId)) {
    return { success: false, error: 'Item ini sudah Anda miliki.' };
  }

  if (profile.gems < target.costGems) {
    return {
      success: false,
      error: `Gems Anda tidak cukup! Butuh ${target.costGems} 💎, saldo Anda saat ini ${profile.gems} 💎. Selesaikan habit untuk mengumpulkan Gems!`,
    };
  }

  unlocked.add(itemId);
  const newGems = profile.gems - target.costGems;
  const newShields = target.id === 'item-streak-shield' ? (profile.streakShields || 0) + 1 : profile.streakShields;

  const updated: UserGamification = {
    ...profile,
    gems: newGems,
    unlockedShopItemIds: Array.from(unlocked),
    streakShields: newShields,
  };

  saveGamificationProfile(updated);
  return { success: true, remainingGems: newGems };
}
