export interface TransactionSource {
  name: string;
  src: string;
  size?: number;
  mime?: string;
  cover_url?: string;
  author?: string;
  extension?: string;
  language?: string;
}
