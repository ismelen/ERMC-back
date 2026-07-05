import { randomUUID } from 'expo-crypto';
import BackgroundService from 'react-native-background-actions';
import RNBlobUtil from 'react-native-blob-util';
import { create } from 'zustand';
import { BACKENDD_URL } from '../constants';
import { QueueElement } from '../models/queue-element';
import { Source } from '../models/source';
import { TransactionRequest } from '../models/transaction-request';
import { Upload } from '../models/upload';
import { FilesystemService } from '../services/filesystem-service';
import { NotificationService } from '../services/notification-service';
import { StorageService } from '../services/storage-service';
import { useCloud } from './useCloud';
import { useSettings } from './useSettings';

interface State {
  uploads: Upload[];
  transactions: QueueElement[];
  completedTransactions: QueueElement[];
  send(req: Partial<TransactionRequest>, libgenMode?: boolean): Promise<boolean>;
  checkProgress(id: string): Promise<boolean>;
  download(idx: number, id: string): Promise<boolean>;
  init(): Promise<void>;
  cancel(id: string): Promise<void>;
}

const TRANSACTIONS_KEY = 'transactions';
const COMPLETE_TRANSACTIONS_KEY = 'complete_transactions';

export const useQueue = create<State>((set, get) => ({
  uploads: [],
  transactions: [],
  completedTransactions: [],

  async init() {
    const trans = (await StorageService.GetAsync<QueueElement[]>(TRANSACTIONS_KEY)) ?? [];
    let completedTransactions =
      (await StorageService.GetAsync<QueueElement[]>(COMPLETE_TRANSACTIONS_KEY)) ?? [];

    if (completedTransactions?.length > 10) {
      completedTransactions = completedTransactions.slice(0, 10);
      StorageService.SetAsync(COMPLETE_TRANSACTIONS_KEY, completedTransactions);
    }

    set({
      transactions: trans,
      completedTransactions: completedTransactions,
    });
  },

  async cancel(id: string) {
    let elems = get().transactions;

    const idx = elems.findIndex((e) => e.id === id);
    if (idx === -1) return;

    const resp = await fetch(`${BACKENDD_URL}/transaction/cancel/${id}`, {
      method: 'PUT',
    });

    if (!resp.ok) return;

    elems = elems.filter((e) => e.id !== id);
    StorageService.SetAsync(TRANSACTIONS_KEY, elems);

    set({ transactions: [...elems] });
  },

  async download(idx: number, id: string): Promise<boolean> {
    const elem = get().completedTransactions[idx];

    try {
      await RNBlobUtil.config({
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: elem.filename,
          description: 'Descargando archivo...',
          mime: 'application/epub+zip',
          mediaScannable: true,
          path: `${RNBlobUtil.fs.dirs.DownloadDir}/${elem.filename}`,
        },
      }).fetch('GET', `${BACKENDD_URL}/transaction/download/${id}`);
    } catch (e: any) {
      alert(e.message);
      return false;
    }

    return true;
  },

  async checkProgress(id: string): Promise<boolean> {
    const transactions = get().transactions;
    const transaction = transactions.find((e) => e.id === id);

    if (!transaction) return true;

    try {
      const progress = await fetchStatus(id);
      transaction.progress = progress;
    } catch (e: any) {
      console.log(e);
      transaction.error = e.message;
    }

    if (transaction.progress === 100 || transaction.error) {
      set((s) => ({
        transactions: s.transactions.filter((e) => e.id !== id),
        completedTransactions: [transaction, ...s.completedTransactions],
      }));
      StorageService.SetAsync(TRANSACTIONS_KEY, get().transactions);
      StorageService.SetAsync(COMPLETE_TRANSACTIONS_KEY, get().completedTransactions);
      return true;
    }

    set({
      transactions: [...transactions],
    });

    return false;
  },

  async send(req: TransactionRequest, libgenMode?: boolean): Promise<boolean> {
    if (!(libgenMode ?? false)) {
      if (req.sourceMode === 'no-select') return false;
      if (req.sources.length === 0) return false;
      if (req.sourceMode === 'folder' && (req.sources[0].children?.length ?? 0) === 0) return false;
    }
    const form = new FormData();

    if (libgenMode ?? false) {
      form.append('md5s', req.books.map((e) => e.md5).join(','));
    } else {
      let files: Source[] = [];
      if (req.sourceMode === 'files') {
        //TODO: Divide by size
        files = req.sources;
      }
      if (req.sourceMode === 'folder') {
        files = req.sources[0].children ?? [];
      }
      if (files.length === 0) return false;

      for (const file of files) {
        form.append('files', {
          uri: file.path,
          name: file.name,
          type: file.mime ?? 'application/zip',
        } as any);
      }
    }

    const toCloud = req.destination === 'cloud';

    form.append('profile', req.model ?? '');
    form.append('title', req.title ?? '');
    form.append('author', req.author ?? '');
    form.append('cloud', String(toCloud));
    form.append('merge', String(req.merge));
    // form.append('notify_token', ''); //TODO: settings

    if (toCloud) {
      const token = (await useCloud.getState().getToken()) ?? '';
      const folder = (await useCloud.getState().getFolder()) ?? '';
      form.append('cloud_token', token);
      form.append('cloud_folder', folder);
    }

    const upload: Upload = {
      request: req,
      timestamp: Date.now(),
      id: randomUUID(),
      libgenMode: libgenMode ?? false,
    };
    set((s) => ({ uploads: [...s.uploads, upload] }));

    await NotificationService.requestNotificationPermission();
    await BackgroundService.start(
      async () => {
        try {
          const resp = await fetch(
            `${BACKENDD_URL}/transaction/convert${(libgenMode ?? false) ? '?remote=true' : ''}`,
            {
              method: 'POST',
              body: form,
            }
          );

          if (resp.status !== 200) {
            const json = await resp.json();
            alert(json.error);
            return;
          }

          const raw: QueueElement[] = await resp.json();
          const data = raw.map((e) => ({
            ...req,
            timestamp: Date.now(),
            filename: e.filename,
            id: e.id,
            progress: 0,
          }));

          if (libgenMode) {
            data.forEach((e) => {
              e.title = req.books.find((b) => b.md5 === e.filename)?.title ?? e.filename;
            });
          }

          set((s) => ({ transactions: [...s.transactions, ...data] }));
          StorageService.SetAsync(TRANSACTIONS_KEY, get().transactions);

          if (req.deleteOrigin ?? false) {
            for (let src of req.sources!) {
              const hasChildren = (src.children ?? []).length > 0;
              for (let child of src.children ?? []) {
                FilesystemService.deleteFile(child.path);
              }
              if (!hasChildren) FilesystemService.deleteFile(src.path);
            }
          }

          set((s) => ({ uploads: s.uploads.filter((e) => e.id !== upload.id) }));
        } catch (e) {
          set((s) => ({
            uploads: s.uploads.map((u) => (u.id === upload.id ? { ...u, error: e as Error } : u)),
          }));
        } finally {
          await BackgroundService.stop();
        }
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
}));

async function fetchStatus(id: string): Promise<number> {
  const resp = await fetch(`${BACKENDD_URL}/transaction/status/${id}`, { method: 'GET' });

  const json = await resp.json();

  if (resp.status !== 200) {
    throw new Error(json.error);
  }

  return json.progress;
}
