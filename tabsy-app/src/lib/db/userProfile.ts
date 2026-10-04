import { UserProfile } from '@/types';

const PROFILE_KEY = 'tabsy_user_profile';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Teman Tabsy',
  avatar: '👩‍💼',
  monthlyBudget: 3500000,
  email: 'user@tabsy.app',
  isSetup: false,
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
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      isSetup: true,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveStoredUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
