import { randomUUID } from 'expo-crypto';
import BackgroundService from 'react-native-background-actions';
import RNBlobUtil from 'react-native-blob-util';
import { create } from 'zustand';
import { BACKEND_API_URL, MAX_CHUNK_SIZE, MAX_FILES_CANT } from '../constants';
import { QueueElement } from '../models/queue-element';
import { Source } from '../models/source';
import { TransactionRequest } from '../models/transaction-request';
import { Upload } from '../models/upload';
import { NotificationService } from '../services/notification-service';
import { StorageService } from '../services/storage-service';
import { useCloud } from './useCloud';

interface State {
  uploads: Upload[];
  transactions: QueueElement[];
  completedTransactions: QueueElement[];
  send(req: Partial<TransactionRequest>, libgenMode?: boolean): Promise<boolean>;
  checkProgress(): Promise<void>;
  download(idx: number, id: string): Promise<boolean>;
  init(): Promise<void>;
  cancel(id: string): Promise<void>;
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export const TRANSACTIONS_KEY = 'transactions';
export const COMPLETE_TRANSACTIONS_KEY = 'complete_transactions';

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

    const resp = await fetch(`${BACKEND_API_URL}/transaction/cancel/${id}`, {
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
      }).fetch('GET', `${BACKEND_API_URL}/transaction/download/${id}`);
    } catch (e: any) {
      alert(e.message);
      return false;
    }

    return true;
  },

  async checkProgress(): Promise<void> {
    // TODO:
    // const trans = get().transactions;
    // const results = await Promise.allSettled(trans.map((t) => fetchStatus(t.id)));
    // const pending: QueueElement[] = [];
    // const completeds: QueueElement[] = [];
    // results.forEach((res, i) => {
    //   const tran = trans[i];
    //   let completedOrError = false;
    //   let updated: QueueElement;
    //   if (res.status === 'fulfilled') {
    //     updated = { ...tran, progress: res.value };
    //     completedOrError = res.value === 100;
    //   } else {
    //     updated = { ...tran, error: res.reason?.message ?? String(res.reason) };
    //     completedOrError = true;
    //   }
    //   if (completedOrError) {
    //     completeds.unshift(updated);
    //   } else {
    //     pending.push(updated);
    //   }
    // });
    // completeds.push(...get().completedTransactions);
    // StorageService.SetAsync(TRANSACTIONS_KEY, pending);
    // StorageService.SetAsync(COMPLETE_TRANSACTIONS_KEY, completeds);
    // set({ transactions: pending, completedTransactions: completeds });
  },

  async send(req: TransactionRequest, libgenMode?: boolean): Promise<boolean> {
    if (!(libgenMode ?? false)) {
      if (req.sourceMode === 'no-select') return false;
      if (req.sources.length === 0) return false;
      if (req.sourceMode === 'folder' && (req.sources[0].children?.length ?? 0) === 0) return false;
    }

    // TODO: get files, start transaction (create object), send files one by one (create object)
    // const forms: FormData[] = [];
    // if (libgenMode ?? false) {
    //   const form = new FormData();
    //   form.append('md5s', req.books.map((e) => e.md5).join(','));
    //   forms.push(form);
    // } else {
    //   let files: Source[] = [];
    //   if (req.sourceMode === 'files') {
    //     files = req.sources;
    //   } else {
    //     files = req.sources[0].children ?? [];
    //   }
    //   if (files.length === 0) {
    //     alert('No files');
    //     return false;
    //   }
    //   let form = new FormData();
    //   let size = 0;
    //   let cant = 0;
    //   files.sort((a, b) => collator.compare(a.path, b.path));
    //   for (const file of files) {
    //     if (file.size! > MAX_CHUNK_SIZE) {
    //       alert(`File ${file.name} (${file.size} bytes) is too big (max 200 MB)`);
    //       return false;
    //     }
    //     cant++;
    //     if (size + file.size! > MAX_CHUNK_SIZE || cant >= MAX_FILES_CANT) {
    //       forms.push(form);
    //       form = new FormData();
    //       size = 0;
    //       cant = 0;
    //     }
    //     form.append('files', {
    //       uri: file.path,
    //       name: file.name,
    //       type: file.mime ?? 'application/zip',
    //     } as any);
    //     size += file.size!;
    //   }
    //   if (form.getAll('files').length > 0 || cant > 0) {
    //     forms.push(form);
    //   }
    // }
    // const permissionGranted = await NotificationService.requestNotificationPermission();
    // const notifyToken = permissionGranted ? await NotificationService.getToken() : '';
    // const toCloud = req.destination === 'cloud';
    // const token = toCloud ? ((await useCloud.getState().getToken()) ?? '') : '';
    // const folder = toCloud ? ((await useCloud.getState().getFolder()) ?? '') : '';
    // const uploads: Upload[] = [];
    // for (const form of forms) {
    //   form.append('profile', req.model ?? '');
    //   form.append('title', req.title ?? '');
    //   form.append('author', req.author ?? '');
    //   form.append('cloud', String(toCloud));
    //   form.append('merge', String(req.merge));
    //   form.append('notify_token', notifyToken);
    //   form.append('cloud_token', token);
    //   form.append('cloud_folder', folder);
    //   let sources: Source[] = [];
    //   if (!libgenMode) {
    //     const files = form.getAll('files').map((e: any) => e.uri as string);
    //     if (req.sourceMode === 'files') {
    //       sources = req.sources.filter((e) => files.includes(e.path));
    //     } else {
    //       const source = req.sources[0];
    //       source.children = source.children!.filter((e) => files.includes(e.path));
    //       sources = [source];
    //     }
    //   }
    //   const request: TransactionRequest = {
    //     ...req,
    //     sources: sources,
    //   };
    //   uploads.push({
    //     id: randomUUID(),
    //     libgenMode: libgenMode ?? false,
    //     request: request,
    //     timestamp: Date.now(),
    //     formData: form,
    //   });
    // }
    // set((s) => ({ uploads: [...s.uploads, ...uploads] }));
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
  },
}));

async function fetchStatus(id: string): Promise<number> {
  const resp = await fetch(`${BACKEND_API_URL}/transaction/status/${id}`, { method: 'GET' });

  const json = await resp.json();

  if (resp.status !== 200) {
    throw new Error(json.error);
  }

  return json.progress;
}

const chapterPatterns: RegExp[] = [
  /\bch(?:apter)?\.?\s*(\d+(?:\.\d+)?)/i,
  /\bcap[ií]?tulo\.?\s*(\d+(?:\.\d+)?)|\bcap\.?\s*(\d+(?:\.\d+)?)/i,
  /\bepisodi?o?\.?\s*(\d+(?:\.\d+)?)/i,
];
function extractChapterNumber(filename: string): number | null {
  for (const re of chapterPatterns) {
    const m = filename.match(re);
    if (!m) continue;
    for (let i = 1; i < m.length; i++) {
      if (m[i] !== undefined && m[i] !== '') {
        const n = parseFloat(m[i]);
        if (!isNaN(n)) return n;
      }
    }
  }
  return null;
}
const numRe = /\d+|\D+/g;
function alphanumericCmpInner(a: string, b: string): number {
  const as = a.match(numRe) ?? [];
  const bs = b.match(numRe) ?? [];
  for (let i = 0; i < as.length && i < bs.length; i++) {
    if (as[i] === bs[i]) continue;
    const an = parseInt(as[i], 10);
    const bn = parseInt(bs[i], 10);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    return as[i] < bs[i] ? -1 : 1;
  }
  return as.length - bs.length;
}
function alphanumericSort(a: string, b: string): number {
  const aNum = extractChapterNumber(a);
  const bNum = extractChapterNumber(b);
  if (aNum !== null && bNum !== null && aNum !== bNum) {
    return aNum - bNum;
  }
  return alphanumericCmpInner(a, b);
}
