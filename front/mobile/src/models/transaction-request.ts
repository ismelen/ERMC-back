import { SourceMode } from '../hooks/useSource';
import { Source } from './source';

export interface TransactionRequest {
  sources: Source[];
  title?: string;
  author?: string;
  destination: Destination;
  merge?: boolean;
  deleteOrigin: boolean;
  sourceMode: SourceMode;
  type: TransactionType;
}

export type Destination = 'local' | 'cloud';
export type TransactionType = 'epub' | 'comic' | 'remote';
