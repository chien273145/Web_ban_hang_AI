export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  unit: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'cash' | 'transfer' | 'debt';

export interface Invoice {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
}

export enum VoiceIntentType {
  CHECK_PRICE = 'CHECK_PRICE',
  ADD_TO_CART = 'ADD_TO_CART',
  UNKNOWN = 'UNKNOWN'
}

export interface VoiceCommandResult {
  intent: VoiceIntentType;
  productName?: string;
  quantity?: number;
  confidence?: number;
}

export type Tab = 'pos' | 'inventory' | 'invoices';