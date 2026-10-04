import { UserProfile } from '@/types';

const PROFILE_KEY = 'tabsy_user_profile';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Zila',
  avatar: '👩‍💼',
  monthlyBudget: 3500000,
  email: 'zila@tabsy.app',
  isSetup: true,
};

export function getStoredUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return DEFAULT_PROFILE;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveStoredUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
