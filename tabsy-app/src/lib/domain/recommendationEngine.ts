import { UserPersona, ActivityCategory } from '@/types';

export interface SmartQuizAnswers {
  persona: UserPersona;
  selectedGoals: string[];
  dailyHours: 'santai' | 'teratur' | 'intensif';
  lifestyleHabits: string[];
  customGoalNote?: string;
}

export interface RecommendedHabitItem {
  id: string;
  title: string;
  icon: string;
  category: 'health' | 'finance' | 'productivity' | 'mindfulness';
  selected: boolean;
  reason: string;
}

export interface RecommendedAgendaItem {
  id: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  category: ActivityCategory;
  notes: string;
  selected: boolean;
  reason: string;
}

export interface SmartRecommendationResult {
  headline: string;
  summary: string;
  habits: RecommendedHabitItem[];
  agendas: RecommendedAgendaItem[];
}

export const QUIZ_GOAL_OPTIONS: Record<UserPersona, { id: string; label: string; icon: string; desc: string }[]> = {
  freshgrad: [
    { id: 'job_apply', label: 'Lamar Kerja Aktif', icon: '💼', desc: 'Kirim CV & portofolio ke minimal 3 loker per hari' },
    { id: 'cpns_bumn', label: 'Persiapan Tes CPNS / BUMN', icon: '🏛️', desc: 'Latihan soal SKD (TWK, TIU, TKP) berkala' },
    { id: 'tech_portfolio', label: 'Bangun Portofolio & Praktek', icon: '💻', desc: 'Bikin project koding/desain nyata untuk bukti skill' },
    { id: 'english_comm', label: 'Asah Bahasa Inggris', icon: '🇬🇧', desc: 'Vocabulary, listening podcast, atau persiapan IELTS' },
    { id: 'freelance_side', label: 'Mulai Freelance / Kerja Lepas', icon: '🚀', desc: 'Cari klien pertama atau jasa sampingan' },
    { id: 'custom_explore', label: 'Eksplorasi Minat Sendiri', icon: '🔍', desc: 'Membaca buku karir & menentukan arah minat' },
  ],
  pelajar: [
    { id: 'school_homework', label: 'Tuntaskan PR & Tugas Sekolah', icon: '📝', desc: 'Selesaikan tugas tepat waktu tanpa menunda' },
    { id: 'exam_prep', label: 'Persiapan Ujian / Nilai Rapor', icon: '📚', desc: 'Ulangi materi pelajaran 30 menit setiap malam' },
    { id: 'ekskul_sport', label: 'Ekskul & Kegiatan Fisik', icon: '⚽', desc: 'Ikut ekstrakurikuler atau olahraga sekolah' },
    { id: 'pocket_money', label: 'Kelola Uang Saku Harian', icon: '💰', desc: 'Catat jajan dan sisihkan tabungan celengan' },
  ],
  mahasiswa: [
    { id: 'thesis_progress', label: 'Progres Skripsi & Tugas Matkul', icon: '🎓', desc: 'Fokus 1-2 jam per hari untuk riset atau deadline' },
    { id: 'college_lecture', label: 'Jadwal Kuliah & Praktikum', icon: '🏫', desc: 'Hadir tepat waktu dan catat materi penting' },
    { id: 'organization', label: 'Organisasi & Komunitas Kampus', icon: '🤝', desc: 'Rapat himpunan, panitia, atau seminar' },
    { id: 'dorm_budget', label: 'Disiplin Finansial Anak Kost', icon: '🪙', desc: 'Kontrol uang makan & hemat biaya bulanan' },
  ],
  pekerja: [
    { id: 'work_priorities', label: 'Tuntaskan Top 3 Prioritas Kerja', icon: '🎯', desc: 'Deep work selesaikan tugas paling bernilai tinggi' },
    { id: 'career_upskill', label: 'Tingkatkan Skill Profesional', icon: '📈', desc: 'Belajar sertifikasi atau tren industri terkini' },
    { id: 'burnout_prevention', label: 'Cegah Burnout & Jaga Istirahat', icon: '🧘', desc: 'Peregangan badan dan pulang kerja tepat waktu' },
    { id: 'salary_allocation', label: 'Alokasi Gaji & Dana Darurat', icon: '💳', desc: 'Catat pengeluaran dan disiplin pos anggaran' },
  ],
  wirausaha: [
    { id: 'daily_cashflow', label: 'Cek Cashflow & Penjualan Hari Ini', icon: '📊', desc: 'Rekap omzet, biaya operasional, dan profit' },
    { id: 'business_promo', label: 'Marketing & Promosi Bisnis', icon: '📢', desc: 'Posting konten promosi atau follow-up prospek pelanggan' },
    { id: 'ops_improvement', label: 'Kelola Stok & Layanan Konsumen', icon: '📦', desc: 'Pastikan pesanan dikirim cepat & pembeli puas' },
  ],
  custom: [
    { id: 'self_discipline', label: 'Membangun Kebiasaan Positif', icon: '🌱', desc: 'Rutinitas harian teratur langkah demi langkah' },
    { id: 'daily_tracking', label: 'Pencatatan Keuangan Disiplin', icon: '⚡', desc: 'Catat pengeluaran secara konsisten' },
    { id: 'personal_learning', label: 'Belajar & Pengembangan Diri', icon: '💡', desc: 'Waktu khusus membaca atau eksplorasi skill' },
  ],
};

export const QUIZ_LIFESTYLE_OPTIONS = [
  { id: 'water_health', label: 'Kesehatan Fisik (Air 2L & Olahraga)', icon: '💧' },
  { id: 'finance_track', label: 'Disiplin Finansial (Catat Biaya Harian)', icon: '💰' },
  { id: 'sleep_rest', label: 'Tidur Teratur & Anti Begadang', icon: '🌙' },
  { id: 'mind_calm', label: 'Ketenangan Pikiran & Meditasi/Doa', icon: '🧘' },
];

/**
 * AI-Inspired Smart Rule Engine to generate recommended habits and agendas
 * based directly on the user's questionnaire choices.
 */
export function generateSmartRecommendations(answers: SmartQuizAnswers): SmartRecommendationResult {
  const habits: RecommendedHabitItem[] = [];
  const agendas: RecommendedAgendaItem[] = [];

  const { persona, selectedGoals, dailyHours, lifestyleHabits, customGoalNote } = answers;

  // 1. Goal-driven habits & agendas
  if (selectedGoals.includes('job_apply')) {
    habits.push({
      id: 'rec-hab-job-apply',
      title: 'Kirim Minimal 3 Lamaran Kerja',
      icon: '💼',
      category: 'productivity',
      selected: true,
      reason: 'Berdasarkan target melamar kerja aktif',
    });
    habits.push({
      id: 'rec-hab-cv-update',
      title: 'Cek & Sesuaikan CV ATS untuk Loker Baru',
      icon: '📄',
      category: 'productivity',
      selected: true,
      reason: 'Meningkatkan peluang lolos screening HR',
    });
    agendas.push({
      id: 'rec-act-job-hunting',
      title: 'Job Hunting & Kirim Lamaran Pekerjaan',
      timeStart: dailyHours === 'santai' ? '10:00' : '09:30',
      timeEnd: dailyHours === 'santai' ? '11:00' : '11:30',
      category: 'work',
      notes: 'Buka LinkedIn, Jobstreet, atau situs karir perusahaan incaran',
      selected: true,
      reason: 'Jadwal terfokus untuk submit lamaran',
    });
  }

  if (selectedGoals.includes('cpns_bumn')) {
    habits.push({
      id: 'rec-hab-cpns',
      title: 'Latihan 25-30 Soal SKD (TWK / TIU / TKP)',
      icon: '🏛️',
      category: 'productivity',
      selected: true,
      reason: 'Berdasarkan fokus persiapan tes CPNS/BUMN',
    });
    agendas.push({
      id: 'rec-act-cpns-drill',
      title: 'Sesi Latihan Soal & Pembahasan SKD',
      timeStart: '13:30',
      timeEnd: dailyHours === 'intensif' ? '15:30' : '14:45',
      category: 'study',
      notes: 'Kerjakan tryout dan evaluasi nomor yang salah',
      selected: true,
      reason: 'Simulasi ujian berkala untuk melatih kecepatan',
    });
  }

  if (selectedGoals.includes('tech_portfolio')) {
    habits.push({
      id: 'rec-hab-portfolio',
      title: 'Praktek Portofolio / Koding / Desain',
      icon: '💻',
      category: 'productivity',
      selected: true,
      reason: 'Berdasarkan fokus membangun bukti keahlian',
    });
    agendas.push({
      id: 'rec-act-tech-dev',
      title: 'Progres Project Portofolio Mandiri',
      timeStart: dailyHours === 'intensif' ? '14:00' : '15:00',
      timeEnd: dailyHours === 'intensif' ? '17:00' : '16:30',
      category: 'work',
      notes: 'Bangun fitur baru dan commit ke GitHub/Behance',
      selected: true,
      reason: 'Bukti nyata untuk ditunjukkan saat interview kerja',
    });
  }

  if (selectedGoals.includes('english_comm')) {
    habits.push({
      id: 'rec-hab-english',
      title: 'Belajar Bahasa Inggris 20 Menit (Listening / Vocab)',
      icon: '🇬🇧',
      category: 'mindfulness',
      selected: true,
      reason: 'Berdasarkan target peningkatan bahasa asing',
    });
    agendas.push({
      id: 'rec-act-english',
      title: 'English Immersion (Podcast / Reading / Speaking)',
      timeStart: '19:30',
      timeEnd: '20:15',
      category: 'study',
      notes: 'Latihan mendengarkan podcast atau berbicara 1 topik',
      selected: true,
      reason: 'Melatih refleks komunikasi bahasa Inggris',
    });
  }

  if (selectedGoals.includes('thesis_progress') || selectedGoals.includes('exam_prep') || selectedGoals.includes('school_homework')) {
    habits.push({
      id: 'rec-hab-academic',
      title: 'Fokus Belajar / Kerjakan Tugas Akademik',
      icon: '📚',
      category: 'productivity',
      selected: true,
      reason: 'Berdasarkan komitmen akademik',
    });
    agendas.push({
      id: 'rec-act-academic',
      title: 'Sesi Belajar & Penyelesaian Tugas',
      timeStart: '14:00',
      timeEnd: '16:00',
      category: 'study',
      notes: 'Tuntaskan deadline tugas terdekat',
      selected: true,
      reason: 'Waktu khusus tanpa distraksi',
    });
  }

  if (selectedGoals.includes('work_priorities')) {
    habits.push({
      id: 'rec-hab-top3',
      title: 'Tuntaskan Top 3 Prioritas Kerja Hari Ini',
      icon: '🎯',
      category: 'productivity',
      selected: true,
      reason: 'Fokus efisiensi kerja profesional',
    });
    agendas.push({
      id: 'rec-act-deepwork',
      title: 'Deep Work: Eksekusi Tugas Utama Kantor',
      timeStart: '09:00',
      timeEnd: '12:00',
      category: 'work',
      notes: 'Selesaikan tugas paling berdampak sebelum istirahat siang',
      selected: true,
      reason: 'Sesi paling produktif di pagi hari',
    });
  }

  // 2. Lifestyle Habits
  if (lifestyleHabits.includes('water_health')) {
    habits.push({
      id: 'rec-hab-water',
      title: 'Minum 2 Liter Air Putih & Olahraga Ringan',
      icon: '💧',
      category: 'health',
      selected: true,
      reason: 'Menjaga stamina & kebugaran tubuh',
    });
  }

  if (lifestyleHabits.includes('finance_track')) {
    habits.push({
      id: 'rec-hab-finance',
      title: 'Catat Semua Pengeluaran Hari Ini di Tabsy',
      icon: '⚡',
      category: 'finance',
      selected: true,
      reason: 'Menjaga selisih Rp0 dan mengontrol batas belanja',
    });
  }

  if (lifestyleHabits.includes('sleep_rest')) {
    habits.push({
      id: 'rec-hab-sleep',
      title: 'Tidur Tepat Waktu (Maksimal 23:00)',
      icon: '🌙',
      category: 'health',
      selected: true,
      reason: 'Bangun lebih segar dan bugar keesokan hari',
    });
  }

  if (lifestyleHabits.includes('mind_calm')) {
    habits.push({
      id: 'rec-hab-mind',
      title: 'Jeda Santai & Meditasi / Doa 10 Menit',
      icon: '🧘',
      category: 'mindfulness',
      selected: true,
      reason: 'Menjaga fokus mental dan mencegah cemas berlebih',
    });
  }

  // 3. Custom user note if provided
  if (customGoalNote && customGoalNote.trim()) {
    habits.push({
      id: 'rec-hab-custom',
      title: customGoalNote.trim(),
      icon: '⭐',
      category: 'productivity',
      selected: true,
      reason: 'Target personal yang kamu ketik langsung',
    });
  }

  // Fallback defaults if user picked nothing
  if (habits.length === 0) {
    habits.push({
      id: 'rec-hab-default-1',
      title: 'Tentukan 1 Target Utama Hari Ini',
      icon: '🎯',
      category: 'productivity',
      selected: true,
      reason: 'Dasar produktivitas harian',
    });
    habits.push({
      id: 'rec-hab-default-2',
      title: 'Catat Pengeluaran di Tabsy',
      icon: '⚡',
      category: 'finance',
      selected: true,
      reason: 'Disiplin finansial',
    });
  }

  let headline = 'Rekomendasi Rutinitas Disesuaikan Khusus Untukmu';
  let summary = `Kami merancang ${habits.length} kebiasaan dan ${agendas.length} jadwal terarah berdasarkan pilihan fokus kamu. Kamu memiliki kebebasan penuh untuk memilih mana yang ingin kamu simpan, menambah baru, atau memulai dari nol.`;

  return {
    headline,
    summary,
    habits,
    agendas,
  };
}
