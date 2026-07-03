import { TransactionRequest } from './transaction-request';

export interface QueueElement extends TransactionRequest {
  timestamp: number;
  filename: string;
  id: string;
  progress: number;
  error?: string;
}
