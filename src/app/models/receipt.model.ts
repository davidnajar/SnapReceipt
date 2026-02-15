export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
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
}
