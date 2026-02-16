export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  category?: string; // Legacy: Single category (for backwards compatibility)
  categories?: string[]; // Multiple categories per item
}

export interface Receipt {
  id?: string;
  date: string;
  total: number;
  merchant: string;
  items?: ReceiptItem[];
  category?: string;
  imageUrl?: string;
  createdAt?: Date;
  status?: 'processing' | 'completed' | 'error';
  storagePath?: string;
  errorMessage?: string;
  currency?: string;
  summary?: string; // AI-generated summary of the receipt
}
