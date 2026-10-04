'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('CatatCepat PWA Service Worker terdaftar:', reg.scope);
          })
          .catch((err) => {
            console.warn('Gagal mendaftarkan Service Worker:', err);
          });
      });
    }
  }, []);

  return null;
}
