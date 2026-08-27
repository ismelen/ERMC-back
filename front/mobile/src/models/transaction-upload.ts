import { TransactionSource } from './transaction-source';

export interface TransactionUpload {
  itemId?: string;
  file: TransactionSource;
  error?: string;
  status: 'done' | 'error' | 'sending' | 'pending';
}
