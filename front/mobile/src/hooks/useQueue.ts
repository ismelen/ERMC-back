import BackgroundService from 'react-native-background-actions';
import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Transaction } from '../models/transaction';
import { TransactionConfig } from '../models/transaction-config';
import { TransactionUpload } from '../models/transaction-upload';
import { NotificationService } from '../services/notification-service';
import { StorageService } from '../services/storage-service';
import { TransactionService } from '../services/transaction-service';
import { useCloud } from './useCloud';

export const TRANSACTIONS_KEY = 'transactions';

interface State {
  transactions: Transaction[];
}

export const useQueue = create(
  immer(
    combine(
      {
        transactions: [],
      } as State,
      (set, get) => ({
        async init() {
          const trans = await StorageService.GetAsync<Transaction[]>(TRANSACTIONS_KEY);
          set({ transactions: trans ?? [] });
        },

        async cancel(idx: number) {
          TransactionService.cancelTransaction(get().transactions[idx]);
        },

        async download(idx: number, id: string): Promise<boolean> {
          try {
            return TransactionService.download(get().transactions[idx], id);
          } catch (e: any) {
            alert(e.message);
            return false;
          }
        },

        async checkProgress(idx: number) {
          const tran = get().transactions[idx];

          if (
            !tran ||
            !(
              tran.status === 'processing' ||
              tran.status === 'merging' ||
              tran.status === 'enqueued'
            )
          )
            return;

          const updated = await TransactionService.checkStatus(tran);

          set((state) => {
            state.transactions[idx] = updated;
          });
          StorageService.SetAsync(TRANSACTIONS_KEY, get().transactions);
        },

        async startUploads(idx: number) {
          const tranId = get().transactions[idx]?.id;
          if (!tranId) return;

          set((state) => {
            const t = state.transactions.find((e) => e.id === tranId);
            if (t) {
              t.uploads.forEach((u) => {
                if (u.status === 'pending') u.status = 'sending';
              });
            }
            StorageService.SetAsync(TRANSACTIONS_KEY, state.transactions);
          });

          await BackgroundService.start(
            async () => {
              const currentTran = get().transactions.find((e) => e.id === tranId);
              if (!currentTran) return;

              await Promise.all(
                currentTran.uploads.map(async (upload, i) => {
                  let status: TransactionUpload['status'];
                  let error: string | undefined;
                  let itemId: string | undefined;

                  try {
                    itemId = await TransactionService.attachFile(upload.file, currentTran);
                    status = 'done';
                  } catch (e: any) {
                    status = 'error';
                    error = e.message;
                  }

                  set((state) => {
                    const index = state.transactions.findIndex((e) => e.id === tranId);
                    if (index === -1) return;
                    const t = state.transactions[index];
                    t.uploads[i] = {
                      ...t.uploads[i],
                      status: status,
                      error: error,
                      itemId: itemId,
                    };

                    if (t.status === 'waiting') t.status = 'processing';
                    StorageService.SetAsync(TRANSACTIONS_KEY, state.transactions);
                  });
                })
              );
            },
            {
              taskName: 'inkomi-upload',
              taskTitle: 'Inkomi',
              taskDesc: 'Uploading files...',
              taskIcon: {
                name: 'ic_launcher',
                type: 'mipmap',
              },
              foregroundServiceType: ['dataSync'],
            }
          );
        },

        async retryUpload(tranIdx: number, uploadIdx: number, newFile?: any) {
          const tranId = get().transactions[tranIdx]?.id;
          if (!tranId) return;

          set((state) => {
            const t = state.transactions[tranIdx];
            if (t) {
              if (newFile) {
                t.uploads[uploadIdx].file = newFile;
              }
              t.uploads[uploadIdx].status = 'sending';
              t.uploads[uploadIdx].error = undefined;
            }
            StorageService.SetAsync(TRANSACTIONS_KEY, state.transactions);
          });

          await BackgroundService.start(
            async () => {
              const currentTran = get().transactions[tranIdx];
              if (!currentTran) return;

              const upload = currentTran.uploads[uploadIdx];
              let status: TransactionUpload['status'];
              let error: string | undefined;
              let itemId: string | undefined;

              try {
                itemId = await TransactionService.attachFile(upload.file, currentTran);
                status = 'done';
              } catch (e: any) {
                status = 'error';
                error = e.message;
              }

              set((state) => {
                const t = state.transactions[tranIdx];
                if (!t) return;
                t.uploads[uploadIdx] = {
                  ...t.uploads[uploadIdx],
                  status: status,
                  error: error,
                  itemId: itemId,
                };
                StorageService.SetAsync(TRANSACTIONS_KEY, state.transactions);
              });
            },
            {
              taskName: 'inkomi-upload-retry',
              taskTitle: 'Inkomi',
              taskDesc: 'Retrying upload...',
              taskIcon: {
                name: 'ic_launcher',
                type: 'mipmap',
              },
              foregroundServiceType: ['dataSync'],
            }
          );
        },

        async retryItem(tranIdx: number, itemId: string) {
          const tran = get().transactions[tranIdx];
          if (!tran) return;

          const uploadMatch = tran.uploads.find((u) => u.itemId === itemId);
          if (!uploadMatch) {
            alert('No se encontró el archivo original para reintentar');
            return;
          }

          set((state) => {
            const t = state.transactions[tranIdx];
            const i = t.items.find((x) => x.id === itemId);
            if (i) {
              i.status = 'processing';
              i.error = undefined;
            }
            StorageService.SetAsync(TRANSACTIONS_KEY, state.transactions);
          });

          await BackgroundService.start(
            async () => {
              const currentTran = get().transactions[tranIdx];
              if (!currentTran) return;

              try {
                await TransactionService.attachFile(uploadMatch.file, currentTran, itemId);
              } catch (e: any) {
                set((state) => {
                  const t = state.transactions[tranIdx];
                  const i = t?.items.find((x) => x.id === itemId);
                  if (i) {
                    i.status = 'error';
                    i.error = e.message;
                  }
                  StorageService.SetAsync(TRANSACTIONS_KEY, state.transactions);
                });
              }
            },
            {
              taskName: 'inkomi-item-retry',
              taskTitle: 'Inkomi',
              taskDesc: 'Retrying item...',
              taskIcon: {
                name: 'ic_launcher',
                type: 'mipmap',
              },
              foregroundServiceType: ['dataSync'],
            }
          );
        },

        async send(config: TransactionConfig, pathname?: string): Promise<boolean> {
          if (config.files.length === 0) return false;

          const notifyToken = await NotificationService.getToken();
          const cloud = config.toCloud
            ? await useCloud.getState().getCloudInfo(`${pathname}?last=true`)
            : undefined;

          const tran = await TransactionService.startTransaction(config, cloud, notifyToken);
          if (!tran) return false;

          const isWaiting = tran.status === 'waiting';

          tran.uploads = tran.config.files.map(
            (e) =>
              ({
                file: e,
                status: isWaiting ? 'sending' : 'pending',
              }) as TransactionUpload
          );
          set((state) => {
            state.transactions.unshift(tran);
          });
          StorageService.SetAsync(TRANSACTIONS_KEY, get().transactions);

          if (isWaiting) {
            (get() as any).startUploads(0);
          }
          return true;
        },
      })
    )
  )
);
