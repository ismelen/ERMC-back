export interface TransactionFile {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'done' | 'error' | 'unknown';
  resultId?: string;
  error?: string;
}
