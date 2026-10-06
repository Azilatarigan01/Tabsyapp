'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  CreditCard,
  Users,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Check,
  TrendingUp,
  Tag,
  Coffee,
  Briefcase,
  BookOpen,
  ShoppingBag,
  Dumbbell,
  Smile,
  X,
  Bell,
  BellRing,
} from 'lucide-react';
import { DailyActivity, DailyHabit, ActivityCategory, ExpenseCategory, UserProfile, UserPersona } from '@/types';
import {
  getDailyActivities,
  addDailyActivity,
  updateDailyActivity,
  toggleDailyActivity,
  deleteDailyActivity,
  getDailyHabits,
  addDailyHabit,
  toggleDailyHabit,
  deleteDailyHabit,
  seedStarterCompanionDataIfEmpty,
  getLocalTodayDate,
  addTransaction,
} from '@/lib/db';
import { formatRupiah } from '@/lib/domain/calculator';
import { addExpAndGems } from '@/lib/db/gamification';
import { playCelebrationChime } from '@/lib/domain/audioChime';
import { PERSONA_DEFINITIONS, applyPersonaStarterRoutines } from '@/lib/domain/personaTemplates';

interface DailyScheduleScreenProps {
  userProfile: UserProfile;
  onNavigateTab: (tab: 'catat' | 'jadwal' | 'split' | 'riwayat' | 'pengaturan') => void;
  onTransactionAdded?: () => void;
}

const CATEGORY_MAP: Record<
  ActivityCategory,
  { label: string; icon: any; color: string; badgeBg: string; expenseCat: ExpenseCategory }
> = {
  meal: { label: 'Makan & Minum', icon: Coffee, color: 'text-amber-600', badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', expenseCat: 'makan' },
  work: { label: 'Pekerjaan', icon: Briefcase, color: 'text-blue-600', badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', expenseCat: 'lainnya' },
  study: { label: 'Belajar', icon: BookOpen, color: 'text-indigo-600', badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800', expenseCat: 'pendidikan' },
  shopping: { label: 'Belanja', icon: ShoppingBag, color: 'text-emerald-600', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', expenseCat: 'belanja' },
  health: { label: 'Kesehatan/Gym', icon: Dumbbell, color: 'text-rose-600', badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', expenseCat: 'kesehatan' },
  leisure: { label: 'Hiburan', icon: Smile, color: 'text-purple-600', badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', expenseCat: 'hiburan' },
  other: { label: 'Lainnya', icon: Tag, color: 'text-slate-600', badgeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', expenseCat: 'lainnya' },
};

export const DailyScheduleScreen: React.FC<DailyScheduleScreenProps> = ({
  userProfile,
  onNavigateTab,
  onTransactionAdded,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayDate());
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [showAddActivityModal, setShowAddActivityModal] = useState<boolean>(false);
  const [showAddHabitModal, setShowAddHabitModal] = useState<boolean>(false);
  const [recordExpenseModalData, setRecordExpenseModalData] = useState<{
    activity: DailyActivity;
    amount: number;
    category: ExpenseCategory;
  } | null>(null);

  // Form states for new activity
  const [newTitle, setNewTitle] = useState('');
  const [newTimeStart, setNewTimeStart] = useState('09:00');
  const [newTimeEnd, setNewTimeEnd] = useState('10:00');
  const [newCategory, setNewCategory] = useState<ActivityCategory>('work');
  const [newEstimatedCost, setNewEstimatedCost] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Form states for new habit
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('⭐');
  const [newHabitCategory, setNewHabitCategory] = useState<'health' | 'finance' | 'productivity' | 'mindfulness'>('productivity');

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [actData, habData] = await Promise.all([
        getDailyActivities(selectedDate),
        getDailyHabits(),
      ]);
      setActivities(actData);
      setHabits(habData);
    } catch (err) {
      console.error('Error loading daily data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date helpers
  const todayStr = getLocalTodayDate();
  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${dy}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${dy}`);
  };

  // Activity handlers
  const handleToggleActivity = async (id: string) => {
    const newStatus = await toggleDailyActivity(id);
    if (newStatus) {
      addExpAndGems(15, 5);
      playCelebrationChime();
    }
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isCompleted: newStatus } : a))
    );
  };

  const handleDeleteActivity = async (id: string) => {
    if (confirm('Hapus agenda ini dari jadwal harian?')) {
      await deleteDailyActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const estimatedNum = newEstimatedCost ? parseInt(newEstimatedCost.replace(/\D/g, ''), 10) : undefined;

    const created = await addDailyActivity({
      title: newTitle.trim(),
      timeStart: newTimeStart,
      timeEnd: newTimeEnd || undefined,
      date: selectedDate,
      category: newCategory,
      isCompleted: false,
      notes: newNotes.trim() || undefined,
      estimatedCost: estimatedNum && !isNaN(estimatedNum) ? estimatedNum : undefined,
    });

    setActivities((prev) => [...prev, created].sort((a, b) => a.timeStart.localeCompare(b.timeStart)));
    setShowAddActivityModal(false);
    setNewTitle('');
    setNewNotes('');
    setNewEstimatedCost('');
  };

  // Habit handlers
  const handleToggleHabit = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    const wasCompleted = habit?.completedDates?.includes(selectedDate);
    await toggleDailyHabit(habitId, selectedDate);
    if (!wasCompleted) {
      addExpAndGems(15, 5);
      playCelebrationChime();
    }
    const updated = await getDailyHabits();
    setHabits(updated);
  };

  // State & Handlers untuk Persona Rutinitas (Pelajar, Mahasiswa, Fresh Grad, Pekerja, Wirausaha)
  const currentPersona = userProfile.persona || 'freshgrad';
  const [selectedPersona, setSelectedPersona] = useState<UserPersona>(currentPersona);

  const handleApplyPersonaRoutines = async (targetPersona?: UserPersona) => {
    const p = targetPersona || selectedPersona;
    const res = await applyPersonaStarterRoutines(p, selectedDate);
    playCelebrationChime();
    await loadData();
    const def = PERSONA_DEFINITIONS[p] || PERSONA_DEFINITIONS.custom;
    alert(`⚡ Sukses! Paket rutinitas "${def.title}" berhasil dimuat (${res.addedHabits} habit & ${res.addedAgendas} agenda aktif).`);
  };

  const handleRequestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser kamu belum mendukung web notification.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      playCelebrationChime();
      new Notification('🐻 Tabsy Companion Aktif!', {
        body: `Hai ${userProfile.name}! Pengingat harian aktif. Waktunya konsisten gapai karir impianmu hari ini!`,
        icon: '/favicon.ico',
      });
      alert('🔔 Izin notifikasi aktif! Tabsy akan mengingatkan rutinitas harianmu.');
    } else {
      alert('Izin notifikasi belum diizinkan oleh browser.');
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (confirm('Hapus habit rutinitas ini?')) {
      await deleteDailyHabit(habitId);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    await addDailyHabit({
      title: newHabitTitle.trim(),
      icon: newHabitIcon || '🎯',
      category: newHabitCategory,
      targetFrequency: 'daily',
    });

    const updated = await getDailyHabits();
    setHabits(updated);
    setShowAddHabitModal(false);
    setNewHabitTitle('');
  };

  // Expense Quick Record from Agenda
  const handleOpenRecordExpense = (act: DailyActivity) => {
    const config = CATEGORY_MAP[act.category];
    setRecordExpenseModalData({
      activity: act,
      amount: act.estimatedCost || 25000,
      category: config.expenseCat,
    });
  };

  const handleConfirmRecordExpense = async () => {
    if (!recordExpenseModalData) return;
    const { activity, amount, category } = recordExpenseModalData;

    try {
      const tx = await addTransaction({
        description: activity.title,
        amountRupiah: amount,
        category: category,
        date: activity.date,
      });

      await updateDailyActivity(activity.id, {
        linkedExpenseId: tx.id,
        isCompleted: true,
      });

      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? { ...a, linkedExpenseId: tx.id, isCompleted: true } : a))
      );

      if (onTransactionAdded) {
        onTransactionAdded();
      }

      addExpAndGems(25, 10);

      setRecordExpenseModalData(null);
    } catch (err) {
      alert('Gagal mencatat pengeluaran: ' + (err as Error).message);
    }
  };

  // Calculations for stats
  const completedActivities = activities.filter((a) => a.isCompleted).length;
  const totalActivities = activities.length;
  const activityProgressPct = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  const completedHabitsToday = habits.filter((h) => h.completedDates?.includes(selectedDate)).length;
  const totalHabits = habits.length;
  const habitProgressPct = totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0;

  const totalEstimatedCostToday = useMemo(() => {
    return activities.reduce((sum, cur) => sum + (cur.estimatedCost || 0), 0);
  }, [activities]);

  const filteredActivities = activities.filter((a) => {
    if (filter === 'pending') return !a.isCompleted;
    if (filter === 'completed') return a.isCompleted;
    return true;
  });

  const formattedDateHeader = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8 animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* HEADER & DATE SELECTOR WITH MODERN NAVIGATION                  */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-sky-400">
              Daily Companion ⚡
            </span>
            {isToday && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hari Ini
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
            {formattedDateHeader}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Jadwal kegiatan harian, habit sehat, dan anggaran belanja dalam satu tempat.
          </p>
        </div>

        {/* Date Navigator & Quick Jump */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handlePrevDay}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="Hari Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {!isToday ? (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="h-10 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-sky-400 font-black text-xs transition-all cursor-pointer"
            >
              Kembali ke Hari Ini
            </button>
          ) : (
            <div className="h-10 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Hari Ini</span>
            </div>
          )}

          <button
            onClick={handleNextDay}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="Hari Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sleek Role & Daily Routine Status Card */}
      {(() => {
        const activeDef = PERSONA_DEFINITIONS[selectedPersona] || PERSONA_DEFINITIONS.custom;
        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-2xl shrink-0">
                {activeDef.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-sky-300 font-bold text-[10px] uppercase tracking-wider">
                    {activeDef.badge}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Profil: {userProfile.name}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {activeDef.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xl">
                  {activeDef.description}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value as UserPersona)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                {Object.values(PERSONA_DEFINITIONS).map((def) => (
                  <option key={def.id} value={def.id}>
                    {def.icon} {def.title.split(' (')[0]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleApplyPersonaRoutines(selectedPersona)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Terapkan rekomendasi kebiasaan"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rekomendasi Paket</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 2-COLUMN RESPONSIVE LAYOUT (Desktop Widescreen & Fluid Mobile) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: TIMELINE JADWAL HARIAN (7 COLS ON DESKTOP)     */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 space-y-6">
          {/* Timeline Section Header & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Jadwal & Agenda
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completedActivities} dari {totalActivities} agenda selesai ({activityProgressPct}%)
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddActivityModal(true)}
              className="h-10 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black text-xs flex items-center gap-2 shadow-md shadow-slate-950/15 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agenda</span>
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2">
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {f === 'all' && `Semua (${activities.length})`}
                {f === 'pending' && `Belum (${activities.filter((a) => !a.isCompleted).length})`}
                {f === 'completed' && `Selesai (${activities.filter((a) => a.isCompleted).length})`}
              </button>
            ))}
          </div>

          {/* Timeline List */}
          {filteredActivities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center text-2xl">
                🗓️
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Belum ada agenda di tanggal ini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Mulai atur hari produktifmu! Tambahkan agenda kerja, makan bareng, olahraga, atau belanja.
              </p>
              <button
                onClick={() => setShowAddActivityModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Agenda Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:pointer-events-none">
              {filteredActivities.map((act) => {
                const config = CATEGORY_MAP[act.category];
                const IconComponent = config.icon;

                return (
                  <div
                    key={act.id}
                    className={`relative flex items-start gap-4 p-4 rounded-3xl border transition-all ${
                      act.isCompleted
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    {/* Toggle Completion Circle */}
                    <button
                      onClick={() => handleToggleActivity(act.id)}
                      className={`relative z-10 w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        act.isCompleted
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600'
                      }`}
                      title={act.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                    >
                      {act.isCompleted ? (
                        <Check className="w-5 h-5 stroke-[3]" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Time & Category Badge */}
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {act.timeStart} {act.timeEnd ? `– ${act.timeEnd}` : ''}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${config.badgeBg} ${config.color}`}
                          >
                            <IconComponent className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>

                        {/* Delete action */}
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                          title="Hapus agenda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Title & Notes */}
                      <div>
                        <h4
                          className={`text-sm font-black text-slate-900 dark:text-white leading-tight ${
                            act.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}
                        >
                          {act.title}
                        </h4>
                        {act.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {act.notes}
                          </p>
                        )}
                      </div>

                      {/* Financial Integration Actions Bar */}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {/* If estimated cost exists */}
                        {act.estimatedCost !== undefined && act.estimatedCost > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[11px] font-black">
                            Estimasi: {formatRupiah(act.estimatedCost)}
                          </span>
                        )}

                        {/* Linked Expense Status */}
                        {act.linkedExpenseId ? (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Pengeluaran Terhubung
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenRecordExpense(act)}
                            className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-sky-300 text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            Catat Pengeluaran
                          </button>
                        )}

                        {/* Split Bill Shortcut (ideal for lunch / hangouts) */}
                        {act.category === 'meal' && (
                          <button
                            onClick={() => onNavigateTab('split')}
                            className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Users className="w-3 h-3" />
                            Split Bill
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: HABITS TRACKER & RINGKASAN HARIAN (5 COLS)     */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 1: HABITS TRACKER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Habit Rutinitas
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {completedHabitsToday} dari {totalHabits} habit tuntas hari ini ({habitProgressPct}%)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddHabitModal(true)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                title="Tambah Habit Baru"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Habit Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${habitProgressPct}%` }}
              />
            </div>

            {/* Habit Items */}
            <div className="space-y-2 pt-1">
              {habits.map((habit) => {
                const isCompleted = habit.completedDates?.includes(selectedDate);
                return (
                  <div
                    key={habit.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                        : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{habit.icon}</span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-black truncate leading-tight ${
                            isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {habit.title}
                        </p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 mt-0.5">
                          <Flame className="w-3 h-3" />
                          <span>{habit.streak || 0} hari beruntun</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => handleToggleHabit(habit.id)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-300 hover:text-slate-500'
                        }`}
                        title={isCompleted ? 'Batal tandai' : 'Tandai selesai'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <button
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus Habit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: ESTIMASI ANGGARAN DARI AGENDA HARI INI */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Ringkasan Biaya Harian
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-black text-[10px]">
                {activities.filter((a) => (a.estimatedCost || 0) > 0).length} Agenda Berbayar
              </span>
            </div>

            <div>
              <p className="text-xs text-blue-100">Total Estimasi Kebutuhan Hari Ini</p>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                {formatRupiah(totalEstimatedCostToday)}
              </h3>
            </div>

            <div className="pt-2 border-t border-white/20 flex items-center justify-between">
              <p className="text-[11px] text-blue-100 leading-tight">
                Hubungkan jadwal makan atau belanja langsung ke catatan keuangan Tabsy.
              </p>
              <button
                onClick={() => onNavigateTab('catat')}
                className="px-3.5 py-2 rounded-xl bg-white text-blue-600 font-black text-xs hover:bg-blue-50 transition-all shrink-0 cursor-pointer shadow-md"
              >
                Catat Uang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: TAMBAH AGENDA HARIAN                                     */}
      {/* ============================================================== */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Tambah Agenda Baru
                </h3>
              </div>
              <button
                onClick={() => setShowAddActivityModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Agenda / Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Sarapan Bareng, Meeting Tim, Gym..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    required
                    value={newTimeStart}
                    onChange={(e) => setNewTimeStart(e.target.value)}
                    className="w-full h-11 px-3 text-sm font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={newTimeEnd}
                    onChange={(e) => setNewTimeEnd(e.target.value)}
                    className="w-full h-11 px-3 text-sm font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Kategori Agenda
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_MAP) as ActivityCategory[]).map((cat) => {
                    const c = CATEGORY_MAP[cat];
                    const isSelected = newCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`p-2 rounded-xl text-[11px] font-black border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <c.icon className="w-3.5 h-3.5" />
                        <span className="truncate">{c.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estimated Cost */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Estimasi Biaya (Opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0 (jika gratis)"
                    value={newEstimatedCost}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setNewEstimatedCost(digits ? Number(digits).toLocaleString('id-ID') : '');
                    }}
                    className="w-full h-11 pl-10 pr-3.5 text-sm font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Lokasi, catatan materi, atau teman..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TAMBAH HABIT RUTINITAS                                   */}
      {/* ============================================================== */}
      {showAddHabitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Tambah Habit Rutinitas
                </h3>
              </div>
              <button
                onClick={() => setShowAddHabitModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Habit *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Jalan Pagi 15 Menit, Minum Vitamin..."
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Icon Emoji Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Pilih Ikon Emoji
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {['💧', '🏃', '💰', '📖', '⚡', '🌙', '🧘', '🥗', '☕', '🎯', '💊', '🍎'].map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setNewHabitIcon(ico)}
                      className={`h-11 rounded-2xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        newHabitIcon === ico
                          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 scale-105'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHabitModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Simpan Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: QUICK CATAT PENGELUARAN DARI AGENDA                     */}
      {/* ============================================================== */}
      {recordExpenseModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Catat ke Keuangan
                </h3>
              </div>
              <button
                onClick={() => setRecordExpenseModalData(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Catat pengeluaran untuk agenda:{' '}
              <strong className="text-slate-900 dark:text-white">
                {recordExpenseModalData.activity.title}
              </strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nominal Pengeluaran (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={recordExpenseModalData.amount.toLocaleString('id-ID')}
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                      setRecordExpenseModalData((prev) => (prev ? { ...prev, amount: num } : null));
                    }}
                    className="w-full h-12 pl-10 pr-3.5 text-base font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordExpenseModalData(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRecordExpense}
                className="px-5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black text-xs shadow-md shadow-slate-950/20 active:scale-95 transition-all cursor-pointer"
              >
                Simpan & Tandai Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
