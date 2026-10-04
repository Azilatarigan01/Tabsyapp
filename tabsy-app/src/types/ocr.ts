export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number; // Unit price
  total: number; // Line total = quantity * price
}

export interface ReceiptParseResult {
  merchantName: string;
  date: string; // YYYY-MM-DD or empty if not detected
  items: ReceiptItem[];
  subtotal: number;
  discount: number; // Pre-tax promotional discount
  tax: number; // PPN / PB1 / Tax
  service: number; // Service charge
  total: number; // Final grand total printed on receipt
  calculatedTotal: number; // items sum - discount + tax + service
  discrepancy: number; // calculatedTotal - total
  isReconciled: boolean; // true if discrepancy === 0
  rawText: string;
  confidenceScore?: number;
}

export type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  isUnsupportedHeicOrPdf?: boolean;
  file?: File;
}

export interface OcrProgressState {
  status: 'idle' | 'preprocessing' | 'loading_worker' | 'recognizing' | 'parsing' | 'completed' | 'cancelled' | 'error';
  progress: number; // 0 to 100
  message: string;
}

export interface ReceiptEvaluationCase {
  id: string;
  type: 'development' | 'evaluation';
  description: string;
  category: 'clear' | 'blurry' | 'rotated' | 'discount' | 'complex_number' | 'duplicate_line';
  rawText: string;
  groundTruth: {
    merchantName: string;
    date: string; // YYYY-MM-DD
    itemCount: number;
    subtotal: number;
    discount: number;
    tax: number;
    service: number;
    total: number;
  };
}
