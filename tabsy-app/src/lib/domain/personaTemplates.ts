import { UserPersona, ActivityCategory } from '@/types';
import { addDailyHabit, addDailyActivity, getDailyHabits, getDailyActivities } from '@/lib/db';

export interface PersonaDefinition {
  id: UserPersona;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  defaultBudget: number;
  description: string;
  habits: {
    title: string;
    icon: string;
    category: 'health' | 'finance' | 'productivity' | 'mindfulness';
  }[];
  agendas: {
    title: string;
    timeStart: string;
    timeEnd: string;
    category: ActivityCategory;
    notes: string;
  }[];
}

export const PERSONA_DEFINITIONS: Record<UserPersona, PersonaDefinition> = {
  pelajar: {
    id: 'pelajar',
    title: 'Pelajar (SMA / SMK / SMP)',
    subtitle: 'Fokus belajar, PR sekolah, ekskul & kelola uang saku',
    icon: '🎒',
    badge: 'Pelajar Berprestasi',
    defaultBudget: 500000,
    description: 'Rutinitas teratur untuk anak sekolah: bangun pagi tepat waktu, PR tuntas, dan hemat uang jajan harian.',
    habits: [
      { title: 'Selesaikan PR & Tugas Sekolah Hari Ini', icon: '📝', category: 'productivity' },
      { title: 'Bangun Pagi & Siap Sekolah (05:30)', icon: '⏰', category: 'health' },
      { title: 'Ulangi Materi Pelajaran (30 Menit)', icon: '📚', category: 'productivity' },
      { title: 'Minum Air 2 Liter & Istirahat Cukup', icon: '💧', category: 'health' },
      { title: 'Catat Uang Saku & Sisa Jajan Harian', icon: '💰', category: 'finance' },
    ],
    agendas: [
      { title: 'KBM / Jam Masuk Sekolah', timeStart: '07:00', timeEnd: '14:30', category: 'study', notes: 'Fokus mendengarkan penjelasan guru di kelas' },
      { title: 'Ekskul / Olahraga Sore', timeStart: '15:30', timeEnd: '17:00', category: 'health', notes: 'Kegiatan ekstrakurikuler sekolah' },
      { title: 'Belajar Mandiri & Kerjakan PR', timeStart: '19:30', timeEnd: '21:00', category: 'study', notes: 'Persiapan materi pelajaran untuk besok' },
    ],
  },
  mahasiswa: {
    id: 'mahasiswa',
    title: 'Mahasiswa / Mahasiswi',
    subtitle: 'Jadwal kuliah, tugas matkul, skripsi & hemat kostan',
    icon: '🎓',
    badge: 'Mahasiswa Produktif',
    defaultBudget: 1500000,
    description: 'Manajemen waktu seimbang antara jam kuliah, organisasi, tugas kelompok, dan menjaga pengeluaran bulanan anak kost.',
    habits: [
      { title: 'Cek Jadwal & Materi Kuliah Hari Ini', icon: '📖', category: 'productivity' },
      { title: 'Kerjakan Tugas Matkul / Progres Skripsi (1 Jam)', icon: '💻', category: 'productivity' },
      { title: 'Review Pengeluaran & Hemat Budget Kost', icon: '🪙', category: 'finance' },
      { title: 'Baca Referensi / Jurnal Akademik (20m)', icon: '📑', category: 'mindfulness' },
      { title: 'Tidur Tepat Waktu (Hindari Begadang Sia-sia)', icon: '🌙', category: 'health' },
    ],
    agendas: [
      { title: 'Sesi Perkuliahan Kampus', timeStart: '08:30', timeEnd: '12:00', category: 'study', notes: 'Kuliah tatap muka / lab praktikum' },
      { title: 'Kerjakan Tugas di Perpustakaan / Kost', timeStart: '13:30', timeEnd: '15:30', category: 'study', notes: 'Fokus selesaikan deadline tugas kelompok' },
      { title: 'Organisasi Kampus / Belajar Mandiri', timeStart: '16:30', timeEnd: '18:00', category: 'leisure', notes: 'Diskusi komunitas atau rapat himpunan' },
    ],
  },
  freshgrad: {
    id: 'freshgrad',
    title: 'Fresh Graduate / Pejuang Karir',
    subtitle: 'Lamar 3 loker, SKD CPNS, portofolio skill & bahasa Inggris',
    icon: '💼',
    badge: 'Pejuang Karir Impian',
    defaultBudget: 2000000,
    description: 'Paket konsistensi maksimal untuk lolos kerja: kirim lamaran setiap hari, latihan soal CPNS/BUMN, dan koding/portofolio skill.',
    habits: [
      { title: 'Kirim Minimal 3 Lamaran Kerja (Job Portal/LinkedIn)', icon: '💼', category: 'productivity' },
      { title: 'Latihan 30 Soal SKD CPNS (TWK / TIU / TKP)', icon: '📚', category: 'productivity' },
      { title: 'Asah Skill / Portofolio Praktek (1 Jam Fokus)', icon: '💻', category: 'productivity' },
      { title: 'Belajar Bahasa Inggris (Vocab & Listening 20m)', icon: '🇬🇧', category: 'mindfulness' },
      { title: 'Review & Optimasi CV ATS', icon: '📄', category: 'productivity' },
    ],
    agendas: [
      { title: 'Simulasi Latihan Soal CPNS / BUMN', timeStart: '08:30', timeEnd: '10:00', category: 'study', notes: 'Fokus soal TIU & pembahasan materi' },
      { title: 'Job Hunting & Kirim Lamaran Pekerjaan', timeStart: '10:30', timeEnd: '12:00', category: 'work', notes: 'Sesuaikan Cover Letter & portofolio link' },
      { title: 'Praktek Portofolio Project (Koding/Desain/Analisis)', timeStart: '13:30', timeEnd: '15:30', category: 'work', notes: 'Dokumentasikan hasil di GitHub / LinkedIn' },
      { title: 'English Practice (Speaking / Listening Podcast)', timeStart: '16:00', timeEnd: '17:00', category: 'study', notes: 'Latihan mendengarkan materi bahasa Inggris' },
    ],
  },
  pekerja: {
    id: 'pekerja',
    title: 'Pekerja / Karyawan / Freelancer',
    subtitle: 'Deep work, deadline kantor, sehat bugar & catat biaya',
    icon: '🏢',
    badge: 'Profesional Handal',
    defaultBudget: 5000000,
    description: 'Menjaga ritme kerja profesional: selesaikan prioritas utama tanpa burnout, kontrol makan siang, dan olahraga peregangan.',
    habits: [
      { title: 'Tuntaskan 3 Prioritas Utama Kerja (Top 3 Tasks)', icon: '🎯', category: 'productivity' },
      { title: 'Inbox Zero & Balas Pesan Penting Klien/Tim', icon: '📧', category: 'productivity' },
      { title: 'Jalan Kaki / Peregangan Badan 15 Menit', icon: '🚶', category: 'health' },
      { title: 'Catat Pengeluaran Makan Siang & Transport Kantor', icon: '💳', category: 'finance' },
      { title: 'Detoks Layar Gadget 30 Menit Sebelum Tidur', icon: '📵', category: 'mindfulness' },
    ],
    agendas: [
      { title: 'Deep Work: Fokus Project Utama', timeStart: '09:00', timeEnd: '12:00', category: 'work', notes: 'Blok waktu tanpa gangguan untuk tugas dengan prioritas tinggi' },
      { title: 'Koordinasi Tim & Meeting Evaluasi', timeStart: '13:30', timeEnd: '15:00', category: 'work', notes: 'Sinkronisasi rencana kerja bersama tim' },
      { title: 'Finishing Tugas & Rekap Agenda Besok', timeStart: '16:30', timeEnd: '17:30', category: 'work', notes: 'Rangkum hasil kerja dan rencanakan prioritas besok' },
    ],
  },
  wirausaha: {
    id: 'wirausaha',
    title: 'Wirausaha / Pebisnis / UMKM',
    subtitle: 'Arus kas bisnis, cek stok produk, promosi & pelayanan',
    icon: '🏪',
    badge: 'Pengusaha Sukses',
    defaultBudget: 7500000,
    description: 'Disiplin mengelola operasional usaha sendiri: pembukuan arus kas harian, pemasaran aktif, dan stok barang.',
    habits: [
      { title: 'Rekap Omzet & Arus Kas Bisnis Hari Ini', icon: '📊', category: 'finance' },
      { title: 'Cek Stok Produk & Kebutuhan Operasional', icon: '📦', category: 'productivity' },
      { title: 'Post Konten Promosi Media Sosial / Marketplace', icon: '📱', category: 'productivity' },
      { title: 'Follow-up Konsumen & Review Layanan', icon: '🤝', category: 'productivity' },
      { title: 'Evaluasi Strategi Penjualan Mingguan', icon: '💡', category: 'mindfulness' },
    ],
    agendas: [
      { title: 'Operasional Pagi & Cek Orderan Konsumen', timeStart: '08:30', timeEnd: '10:30', category: 'work', notes: 'Packing barang atau persiapan buka toko' },
      { title: 'Pemasaran & Konten Promosi', timeStart: '13:00', timeEnd: '15:00', category: 'work', notes: 'Promosi online dan follow-up prospek pelanggan' },
      { title: 'Tutup Buku Harian & Evaluasi Pendapatan', timeStart: '17:00', timeEnd: '18:30', category: 'work', notes: 'Hitung kas masuk dan catat belanja operasional' },
    ],
  },
  custom: {
    id: 'custom',
    title: 'Kustomisasi Bebas Sendiri',
    subtitle: 'Buat rutinitas unik sesuai gaya hidup dan impianmu',
    icon: '🎯',
    badge: 'Penjelajah Rutinitas',
    defaultBudget: 3500000,
    description: 'Mulai dari halaman kosong dan tentukan sendiri kebiasaan apa saja yang ingin kamu bangun setiap hari.',
    habits: [
      { title: 'Minum Air Putih 2 Liter Sehari', icon: '💧', category: 'health' },
      { title: 'Catat Semua Pengeluaran Hari Ini di Tabsy', icon: '⚡', category: 'finance' },
      { title: 'Membaca Buku / Artikel Edukatif 15 Menit', icon: '📖', category: 'mindfulness' },
    ],
    agendas: [
      { title: 'Fokus Kegiatan Utama Hari Ini', timeStart: '09:00', timeEnd: '12:00', category: 'work', notes: 'Waktu produktif untuk tujuan terpentingmu' },
      { title: 'Waktu Istirahat & Relaksasi', timeStart: '16:00', timeEnd: '17:30', category: 'leisure', notes: 'Olahraga ringan atau kumpul bersama teman' },
    ],
  },
};

/**
 * Loads starter habits and agendas for a given persona into IndexedDB
 */
export async function applyPersonaStarterRoutines(
  persona: UserPersona,
  date: string
): Promise<{ addedHabits: number; addedAgendas: number }> {
  const def = PERSONA_DEFINITIONS[persona] || PERSONA_DEFINITIONS.custom;

  // 1. Add habits if not existing
  const existingHabits = await getDailyHabits();
  let addedHabits = 0;
  for (const h of def.habits) {
    const exists = existingHabits.some((item) => item.title.toLowerCase() === h.title.toLowerCase());
    if (!exists) {
      await addDailyHabit({
        title: h.title,
        icon: h.icon,
        category: h.category,
        targetFrequency: 'daily',
      });
      addedHabits++;
    }
  }

  // 2. Add agendas if not existing
  const existingActivities = await getDailyActivities(date);
  let addedAgendas = 0;
  for (const a of def.agendas) {
    const exists = existingActivities.some((item) => item.title.toLowerCase() === a.title.toLowerCase());
    if (!exists) {
      await addDailyActivity({
        title: a.title,
        timeStart: a.timeStart,
        timeEnd: a.timeEnd,
        date: date,
        category: a.category,
        isCompleted: false,
        notes: a.notes,
      });
      addedAgendas++;
    }
  }

  return { addedHabits, addedAgendas };
}

/**
 * Saves customized user-approved habits and agendas into IndexedDB,
 * scoped strictly to the user without forcing fixed unwanted tasks.
 */
export async function applyCustomUserRoutines(params: {
  habits: { title: string; icon: string; category: 'health' | 'finance' | 'productivity' | 'mindfulness' }[];
  agendas: { title: string; timeStart: string; timeEnd: string; category: ActivityCategory; notes: string }[];
  date: string;
  userId?: string;
}): Promise<{ addedHabits: number; addedAgendas: number }> {
  let addedHabits = 0;
  for (const h of params.habits) {
    await addDailyHabit({
      userId: params.userId,
      title: h.title,
      icon: h.icon,
      category: h.category,
      targetFrequency: 'daily',
    });
    addedHabits++;
  }

  let addedAgendas = 0;
  for (const a of params.agendas) {
    await addDailyActivity({
      userId: params.userId,
      title: a.title,
      timeStart: a.timeStart,
      timeEnd: a.timeEnd,
      date: params.date,
      category: a.category,
      isCompleted: false,
      notes: a.notes,
    });
    addedAgendas++;
  }

  return { addedHabits, addedAgendas };
}
