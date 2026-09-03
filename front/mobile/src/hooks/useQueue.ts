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
import { DatabaseService } from '../services/database-service';
import { FilesystemService } from '../services/filesystem-service';
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
          await DatabaseService.initDb();

          const legacyTrans = await StorageService.GetAsync<Transaction[]>(TRANSACTIONS_KEY);
          if (legacyTrans && legacyTrans.length > 0) {
            await DatabaseService.saveTransactions(legacyTrans);
            await StorageService.RemoveAsync(TRANSACTIONS_KEY);
          }

          const trans = await DatabaseService.getTransactions(3);
          set({ transactions: trans ?? [] });

          // Check for any completed transactions that still need their originals deleted
          (get() as any).syncPendingDeletions();
        },

        async syncPendingDeletions() {
          const pending = await DatabaseService.getPendingDeletion();
          for (const tran of pending) {
            await FilesystemService.deleteOriginals(tran.config.files);
            const updated: Transaction = { ...tran, originalsDeleted: true };
            await DatabaseService.saveTransaction(updated);
            // Update in-memory state if the transaction is already loaded
            set((state) => {
              const idx = state.transactions.findIndex((t) => t.id === tran.id);
              if (idx !== -1) state.transactions[idx].originalsDeleted = true;
            });
          }
        },

        async loadMore() {
          const transactions = get().transactions;
          if (transactions.length === 0) return;
          const lastTran = transactions[transactions.length - 1];
          const moreTrans = await DatabaseService.getTransactions(3, {
            timestamp: lastTran.timestamp,
            id: lastTran.id,
          });
          if (moreTrans.length > 0) {
            set((state) => {
              state.transactions.push(...moreTrans);
            });
          }
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
          DatabaseService.saveTransaction(get().transactions[idx]);

          // If the transaction just finished and the user asked to delete originals, do it now
          if (
            updated.status === 'done' &&
            updated.config.deleteOriginals &&
            !updated.originalsDeleted
          ) {
            await FilesystemService.deleteOriginals(updated.config.files);
            const marked: Transaction = { ...updated, originalsDeleted: true };
            DatabaseService.saveTransaction(marked);
            set((state) => {
              state.transactions[idx].originalsDeleted = true;
            });
          }
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
          });
          DatabaseService.saveTransaction(get().transactions.find((e) => e.id === tranId)!);

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
                  });
                  DatabaseService.saveTransaction(get().transactions.find((e) => e.id === tranId)!);
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
          });
          DatabaseService.saveTransaction(get().transactions[tranIdx]);

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
              });
              DatabaseService.saveTransaction(get().transactions[tranIdx]);
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
          });
          DatabaseService.saveTransaction(get().transactions[tranIdx]);

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
                });
                DatabaseService.saveTransaction(get().transactions[tranIdx]);
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

          if (config.toCloud && !cloud) {
            useCloud.getState().setShowFolderAlert(true);
            return false;
          }

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
          DatabaseService.saveTransaction(tran);

          if (isWaiting) {
            (get() as any).startUploads(0);
          }
          return true;
        },
      })
    )
  )
);
