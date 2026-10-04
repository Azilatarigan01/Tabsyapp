import { createWorker, Worker } from 'tesseract.js';
import { OcrProgressState } from '@/types/ocr';

export interface OcrEngineOptions {
  language?: string; // default 'ind+eng' or 'eng'
  onProgress?: (progress: OcrProgressState) => void;
  cancellationToken?: { isCancelled: boolean };
}

export interface OcrRecognitionResult {
  text: string;
  confidence: number;
  lines: string[];
}

let activeWorker: Worker | null = null;

/**
 * Checks if Tesseract traineddata or worker is likely cached in browser
 */
export async function checkOfflineOcrReady(): Promise<boolean> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return false;
  }
  try {
    // Tesseract.js caches traineddata in IndexedDB named 'tesseract'
    const databases = await indexedDB.databases?.();
    if (databases && databases.some((db) => db.name?.includes('tesseract'))) {
      return true;
    }
    // Also check CacheStorage
    if ('caches' in window) {
      const keys = await caches.keys();
      return keys.some((k) => k.toLowerCase().includes('tesseract'));
    }
  } catch {
    // If not supported or restricted, assume false
  }
  return false;
}

/**
 * Recognizes text from image via Tesseract.js Worker with cancellation and progress
 */
export async function runOcrOnImage(
  imageSource: string | HTMLCanvasElement | Blob,
  options: OcrEngineOptions = {}
): Promise<OcrRecognitionResult> {
  const { onProgress, cancellationToken } = options;

  const updateProgress = (status: OcrProgressState['status'], progress: number, message: string) => {
    if (onProgress && (!cancellationToken || !cancellationToken.isCancelled)) {
      onProgress({ status, progress, message });
    }
  };

  try {
    updateProgress('loading_worker', 10, 'Menyiapkan modul OCR lokal...');

    if (cancellationToken?.isCancelled) {
      throw new Error('Proses OCR dibatalkan oleh pengguna.');
    }

    // Terminate any leftover worker
    if (activeWorker) {
      try {
        await activeWorker.terminate();
      } catch {
        // Ignore
      }
      activeWorker = null;
    }

    // Initialize worker with progress logger
    const worker = await createWorker('eng+ind', 1, {
      logger: (m) => {
        if (cancellationToken?.isCancelled) return;

        if (m.status === 'loading tesseract core') {
          updateProgress('loading_worker', 20, 'Memuat mesin Tesseract core...');
        } else if (m.status === 'loading language traineddata') {
          const pct = Math.round(20 + (m.progress || 0) * 30);
          updateProgress('loading_worker', pct, 'Memuat model bahasa (Indonesia/Inggris)...');
        } else if (m.status === 'initializing api') {
          updateProgress('loading_worker', 55, 'Menginisialisasi OCR API...');
        } else if (m.status === 'recognizing text') {
          const pct = Math.round(60 + (m.progress || 0) * 35);
          updateProgress('recognizing', pct, `Mengenali teks struk... ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
    });

    activeWorker = worker;

    if (cancellationToken?.isCancelled) {
      await terminateActiveOcr();
      throw new Error('Proses OCR dibatalkan oleh pengguna.');
    }

    updateProgress('recognizing', 65, 'Menganalisis teks pada gambar struk...');

    // Perform recognition
    const ret = await worker.recognize(imageSource);

    if (cancellationToken?.isCancelled) {
      await terminateActiveOcr();
      throw new Error('Proses OCR dibatalkan oleh pengguna.');
    }

    updateProgress('parsing', 96, 'Mengekstrak data struk...');

    const text = ret.data.text || '';
    const confidence = ret.data.confidence || 0;
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    updateProgress('completed', 100, 'Ekstraksi struk selesai!');

    return {
      text,
      confidence,
      lines,
    };
  } catch (error: any) {
    if (cancellationToken?.isCancelled || error?.message?.includes('dibatalkan')) {
      updateProgress('cancelled', 0, 'Pemindaian dibatalkan.');
      throw new Error('Pemindaian dibatalkan.');
    }
    updateProgress('error', 0, `Gagal memindai struk: ${error?.message || 'Error OCR tidak dikenal'}`);
    throw error;
  } finally {
    // Keep worker around or terminate cleanly if cancelled
    if (cancellationToken?.isCancelled) {
      await terminateActiveOcr();
    }
  }
}

/**
 * Terminates any active OCR worker immediately
 */
export async function terminateActiveOcr(): Promise<void> {
  if (activeWorker) {
    try {
      await activeWorker.terminate();
    } catch {
      // Ignore
    }
    activeWorker = null;
  }
}
