import { FileValidationResult, SupportedImageFormat } from '@/types/ocr';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_DIMENSION = 2048; // Max width or height for conservative resizing

/**
 * Validates the uploaded file format and size
 */
export function validateReceiptImageFile(file: File): FileValidationResult {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Check for PDF or HEIC/HEIF files
  if (
    fileType === 'application/pdf' ||
    fileName.endsWith('.pdf') ||
    fileType === 'image/heic' ||
    fileType === 'image/heif' ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif')
  ) {
    return {
      valid: false,
      isUnsupportedHeicOrPdf: true,
      error:
        'Format PDF dan HEIC saat ini belum didukung secara langsung. Harap ambil foto ulang atau konversi/screenshot menjadi format JPG, PNG, atau WebP.',
    };
  }

  // Validate allowed MIME types
  const supportedTypes: SupportedImageFormat[] = ['image/jpeg', 'image/png', 'image/webp'];
  const isExtensionValid =
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.webp');

  if (!supportedTypes.includes(fileType as SupportedImageFormat) && !isExtensionValid) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Mohon gunakan format gambar JPG, PNG, atau WebP.',
    };
  }

  // Validate file size (max 5 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran file terlalu besar (${sizeInMb} MB). Maksimal ukuran file yang diperbolehkan adalah 5 MB.`,
    };
  }

  return {
    valid: true,
    file,
  };
}

export interface ProcessedImageResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Preprocesses an image via Canvas API:
 * 1. Conservative downscaling (maintaining aspect ratio up to MAX_IMAGE_DIMENSION)
 * 2. Arbitrary rotation (0, 90, 180, 270 degrees)
 * 3. Contrast enhancement & subtle grayscale filter to optimize OCR clarity
 */
export async function preprocessReceiptImage(
  imageSource: HTMLImageElement | File | Blob | string,
  rotationDegrees: number = 0,
  enhanceContrast: boolean = true
): Promise<ProcessedImageResult> {
  // If source is a File, Blob, or string dataUrl, load it into an HTMLImageElement
  let img: HTMLImageElement;
  if (imageSource instanceof HTMLImageElement) {
    img = imageSource;
  } else if (typeof imageSource === 'string') {
    img = await loadImageFromUrl(imageSource);
  } else {
    img = await loadImageFromBlob(imageSource);
  }

  // Calculate scaled dimensions conservatively
  let srcWidth = img.naturalWidth || img.width;
  let srcHeight = img.naturalHeight || img.height;

  let targetWidth = srcWidth;
  let targetHeight = srcHeight;

  if (targetWidth > MAX_IMAGE_DIMENSION || targetHeight > MAX_IMAGE_DIMENSION) {
    const ratio = Math.min(MAX_IMAGE_DIMENSION / targetWidth, MAX_IMAGE_DIMENSION / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal menginisialisasi Canvas 2D Context pada browser.');
  }

  // Normalize rotation to 0, 90, 180, 270
  const normalizedRotation = ((rotationDegrees % 360) + 360) % 360;
  const isSwapped = normalizedRotation === 90 || normalizedRotation === 270;

  canvas.width = isSwapped ? targetHeight : targetWidth;
  canvas.height = isSwapped ? targetWidth : targetHeight;

  // Clear background to white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply transformations
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalizedRotation * Math.PI) / 180);
  ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();

  // Optional: Enhance contrast & grayscale to optimize Tesseract OCR text recognition
  if (enhanceContrast) {
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      // Simple contrast & thresholding
      for (let i = 0; i < data.length; i += 4) {
        // Luminance formula
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Mild contrast stretch
        const factor = 1.15;
        const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
        data[i] = enhanced;
        data[i + 1] = enhanced;
        data[i + 2] = enhanced;
      }
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Ignore security/taint issues if any
    }
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Gagal mengonversi canvas ke Blob.'));
      },
      'image/jpeg',
      0.92
    );
  });

  return {
    canvas,
    dataUrl,
    blob,
    width: canvas.width,
    height: canvas.height,
    rotation: normalizedRotation,
  };
}

function loadImageFromBlob(blob: Blob | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal memuat gambar struk. File mungkin rusak.'));
    };
    img.src = url;
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar struk dari preview.'));
    img.src = url;
  });
}
