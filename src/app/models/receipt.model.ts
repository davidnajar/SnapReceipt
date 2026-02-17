export interface PriceComparison {
  storeName: string;
  price: number;
  savings: number;
  savingsPercent: number;
  url?: string;
  location?: string; // For local shops
  availability?: 'online' | 'local' | 'both';
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  category?: string; // Legacy: Single category (for backwards compatibility)
  categories?: string[]; // Multiple categories per item
  priceComparison?: PriceComparison[]; // AI-powered price comparison results
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
