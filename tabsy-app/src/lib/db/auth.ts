import { UserProfile } from '@/types';
import { getStoredUserProfile, saveStoredUserProfile, DEFAULT_PROFILE } from './userProfile';

const AUTH_SESSION_KEY = 'tabsy_auth_session_v1';
const USERS_DB_KEY = 'tabsy_registered_users_v1';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  gender?: 'pria' | 'wanita' | 'lainnya';
  persona?: 'pelajar' | 'mahasiswa' | 'freshgrad' | 'pekerja' | 'wirausaha' | 'custom';
  passwordHash: string; // Stored locally
  createdAt: string;
}

export function getRegisteredUsers(): AuthUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCurrentSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function registerUser(params: {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  birthDate?: string;
  gender?: 'pria' | 'wanita' | 'lainnya';
  persona?: 'pelajar' | 'mahasiswa' | 'freshgrad' | 'pekerja' | 'wirausaha' | 'custom';
  monthlyBudget?: number;
}): { success: boolean; user?: AuthUser; error?: string } {
  if (!params.email || !params.password || !params.name) {
    return { success: false, error: 'Nama, Email, dan Kata Sandi wajib diisi.' };
  }

  const users = getRegisteredUsers();
  const existing = users.find((u) => u.email.toLowerCase() === params.email.toLowerCase());
  if (existing) {
    return { success: false, error: 'Email ini sudah terdaftar. Silakan pilih tab Masuk.' };
  }

  const newUser: AuthUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    avatar: params.avatar || '🧑‍💻',
    gender: params.gender || 'lainnya',
    persona: params.persona || 'custom',
    passwordHash: btoa(params.password), // Local base64 encoded for browser storage
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newUser));

    // Sync to userProfile
    const profile = getStoredUserProfile();
    saveStoredUserProfile({
      ...profile,
      name: newUser.name,
      avatar: newUser.avatar,
      email: newUser.email,
      gender: newUser.gender,
      persona: newUser.persona,
      birthDate: params.birthDate || profile.birthDate,
      monthlyBudget: params.monthlyBudget || profile.monthlyBudget || 3500000,
      isSetup: true,
    });
  } catch (err) {
    return { success: false, error: 'Gagal menyimpan data akun ke browser.' };
  }

  return { success: true, user: newUser };
}

export function loginUser(email: string, password: string): { success: boolean; user?: AuthUser; error?: string } {
  if (!email || !password) {
    return { success: false, error: 'Email dan kata sandi wajib diisi.' };
  }

  const users = getRegisteredUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === btoa(password)
  );

  if (!found) {
    return { success: false, error: 'Email atau kata sandi tidak cocok. Silakan periksa kembali.' };
  }

  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(found));

    const profile = getStoredUserProfile();
    saveStoredUserProfile({
      ...profile,
      name: found.name,
      avatar: found.avatar,
      email: found.email,
      gender: found.gender,
      persona: found.persona,
      isSetup: true,
    });
  } catch (err) {
    return { success: false, error: 'Gagal memulai sesi login.' };
  }

  return { success: true, user: found };
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    saveStoredUserProfile(DEFAULT_PROFILE);
  } catch (e) {
    console.error(e);
  }
}

export function resetPassword(email: string, newPassword: string): { success: boolean; error?: string } {
  if (!email || !newPassword) {
    return { success: false, error: 'Email dan kata sandi baru wajib diisi.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
  }

  const users = getRegisteredUsers();
  const index = users.findIndex((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (index === -1) {
    return { success: false, error: 'Email tidak ditemukan dalam akun terdaftar di perangkat ini.' };
  }

  users[index].passwordHash = btoa(newPassword);
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal memperbarui kata sandi di penyimpanan perangkat.' };
  }
}

const OTP_STORE_KEY = 'tabsy_reset_otp_v1';

export function requestPasswordResetOtp(email: string): { success: boolean; otp?: string; error?: string } {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Silakan masukkan alamat email yang valid.' };
  }

  const users = getRegisteredUsers();
  const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!found) {
    return { success: false, error: 'Alamat email ini belum terdaftar di perangkat ini.' };
  }

  // Generate 6-digit verification code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const payload = {
    email: email.trim().toLowerCase(),
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 menit
  };

  try {
    sessionStorage.setItem(OTP_STORE_KEY, JSON.stringify(payload));
    return { success: true, otp };
  } catch {
    return { success: false, error: 'Gagal membangkitkan kode verifikasi.' };
  }
}

export function verifyOtpAndResetPassword(params: {
  email: string;
  otp: string;
  newPassword: string;
}): { success: boolean; error?: string } {
  const { email, otp, newPassword } = params;
  if (!email || !otp || !newPassword) {
    return { success: false, error: 'Email, Kode Verifikasi OTP, dan Kata Sandi baru wajib diisi.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
  }

  try {
    const raw = sessionStorage.getItem(OTP_STORE_KEY);
    if (!raw) {
      return { success: false, error: 'Kode verifikasi belum diminta atau telah kedaluwarsa. Silakan klik Kirim Kode OTP.' };
    }
    const stored = JSON.parse(raw);
    if (stored.email !== email.trim().toLowerCase()) {
      return { success: false, error: 'Kode verifikasi tidak cocok dengan email ini.' };
    }
    if (Date.now() > stored.expiresAt) {
      return { success: false, error: 'Kode verifikasi telah kedaluwarsa (lebih dari 10 menit). Silakan minta kode baru.' };
    }
    if (stored.otp !== otp.trim()) {
      return { success: false, error: 'Kode verifikasi (OTP) 6-digit salah. Silakan periksa kembali.' };
    }

    // OTP Valid! Reset password
    const users = getRegisteredUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (index === -1) {
      return { success: false, error: 'Akun tidak ditemukan di perangkat ini.' };
    }

    users[index].passwordHash = btoa(newPassword);
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    sessionStorage.removeItem(OTP_STORE_KEY);

    return { success: true };
  } catch {
    return { success: false, error: 'Terjadi kesalahan sistem saat memvalidasi kode.' };
  }
}


