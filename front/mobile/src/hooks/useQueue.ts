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
          if (!tran || !(tran.status === 'processing' || tran.status === 'merging')) return;

          const updated = await TransactionService.checkStatus(tran);

          set((state) => {
            state.transactions[idx] = updated;
          });
          StorageService.SetAsync(TRANSACTIONS_KEY, get().transactions);
        },

        async send(config: TransactionConfig): Promise<boolean> {
          if (config.files.length === 0) return false;

          const notifyToken = await NotificationService.getToken();
          const cloud = config.toCloud ? await useCloud.getState().getCloudInfo() : undefined;

          const tran = await TransactionService.startTransaction(config, cloud, notifyToken);
          if (!tran) return false;

          tran.uploads = tran.config.files.map(
            (e) =>
              ({
                file: e,
                status: 'sending',
              }) as TransactionUpload
          );
          set((state) => {
            state.transactions.unshift(tran);
          });
          StorageService.SetAsync(TRANSACTIONS_KEY, get().transactions);

          await BackgroundService.start(
            async () => {
              await Promise.all(
                tran.uploads.map(async (upload, i) => {
                  let status: TransactionUpload['status'];
                  let error: string | undefined;

                  try {
                    await TransactionService.attachFile(upload.file, tran);
                    status = 'done';
                  } catch (e: any) {
                    status = 'error';
                    error = e.message;
                  }

                  set((state) => {
                    const index = state.transactions.findIndex((e) => e.id === tran.id);
                    const t = state.transactions[index];
                    t.uploads[i] = {
                      ...upload,
                      status: status,
                      error: error,
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
          return true;
        },
      })
    )
  )
);

// const url = `${BACKEND_API_URL}/transaction/convert${(libgenMode ?? false) ? '?remote=true' : ''}`;
// await BackgroundService.start(
//   async () => {
//     await Promise.all(
//       uploads.map(async ({ id, formData: form, request }) => {
//         try {
//           const resp = await fetch(url, { method: 'POST', body: form });
//           set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }));
//           if (resp.status !== 200) {
//             const json = await resp.json();
//             alert(json.error);
//             return;
//           }
//           const raw: QueueElement[] = await resp.json();
//           const data = raw.map((e) => ({
//             ...request,
//             timestamp: Date.now(),
//             filename: e.filename,
//             id: e.id,
//             progress: 0,
//           }));
//           if (libgenMode) {
//             data.forEach((e) => {
//               e.title = request.books.find((b) => b.md5 === e.filename)?.title ?? e.filename;
//             });
//           }
//           set((s) => ({ transactions: [...s.transactions, ...data] }));
//           StorageService.SetAsync(TRANSACTIONS_KEY, get().transactions);
//         } catch (e) {
//           console.log(e);
//         }
//       })
//     );
//     await BackgroundService.stop();
//   },
//   {
//     taskName: 'inkomi-upload',
//     taskTitle: 'Inkomi',
//     taskDesc: 'Uploading files...',
//     taskIcon: {
//       name: 'ic_launcher',
//       type: 'mipmap',
//     },
//     foregroundServiceType: ['dataSync'],
//   }
// );
// return true;
//   },
// }));
