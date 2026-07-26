import { TransactionSource } from './transaction-source';

export interface TransactionUpload {
  file: TransactionSource;
  error?: string;
  status: 'done' | 'error' | 'sending';
}
