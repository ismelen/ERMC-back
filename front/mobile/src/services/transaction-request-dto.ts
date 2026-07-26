export interface TransactionRequestDTO {
  title?: string;
  author?: string;
  profile: string;
  merge: boolean;
  cloud: boolean;
  cloud_token?: string;
  cloud_folder?: string;
  notify_token?: string;
  cant: number;
  type: string;
}
