import { LibgenBook } from './book';
import { Source } from './source';
import { Destination, TransactionType } from './transaction-request';

export interface BaseConfig {
  destination: Destination;
  deleteOrigin: boolean;
  merge?: boolean;
  model?: string;
  author?: string;
  title?: string;
  sources?: Source[];
  books?: LibgenBook[];
}
