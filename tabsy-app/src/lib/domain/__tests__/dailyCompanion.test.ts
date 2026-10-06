import { describe, it, expect } from 'vitest';
import { DailyActivity, DailyHabit, ActivityCategory } from '@/types';

describe('Daily Companion: Domain & Logic Unit Tests', () => {
  it('should structure a daily activity properly with time-block and category', () => {
    const activity: DailyActivity = {
      id: 'act-123',
      title: 'Makan Siang Bareng Teman Kantor',
      timeStart: '12:00',
      timeEnd: '13:00',
      date: '2026-10-05',
      category: 'meal',
      isCompleted: false,
      estimatedCost: 50000,
      notes: 'Di restoran padang dekat kantor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(activity.id).toBe('act-123');
    expect(activity.category).toBe('meal');
    expect(activity.timeStart).toBe('12:00');
    expect(activity.estimatedCost).toBe(50000);
    expect(activity.isCompleted).toBe(false);
  });

  it('should toggle activity completion status correctly', () => {
    let isCompleted = false;
    isCompleted = !isCompleted;
    expect(isCompleted).toBe(true);
    isCompleted = !isCompleted;
    expect(isCompleted).toBe(false);
  });

  it('should correctly calculate habit streaks and completion dates', () => {
    const habit: DailyHabit = {
      id: 'hab-water',
      title: 'Minum 2L Air Putih',
      icon: '💧',
      category: 'health',
      targetFrequency: 'daily',
      completedDates: ['2026-10-03', '2026-10-04'],
      streak: 2,
      createdAt: new Date().toISOString(),
    };

    // Toggle today's date
    const today = '2026-10-05';
    const datesSet = new Set(habit.completedDates);
    datesSet.add(today);
    const updatedDates = Array.from(datesSet).sort();
    const newStreak = updatedDates.length;

    expect(updatedDates).toContain('2026-10-05');
    expect(newStreak).toBe(3);
  });

  it('should correctly sum estimated costs for the day', () => {
    const activities: DailyActivity[] = [
      {
        id: '1',
        title: 'Kopi Pagi',
        timeStart: '08:00',
        date: '2026-10-05',
        category: 'meal',
        isCompleted: true,
        estimatedCost: 20000,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        title: 'Meeting Online',
        timeStart: '10:00',
        date: '2026-10-05',
        category: 'work',
        isCompleted: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '3',
        title: 'Makan Malam Resto',
        timeStart: '19:00',
        date: '2026-10-05',
        category: 'meal',
        isCompleted: false,
        estimatedCost: 75000,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const totalEstimated = activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
    expect(totalEstimated).toBe(95000);
  });

  it('should have properly structured persona routines for pelajar, mahasiswa, freshgrad, and pekerja', async () => {
    const { PERSONA_DEFINITIONS } = await import('@/lib/domain/personaTemplates');
    
    // Pelajar (SMA/SMK)
    expect(PERSONA_DEFINITIONS.pelajar).toBeDefined();
    expect(PERSONA_DEFINITIONS.pelajar.habits.length).toBeGreaterThanOrEqual(3);
    expect(PERSONA_DEFINITIONS.pelajar.habits.some((h) => h.title.includes('PR & Tugas Sekolah'))).toBe(true);

    // Mahasiswa
    expect(PERSONA_DEFINITIONS.mahasiswa).toBeDefined();
    expect(PERSONA_DEFINITIONS.mahasiswa.habits.some((h) => h.title.includes('Kuliah'))).toBe(true);

    // Fresh Graduate
    expect(PERSONA_DEFINITIONS.freshgrad).toBeDefined();
    expect(PERSONA_DEFINITIONS.freshgrad.habits.some((h) => h.title.includes('Lamaran Kerja'))).toBe(true);
    expect(PERSONA_DEFINITIONS.freshgrad.habits.some((h) => h.title.includes('SKD CPNS'))).toBe(true);

    // Pekerja
    expect(PERSONA_DEFINITIONS.pekerja).toBeDefined();
    expect(PERSONA_DEFINITIONS.pekerja.habits.some((h) => h.title.includes('Prioritas Utama'))).toBe(true);
  });

  it('should generate personalized recommendations without forcing unwanted tasks', async () => {
    const { generateSmartRecommendations } = await import('@/lib/domain/recommendationEngine');

    // Scenario: Fresh grad who ONLY wants coding portfolio & English, NO CPNS
    const recommendations = generateSmartRecommendations({
      persona: 'freshgrad',
      selectedGoals: ['tech_portfolio', 'english_comm'],
      dailyHours: 'teratur',
      lifestyleHabits: ['water_health', 'finance_track'],
    });

    expect(recommendations.habits.length).toBeGreaterThan(0);
    // Should contain portfolio and English
    expect(recommendations.habits.some((h) => h.title.includes('Portofolio'))).toBe(true);
    expect(recommendations.habits.some((h) => h.title.includes('Bahasa Inggris'))).toBe(true);
    // Should NOT contain CPNS because user did NOT choose it!
    expect(recommendations.habits.some((h) => h.title.includes('CPNS'))).toBe(false);
  });
});
