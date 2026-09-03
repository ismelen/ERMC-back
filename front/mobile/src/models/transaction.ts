import { TransactionConfig } from './transaction-config';
import { TransactionFile } from './transaction-file';
import { TransactionResult } from './transaction-result';
import { TransactionUpload } from './transaction-upload';

export interface Transaction {
  id: string;
  timestamp: number;
  status:
    'waiting' | 'processing' | 'done' | 'canceled' | 'error' | 'merging' | 'unknown' | 'enqueued';
  config: TransactionConfig;
  total: number;
  completed: number;
  items: TransactionFile[];
  results: TransactionResult[];
  uploads: TransactionUpload[];
  originalsDeleted?: boolean;
}
