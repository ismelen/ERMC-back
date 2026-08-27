import { Transaction } from '../../models/transaction';

/**
 * Mock transactions covering every visual case of QueueItemCard.
 * Import in queue.tsx for testing:
 *   import { mockTransactions } from '../../src/components/queue/mock-transactions';
 */

export const mockTransactions: Transaction[] = [
  // ─── 1. PROCESSING: uploads done, items in progress ───
  {
    id: 'tran-142a-batch',
    timestamp: Date.now() - 120_000,
    status: 'processing',
    total: 2,
    completed: 0,
    config: {
      title: 'Batch 142A - Midnight Chronicles',
      model: 'KPW5',
      toCloud: false,
      merge: false,
      mode: 'cbz',
      files: [
        { name: 'vol1_raw.zip', src: 'file:///vol1_raw.zip' },
        { name: 'vol2_raw.zip', src: 'file:///vol2_raw.zip' },
      ],
    },
    uploads: [
      { file: { name: 'vol1_raw.zip', src: 'file:///vol1_raw.zip' }, status: 'done' },
      { file: { name: 'vol2_raw.zip', src: 'file:///vol2_raw.zip' }, status: 'done' },
    ],
    items: [
      { id: 'item-1a', title: 'vol1_raw.zip', status: 'processing' },
      { id: 'item-1b', title: 'vol2_raw.zip', status: 'pending' },
    ],
    results: [],
  },

  // ─── 2. ERROR: upload error + item error + one result ───
  {
    id: 'tran-shrine-err',
    timestamp: Date.now() - 600_000,
    status: 'error',
    total: 1,
    completed: 0,
    config: {
      title: 'Shrine of Whispers',
      model: 'KPW5',
      toCloud: true,
      merge: false,
      mode: 'epub',
      files: [{ name: 'shrine_ch1-5.rar', src: 'file:///shrine_ch1-5.rar' }],
    },
    uploads: [
      {
        file: { name: 'shrine_ch1-5.rar', src: 'file:///shrine_ch1-5.rar' },
        status: 'error',
        error: 'Network timeout',
      },
    ],
    items: [
      {
        id: 'item-2a',
        title: 'shrine_ch1.epub',
        status: 'error',
        error: 'Corrupt source file',
      },
    ],
    results: [{ id: 'res-2a', title: 'Shrine Collection', filename: 'shrine_collection.zip' }],
  },

  // ─── 3. DONE: items completed + results ready ───
  {
    id: 'tran-neon-drift',
    timestamp: Date.now() - 3_600_000,
    status: 'done',
    total: 1,
    completed: 1,
    config: {
      title: 'Neon Drift Collection',
      model: 'KPW5',
      toCloud: false,
      merge: false,
      mode: 'md5',
      files: [{ name: 'neon_drift_1.zip', src: 'file:///neon_drift_1.zip' }],
    },
    uploads: [],
    items: [{ id: 'item-3a', title: 'neon_drift_1.zip', status: 'done' }],
    results: [{ id: 'res-3a', title: 'Neon Drift 1', filename: 'neon_drift_1.md5' }],
  },

  // ─── 4. WAITING: just created, no uploads yet ───
  {
    id: 'tran-waiting-ex',
    timestamp: Date.now(),
    status: 'waiting',
    total: 3,
    completed: 0,
    config: {
      title: 'Pending Batch Upload',
      model: 'KoLC',
      toCloud: true,
      merge: true,
      mode: 'epub',
      files: [
        { name: 'chapter_1.zip', src: 'file:///chapter_1.zip' },
        { name: 'chapter_2.zip', src: 'file:///chapter_2.zip' },
        { name: 'chapter_3.zip', src: 'file:///chapter_3.zip' },
      ],
    },
    uploads: [],
    items: [],
    results: [],
  },

  // ─── 5. CANCELED ───
  {
    id: 'tran-canceled-ex',
    timestamp: Date.now() - 7_200_000,
    status: 'canceled',
    total: 2,
    completed: 1,
    config: {
      model: 'K11',
      toCloud: false,
      merge: false,
      mode: 'cbz',
      files: [{ name: 'manga_vol3.zip', src: 'file:///manga_vol3.zip' }],
    },
    uploads: [{ file: { name: 'manga_vol3.zip', src: 'file:///manga_vol3.zip' }, status: 'done' }],
    items: [{ id: 'item-5a', title: 'manga_vol3.zip', status: 'done' }],
    results: [],
  },
];
