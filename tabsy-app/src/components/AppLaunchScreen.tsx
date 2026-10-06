'use client';

import React, { useState } from 'react';
import { UserProfile, DEFAULT_AVATARS, UserGender, UserPersona, ActivityCategory } from '@/types';
import {
  ArrowRight,
  ShieldCheck,
  Calendar,
  User,
  Wallet,
  ArrowLeft,
  Sparkles,
  Flame,
  CheckCircle2,
  CalendarCheck,
  Users,
  Zap,
  Mail,
  Lock,
  Heart,
  Briefcase,
  GraduationCap,
  Store,
  Compass,
  Bell,
  Check,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { registerUser, loginUser, resetPassword, requestPasswordResetOtp, verifyOtpAndResetPassword, AuthUser } from '@/lib/db/auth';
import { PERSONA_DEFINITIONS, applyCustomUserRoutines } from '@/lib/domain/personaTemplates';
import {
  generateSmartRecommendations,
  QUIZ_GOAL_OPTIONS,
  QUIZ_LIFESTYLE_OPTIONS,
  RecommendedHabitItem,
  RecommendedAgendaItem,
} from '@/lib/domain/recommendationEngine';
import { playCelebrationChime } from '@/lib/domain/audioChime';
import { getLocalTodayDate } from '@/lib/db';

interface AppLaunchScreenProps {
  initialProfile: UserProfile;
  onGetStarted: (profile: UserProfile) => void;
}

export const AppLaunchScreen: React.FC<AppLaunchScreenProps> = ({
  initialProfile,
  onGetStarted,
}) => {
  // Navigation step: 'promo' | 'auth' | 'quiz' | 'review'
  const [currentStep, setCurrentStep] = useState<'promo' | 'auth' | 'quiz' | 'review'>('promo');
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot'>('register');

  // Account Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [gender, setGender] = useState<UserGender>('wanita');
  const [persona, setPersona] = useState<UserPersona>('freshgrad');
  const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]);
  const [birthDate, setBirthDate] = useState('2003-08-20');
  const [monthlyBudget, setMonthlyBudget] = useState<number>(2000000);

  // Preference Questionnaire (Quiz) State
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['job_apply', 'tech_portfolio']);
  const [dailyHours, setDailyHours] = useState<'santai' | 'teratur' | 'intensif'>('teratur');
  const [lifestyleHabits, setLifestyleHabits] = useState<string[]>(['water_health', 'finance_track']);
  const [customGoalNote, setCustomGoalNote] = useState('');

  // Curated Routine Review State (100% User Editable)
  const [curatedHabits, setCuratedHabits] = useState<RecommendedHabitItem[]>([]);
  const [curatedAgendas, setCuratedAgendas] = useState<RecommendedAgendaItem[]>([]);
  const [newCustomTaskTitle, setNewCustomTaskTitle] = useState('');

  // Status & Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enableNotification, setEnableNotification] = useState(true);

  // Quick switch persona helper
  const handleSelectPersona = (p: UserPersona) => {
    setPersona(p);
    const def = PERSONA_DEFINITIONS[p];
    if (def) {
      setMonthlyBudget(def.defaultBudget);
    }
    // Set default initial goals for that persona
    const goals = QUIZ_GOAL_OPTIONS[p] || [];
    if (goals.length > 0) {
      setSelectedGoals([goals[0].id]);
    }
  };

  // Toggle goal selection in quiz
  const handleToggleGoal = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goalId));
    } else {
      setSelectedGoals([...selectedGoals, goalId]);
    }
  };

  // Toggle lifestyle habit in quiz
  const handleToggleLifestyle = (lifeId: string) => {
    if (lifestyleHabits.includes(lifeId)) {
      setLifestyleHabits(lifestyleHabits.filter((l) => l !== lifeId));
    } else {
      setLifestyleHabits([...lifestyleHabits, lifeId]);
    }
  };

  const handleRequestOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAuthSuccessMsg(null);
    const res = requestPasswordResetOtp(email);
    if (res.success && res.otp) {
      setIsOtpSent(true);
      setOtpCode(res.otp);
      setSimulatedOtpNotice(`📩 [Notifikasi Email Tabsy]: Kode Verifikasi OTP Anda adalah ${res.otp} (Berlaku 10 menit).`);
    } else {
      setErrorMsg(res.error || 'Gagal mengirim kode verifikasi.');
    }
  };

  // 1. Submit Registration or Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAuthSuccessMsg(null);
    setIsLoading(true);

    try {
      if (authMode === 'forgot') {
        if (!isOtpSent) {
          setErrorMsg('Silakan klik "Kirim Kode Verifikasi" terlebih dahulu.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi kata sandi tidak cocok.');
          setIsLoading(false);
          return;
        }
        const res = verifyOtpAndResetPassword({
          email,
          otp: otpCode,
          newPassword: password,
        });
        if (res.success) {
          playCelebrationChime();
          setAuthSuccessMsg('Kata sandi berhasil disetel ulang dengan verifikasi OTP! Silakan masuk dengan kata sandi baru Anda.');
          setAuthMode('login');
          setPassword('');
          setConfirmPassword('');
          setOtpCode('');
          setIsOtpSent(false);
          setSimulatedOtpNotice(null);
        } else {
          setErrorMsg(res.error || 'Gagal memvalidasi kode OTP atau menyetel ulang kata sandi.');
        }
        setIsLoading(false);
        return;
      }

      if (authMode === 'login') {
        const res = loginUser(email, password);
        if (res.success && res.user) {
          playCelebrationChime();
          onGetStarted({
            ...initialProfile,
            name: res.user.name,
            avatar: res.user.avatar,
            email: res.user.email,
            gender: res.user.gender,
            persona: res.user.persona,
            isSetup: true,
          });
        } else {
          setErrorMsg(res.error || 'Gagal masuk akun. Periksa email atau kata sandi.');
        }
      } else {
        // Register validation
        if (!name.trim()) {
          setErrorMsg('Silakan masukkan nama lengkap atau panggilan Anda.');
          setIsLoading(false);
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setErrorMsg('Silakan masukkan alamat email yang valid.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter demi keamanan akun.');
          setIsLoading(false);
          return;
        }

        // Move to interactive preference quiz
        setCurrentStep('quiz');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat memproses data akun.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Generate recommendations from questionnaire
  const handleGenerateRecommendations = () => {
    const result = generateSmartRecommendations({
      persona,
      selectedGoals,
      dailyHours,
      lifestyleHabits,
      customGoalNote,
    });
    setCuratedHabits(result.habits);
    setCuratedAgendas(result.agendas);
    setCurrentStep('review');
  };

  // 3. User can choose to start blank (0 tasks)
  const handleStartBlank = () => {
    setCuratedHabits([]);
    setCuratedAgendas([]);
    setCurrentStep('review');
  };

  // 4. Toggle habit in review list
  const handleToggleCuratedHabit = (id: string) => {
    setCuratedHabits(
      curatedHabits.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
    );
  };

  // 5. Delete habit from review list
  const handleDeleteCuratedHabit = (id: string) => {
    setCuratedHabits(curatedHabits.filter((h) => h.id !== id));
  };

  // 6. Toggle agenda in review list
  const handleToggleCuratedAgenda = (id: string) => {
    setCuratedAgendas(
      curatedAgendas.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  // 7. Delete agenda from review list
  const handleDeleteCuratedAgenda = (id: string) => {
    setCuratedAgendas(curatedAgendas.filter((a) => a.id !== id));
  };

  // 8. Add a custom habit manually
  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomTaskTitle.trim()) return;

    const newHabit: RecommendedHabitItem = {
      id: `custom-hab-${Date.now()}`,
      title: newCustomTaskTitle.trim(),
      icon: '⭐',
      category: 'productivity',
      selected: true,
      reason: 'Dibuat khusus oleh Anda',
    };
    setCuratedHabits([...curatedHabits, newHabit]);
    setNewCustomTaskTitle('');
  };

  // 9. Finalize Registration & Apply strictly user-approved routines
  const handleFinishSetup = async () => {
    setIsLoading(true);
    try {
      const res = registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        avatar,
        gender,
        persona,
        birthDate,
        monthlyBudget,
      });

      if (res.success && res.user) {
        // Save ONLY checked habits & agendas for this specific user
        const activeHabits = curatedHabits
          .filter((h) => h.selected)
          .map((h) => ({
            title: h.title,
            icon: h.icon,
            category: h.category,
          }));

        const activeAgendas = curatedAgendas
          .filter((a) => a.selected)
          .map((a) => ({
            title: a.title,
            timeStart: a.timeStart,
            timeEnd: a.timeEnd,
            category: a.category,
            notes: a.notes,
          }));

        const today = getLocalTodayDate();
        await applyCustomUserRoutines({
          habits: activeHabits,
          agendas: activeAgendas,
          date: today,
          userId: res.user.id,
        });

        // Web Notification permission
        if (enableNotification && typeof window !== 'undefined' && 'Notification' in window) {
          try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              new Notification('🐻 Selamat Datang di Tabsy!', {
                body: `Hai ${name.trim()}! Ruang kerjamu telah siap dengan ${activeHabits.length} kebiasaan pilihanmu.`,
              });
            }
          } catch {
            // Ignore notification error
          }
        }

        playCelebrationChime();
        onGetStarted({
          name: name.trim(),
          avatar,
          email: email.trim(),
          gender,
          persona,
          birthDate,
          monthlyBudget,
          isSetup: true,
        });
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan profil pendaftaran.');
        setCurrentStep('auth');
      }
    } catch {
      setErrorMsg('Gagal menyelesaikan konfigurasi akun.');
      setCurrentStep('auth');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F3F6FD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative font-sans overflow-x-hidden">
      {/* Dynamic Animated Ambient Blobs */}
      <div className="fixed top-0 left-1/4 w-[450px] h-[450px] bg-sky-200/40 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-blob" />
      <div className="fixed bottom-0 right-1/4 w-[450px] h-[450px] bg-indigo-200/40 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-blob animation-delay-2000" />
      <div className="fixed top-1/2 right-10 w-[300px] h-[300px] bg-amber-200/30 dark:bg-amber-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-blob animation-delay-4000" />

      {/* ============================================================== */}
      {/* TOP HEADER: Tabsy Brand + Mascot Emblem                        */}
      {/* ============================================================== */}
      <header className="w-full max-w-7xl mx-auto px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 p-0.5 shadow-md shadow-blue-500/25 flex items-center justify-center text-white shrink-0 animate-wiggle">
            <span className="text-2xl select-none">🐻</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                Tabsy<span className="text-blue-600">.</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-sky-300">
                Daily Companion
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase mt-0.5">
              Habit • Schedule • Smart Finance
            </p>
          </div>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentStep === 'promo' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setCurrentStep('auth');
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setCurrentStep('auth');
                }}
                className="px-4 py-2 rounded-full text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Daftar Gratis
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep('promo')}
              className="text-xs font-black text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda Promo</span>
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CONTAINER                                                 */}
      {/* ============================================================== */}
      <main className="w-full max-w-7xl mx-auto px-5 sm:px-8 flex-1 flex flex-col justify-center py-4 sm:py-8 z-10">
        
        {/* ============================================================ */}
        {/* VIEW 1: PROMOTIONAL & MASCOT WELCOME SCREEN                 */}
        {/* ============================================================ */}
        {currentStep === 'promo' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Panoramic Hero Banner with Mascot Frame */}
            <div className="relative rounded-[36px] overflow-hidden bg-gradient-to-r from-[#DFF1FF] via-[#EAF5FF] to-[#D5EDFF] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-7 sm:p-10 border border-sky-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(20,50,110,0.06)] flex flex-col lg:flex-row items-center justify-between gap-8">
              
              {/* Left Column: Copywriting & Value Proposition */}
              <div className="w-full lg:w-7/12 space-y-5 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700 text-xs font-black text-blue-700 dark:text-sky-300 shadow-xs">
                  <span className="text-sm">✨</span>
                  <span>Asisten Harian & Finansial Pribadi</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                  Bangun Rutinitas Konsisten,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600">
                    Kelola Finansial dengan Tenang.
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium max-w-xl">
                  Rancang jadwal harian dan kebiasaan terarah yang kamu tentukan sendiri sesuai preferensimu. Bebas pilih task, tanpa paksaan template kaku, dilengkapi Safe-to-Spend dan split bill kilat.
                </p>

                {/* Main CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setCurrentStep('auth');
                    }}
                    className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#1E75FF] hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-blue-500/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Mulai Sekarang (Gratis)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setCurrentStep('auth');
                    }}
                    className="w-full sm:w-auto h-13 px-6 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Masuk ke Akun</span>
                  </button>
                </div>
              </div>

              {/* Right Column: 100% Uncropped 3D Mascot Character */}
              <div className="w-full lg:w-5/12 flex flex-col items-center justify-center my-4 lg:my-0">
                <div className="relative w-full max-w-[480px] rounded-[32px] overflow-hidden shadow-2xl border-2 border-white/80 dark:border-slate-700/80 bg-gradient-to-b from-sky-100/50 via-white to-white dark:from-slate-800 dark:to-slate-900 animate-float p-2">
                  <img
                    src="/tabsy_mascot_hero.jpg"
                    alt="Tabsy 3D Mascot Companion"
                    className="w-full h-auto max-h-[380px] object-contain rounded-2xl transition-transform duration-500 hover:scale-[1.01]"
                  />
                </div>
              </div>
            </div>

            {/* Feature Highlights: Sleek 4-Card Bento Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-lg shrink-0">
                  🔥
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Disiplin Rutinitas</p>
                  <p className="text-[11px] text-slate-500">Membangun konsistensi</p>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-lg shrink-0">
                  🎯
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Kustomisasi Bebas</p>
                  <p className="text-[11px] text-slate-500">Atur agenda personal</p>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-lg shrink-0">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Bagi Tagihan Presisi</p>
                  <p className="text-[11px] text-slate-500">Nir-selisih pembulatan</p>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center text-lg shrink-0">
                  🛡️
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">100% Privat Lokal</p>
                  <p className="text-[11px] text-slate-500">Aman di perangkat Anda</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: AUTH MODAL / SCREEN (REGISTER & LOGIN)              */}
        {/* ============================================================ */}
        {currentStep === 'auth' && (
          <div className="max-w-xl mx-auto w-full bg-white dark:bg-slate-900 rounded-[36px] p-6 sm:p-9 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(20,50,110,0.08)] space-y-6 animate-in slide-in-from-bottom-4">
            
            {/* Tab Switcher: Daftar vs Masuk vs Forgot */}
            {authMode !== 'forgot' ? (
              <div className="flex bg-[#F1F5F9] dark:bg-slate-800 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Daftar Akun Baru
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Masuk Akun
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Setel Ulang Kata Sandi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan email terdaftar Anda untuk mengganti kata sandi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  ← Batal
                </button>
              </div>
            )}

            {/* Success Message */}
            {authSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-400 text-xs font-bold animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nama Lengkap / Panggilan *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="Contoh: Zila Tarigan"
                        className="w-full h-12 pl-10 pr-3.5 text-sm font-bold rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Jenis Kelamin
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('wanita')}
                        className={`h-11 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          gender === 'wanita'
                            ? 'bg-pink-50 dark:bg-pink-950/50 border-pink-400 text-pink-600 dark:text-pink-300 shadow-xs ring-1 ring-pink-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>👩</span>
                        <span>Wanita</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('pria')}
                        className={`h-11 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          gender === 'pria'
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-600 dark:text-sky-300 shadow-xs ring-1 ring-blue-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>👨</span>
                        <span>Pria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('lainnya')}
                        className={`h-11 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          gender === 'lainnya'
                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 text-purple-600 dark:text-purple-300 shadow-xs ring-1 ring-purple-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>✨</span>
                        <span>Lainnya</span>
                      </button>
                    </div>
                  </div>

                  {/* Status / Peran Saat Ini */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Status / Peran Saat Ini *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.values(PERSONA_DEFINITIONS).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectPersona(item.id)}
                          className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            persona === item.id
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-xs ring-1 ring-blue-500'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xl mb-1">{item.icon}</span>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                              {item.title.split(' (')[0]}
                            </p>
                            <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">
                              {item.badge}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Alamat Email Terdaftar *
                  </label>
                  {authMode === 'forgot' && (
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {isOtpSent ? 'Kirim Ulang OTP' : 'Kirim Kode Verifikasi'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIsOtpSent(false);
                      setSimulatedOtpNotice(null);
                      setErrorMsg(null);
                    }}
                    placeholder="namaanda@gmail.com"
                    className="w-full h-12 pl-10 pr-3.5 text-sm font-bold rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Simulated Email OTP Notice Banner */}
              {simulatedOtpNotice && authMode === 'forgot' && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-blue-900 dark:text-blue-300 text-xs font-bold flex items-start gap-2 animate-in fade-in">
                  <Mail className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <div className="flex-1">
                    <p className="leading-snug">{simulatedOtpNotice}</p>
                    <p className="text-[10px] font-normal text-slate-500 mt-0.5">
                      (Proteksi kepemilikan email: Hanya pemilik akun yang dapat menerima kode rahasia ini)
                    </p>
                  </div>
                </div>
              )}

              {/* OTP 6-Digit Code Field (when authMode === 'forgot') */}
              {authMode === 'forgot' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kode Verifikasi OTP (6 Digit) *
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Contoh: 123456"
                      className="w-full h-12 pl-10 pr-3.5 text-sm font-black tracking-widest rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mencegah orang lain mereset kata sandi Anda tanpa izin verifikasi email.
                  </p>
                </div>
              )}

              {/* Kata Sandi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {authMode === 'forgot' ? 'Kata Sandi Baru *' : 'Kata Sandi *'}
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setErrorMsg(null);
                        setAuthSuccessMsg(null);
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Lupa Kata Sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Minimal 6 karakter"
                    className="w-full h-12 pl-10 pr-3.5 text-sm font-bold rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password Field (for Forgot Password) */}
              {authMode === 'forgot' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ulangi Kata Sandi Baru *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full h-12 pl-10 pr-3.5 text-sm font-bold rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-13 rounded-full bg-[#1E75FF] hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 active:scale-95 transition-all cursor-pointer mt-5"
              >
                {isLoading ? (
                  <span>Memproses...</span>
                ) : authMode === 'register' ? (
                  <>
                    <span>Lanjut ke Kuesioner Preferensi</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : authMode === 'login' ? (
                  <>
                    <span>Masuk ke Tabsy</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Simpan Kata Sandi Baru</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: INTERACTIVE PREFERENCE QUESTIONNAIRE (QUIZ)         */}
        {/* ============================================================ */}
        {currentStep === 'quiz' && (
          <div className="max-w-2xl mx-auto w-full bg-white dark:bg-slate-900 rounded-[36px] p-6 sm:p-9 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(20,50,110,0.08)] space-y-7 animate-in slide-in-from-right-4">
            
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 text-xs font-black mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kuesioner Cerdas • Personalisasi Khusus</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('auth')}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Bagaimana Kamu Ingin Menjalani Harimu, {name || 'Teman Tabsy'}?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Jawab pertanyaan berikut agar kami bisa merekomendasikan aktivitas yang sesuai. Kamu tetap bebas memilih atau memulai dari halaman kosong.
              </p>
            </div>

            {/* Pertanyaan 1: Target & Fokus Utama (Multi-select) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                1. Apa target & fokus utama yang ingin kamu capai saat ini? (Bisa pilih lebih dari satu)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(QUIZ_GOAL_OPTIONS[persona] || QUIZ_GOAL_OPTIONS.freshgrad).map((goal) => {
                  const isChecked = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleToggleGoal(goal.id)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 shadow-xs ring-1 ring-blue-500'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{goal.icon}</span>
                          <span>{goal.label}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {goal.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pertanyaan 2: Alokasi Waktu Fokus Harian (Single Select) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                2. Berapa jam waktu fokus harian yang ingin kamu alokasikan?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'santai', label: 'Santai & Ringan', time: '30 - 60 Menit', icon: '🌱' },
                  { id: 'teratur', label: 'Sedang & Teratur', time: '2 - 3 Jam', icon: '⏱️' },
                  { id: 'intensif', label: 'Intensif & Penuh', time: '4 - 6+ Jam', icon: '🔥' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDailyHours(item.id as any)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      dailyHours === item.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="text-xl block mb-1">{item.icon}</span>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.time}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pertanyaan 3: Gaya Hidup & Kebiasaan Sehat (Multi-select) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                3. Kebiasaan hidup sehat & finansial apa yang ingin kamu jaga?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUIZ_LIFESTYLE_OPTIONS.map((item) => {
                  const isChecked = lifestyleHabits.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleLifestyle(item.id)}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.icon} {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Opsional: Target Pribadi Spesifik */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Punya target khusus lainnya? (Opsional)
              </label>
              <input
                type="text"
                value={customGoalNote}
                onChange={(e) => setCustomGoalNote(e.target.value)}
                placeholder="Misal: Buat project portofolio React, baca 1 bab buku karir..."
                className="w-full h-11 px-3.5 text-xs font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleGenerateRecommendations}
                className="flex-1 h-13 rounded-full bg-[#1E75FF] hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ Buat Rekomendasi Rutinitas AI</span>
              </button>

              <button
                type="button"
                onClick={handleStartBlank}
                className="h-13 px-5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Mulai dari Halaman Kosong (0 Task)</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: REVIEW & CURATION SCREEN (100% USER IN CONTROL)     */}
        {/* ============================================================ */}
        {currentStep === 'review' && (
          <div className="max-w-2xl mx-auto w-full bg-white dark:bg-slate-900 rounded-[36px] p-6 sm:p-9 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(20,50,110,0.08)] space-y-6 animate-in slide-in-from-right-4">
            
            {/* Header Review */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kamu Memegang Kendali Penuh</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Kurasi Rutinitasmu, {name || 'Teman Tabsy'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Centang task yang kamu inginkan, hapus yang tidak cocok, atau tambahkan task kustommu sendiri.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('quiz')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ulangi Kuesioner</span>
              </button>
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Avatar Profilmu:
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {DEFAULT_AVATARS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAvatar(item)}
                    className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                      avatar === item
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-500 scale-105 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 1: Daftar Kebiasaan (Habits) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Kebiasaan Harian Disiplin ({curatedHabits.filter((h) => h.selected).length}/{curatedHabits.length} dipilih)</span>
                </h4>
              </div>

              {curatedHabits.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 font-medium">
                  Belum ada kebiasaan. Kamu bisa menambahkannya di bawah atau memulainya nanti di aplikasi.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {curatedHabits.map((habit) => (
                    <div
                      key={habit.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                        habit.selected
                          ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCuratedHabit(habit.id)}
                        className="cursor-pointer"
                      >
                        {habit.selected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <span className="text-lg">{habit.icon}</span>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black truncate ${habit.selected ? 'text-slate-900 dark:text-white' : 'line-through text-slate-400'}`}>
                          {habit.title}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {habit.reason}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCuratedHabit(habit.id)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus dari daftar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Jadwal Agenda (Agendas) */}
            {curatedAgendas.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Jadwal Terstruktur Hari Ini ({curatedAgendas.filter((a) => a.selected).length}/{curatedAgendas.length} dipilih)</span>
                  </h4>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {curatedAgendas.map((agenda) => (
                    <div
                      key={agenda.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                        agenda.selected
                          ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/60'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCuratedAgenda(agenda.id)}
                        className="cursor-pointer"
                      >
                        {agenda.selected ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div className="px-2 py-1 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-black shrink-0">
                        {agenda.timeStart} - {agenda.timeEnd}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black truncate ${agenda.selected ? 'text-slate-900 dark:text-white' : 'line-through text-slate-400'}`}>
                          {agenda.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {agenda.notes}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCuratedAgenda(agenda.id)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus dari daftar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Task Form */}
            <form onSubmit={handleAddCustomTask} className="flex gap-2">
              <input
                type="text"
                value={newCustomTaskTitle}
                onChange={(e) => setNewCustomTaskTitle(e.target.value)}
                placeholder="+ Tambah task atau kebiasaan kustommu..."
                className="flex-1 h-11 px-3.5 text-xs font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newCustomTaskTitle.trim()}
                className="px-4 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            {/* Notification Permission Option */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Notifikasi Pengingat Jadwal
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Kirim notifikasi browser untuk jadwal aktivitas yang telah kamu pilih
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableNotification}
                onChange={(e) => setEnableNotification(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Final Action Button */}
            <button
              type="button"
              onClick={handleFinishSetup}
              disabled={isLoading}
              className="w-full h-14 rounded-full bg-[#1E75FF] hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span>Menyiapkan Akun & Ruang Kerja...</span>
              ) : (
                <>
                  <span>Simpan & Buka Tabsy 🚀</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-7xl mx-auto px-5 sm:px-8 py-3 text-center text-[11px] text-slate-400 font-medium">
        Tabsy Daily & Finance Companion • 100% Data tersimpan aman secara offline & privat di browser Anda
      </footer>
    </div>
  );
};
