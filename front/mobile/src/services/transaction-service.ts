import { BACKEND_API_URL } from '../constants';
import { Transaction } from '../models/transaction';
import RNBlobUtil from 'react-native-blob-util';
import { TransactionConfig } from '../models/transaction-config';
import { CloudInfo } from '../hooks/useCloud';
import { TransactionSource } from '../models/transaction-source';
import i18n from '../i18n/i18n';

export class TransactionService {
  static async startTransaction(
    config: TransactionConfig,
    cloud?: CloudInfo,
    notifyToken?: string
  ): Promise<Transaction | undefined> {
    try {
      const res = await fetch(`${BACKEND_API_URL}/transactions/start`, {
        method: 'POST',
        body: JSON.stringify({
          author: config.author,
          title: config.title,
          profile: config.model,
          merge: config.merge,
          cloud: config.toCloud,
          cloud_token: cloud?.token,
          cloud_folder: cloud?.folderPath,
          notify_token: notifyToken,
          type: config.mode,
          cant: config.files.length,
          locale: i18n.language,
          size: config.files.map((e) => e.size ?? 0).reduce((prev, current) => prev + current),
        }),
      });
      const data: Transaction = await res.json();

      if (res.status !== 200) {
        alert(data);
        return;
      }

      return {
        id: data.id,
        timestamp: data.timestamp,
        completed: 0,
        total: config.files.length,
        config: config,
        items: [],
        results: [],
        uploads: [],
        status: 'waiting',
      };
    } catch (e) {
      console.error('start transaction', e);
      return;
    }
  }

  static async cancelTransaction(tran: Transaction) {
    try {
      await fetch(`${BACKEND_API_URL}/transactions/${tran.id}/cancel?locale=${i18n.language}`, {
        method: 'PUT',
      });
    } catch (e) {
      console.error('cancel transaction', e);
    }
  }

  static async download(tran: Transaction, id: string): Promise<boolean> {
    try {
      const file = tran.results.find((e) => e.id === id);
      if (!file) return false;

      await RNBlobUtil.config({
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: file.filename,
          description: 'Descargando archivo...',
          mime: TransactionService.getMimeType(file.filename),
          mediaScannable: true,
          path: `${RNBlobUtil.fs.dirs.DownloadDir}/${file.filename}`,
        },
      }).fetch(
        'GET',
        `${BACKEND_API_URL}/transactions/${tran.id}/download/${id}?locale=${i18n.language}`
      );

      return true;
    } catch (e) {
      console.error('download', e);
      return false;
    }
  }

  /** Downloads to cache and returns the local file path (for sharing). */
  static async downloadToCache(tran: Transaction, id: string): Promise<string | undefined> {
    try {
      const file = tran.results.find((e) => e.id === id);
      if (!file) return;

      const path = `${RNBlobUtil.fs.dirs.CacheDir}/${file.filename}`;
      await RNBlobUtil.config({ path }).fetch(
        'GET',
        `${BACKEND_API_URL}/transactions/${tran.id}/download/${id}?locale=${i18n.language}`
      );
      return path;
    } catch (e) {
      console.error('download cache', e);
      return;
    }
  }

  static getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      epub: 'application/epub+zip',
      cbz: 'application/x-cbz',
      pdf: 'application/pdf',
      zip: 'application/zip',
      md5: 'text/plain',
      rar: 'application/x-rar-compressed',
      mobi: 'application/x-mobipocket-ebook',
    };
    return map[ext ?? ''] ?? 'application/octet-stream';
  }

  static async checkStatus(tran: Transaction): Promise<Transaction> {
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/transactions/${tran.id}/status?locale=${i18n.language}`,
        { method: 'GET' }
      );

      if (res.status !== 200) {
        return {
          ...tran,
          status: 'error',
        };
      }
      const { status, total, completed, items, results }: Transaction = await res.json();

      return {
        ...tran,
        status,
        total,
        completed,
        items,
        results,
      };
    } catch (e) {
      console.error('check status', e);
      return tran;
    }
  }

  static async attachFile(file: TransactionSource, tran: Transaction) {
    let body: BodyInit | null | undefined;

    if (tran.config.mode === 'md5') {
      body = JSON.stringify({
        title: file.name,
        md5: file.src,
        locale: i18n.language,
      });
    } else {
      const form = new FormData();
      form.append('file', {
        uri: file.src,
        name: file.name,
        type: file.mime ?? 'application/zip',
      } as any);
      body = form;
    }

    const attachUrl =
      tran.config.mode !== 'md5'
        ? `${BACKEND_API_URL}/transactions/${tran.id}/attach?locale=${i18n.language}`
        : `${BACKEND_API_URL}/transactions/${tran.id}/attach`;

    const res = await fetch(attachUrl, {
      method: 'POST',
      body: body,
    });
    const data = await res.json();

    if (res.status !== 200) {
      throw new Error(data.error);
    }
  }
}
