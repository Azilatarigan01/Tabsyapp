import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tabsy - Catat Pengeluaran & Split Bill Kilat',
    short_name: 'Tabsy',
    description: 'Catat pengeluaran harian kilat dan hitung split bill patungan makan. 100% offline-first dan aman di browser.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0284c7',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
