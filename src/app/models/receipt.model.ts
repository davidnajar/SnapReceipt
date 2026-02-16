export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  category?: string; // Category tag like food, beverages, clothing, electronics, etc.
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
}
