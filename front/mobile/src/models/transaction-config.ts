import { TransactionSource } from './transaction-source';

export interface TransactionConfig {
  title?: string;
  author?: string;
  model: string;
  toCloud: boolean;
  merge: boolean;
  files: TransactionSource[];
  folder?: TransactionSource;
  mode: TransactionMode;
  monitoredIdx?: number;
  deleteOriginals?: boolean;
}

export type TransactionMode = 'md5' | 'epub' | 'cbz';
