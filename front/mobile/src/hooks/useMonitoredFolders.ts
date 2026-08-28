// import { create } from 'zustand';
// import { Source } from '../models/source';
// import { TransactionRequest } from '../models/transaction-request';
// import { StorageService } from '../services/storage-service';
// import { FilesystemService } from '../services/filesystem-service';

import { create } from 'zustand';
import { TransactionConfig } from '../models/transaction-config';
import { TransactionSource } from '../models/transaction-source';
import { immer } from 'zustand/middleware/immer';
import { combine } from 'zustand/middleware';
import { StorageService } from '../services/storage-service';
import { FilesystemService } from '../services/filesystem-service';

const FOLDERS_KEY = 'monitored_folders_key';

export interface MonitoredFolder extends TransactionConfig {
  diff: number;
  oldFiles: TransactionSource[];
}

interface State {
  folders: MonitoredFolder[];
}

export const useMonitoredFolders = create(
  immer(
    combine(
      {
        folders: [],
      } as State,
      (set, get) => ({
        async init() {
          const folders = await StorageService.GetAsync<MonitoredFolder[]>(FOLDERS_KEY);
          if (!folders) return;

          set({ folders });
          set({ folders });

          const updatedFolders = [...folders];
          let changed = false;

          for (const monitored of updatedFolders) {
            const src = monitored.folder;
            if (!src) continue;

            const newFiles = await FilesystemService.filesFromFolder(src.src);
            const oldFiles = new Set(monitored.files.map((f) => f.src));

            const diff = newFiles.filter((s) => !oldFiles.has(s.src));
            if (diff.length === 0) continue;

            monitored.oldFiles = monitored.files;
            monitored.files = diff;
            monitored.diff = diff.length;
            changed = true;
          }

          if (changed) {
            set({ folders: updatedFolders });
          }
        },

        async add(config: TransactionConfig) {
          if (!config.folder) return;

          set((state: State) => {
            state.folders.push({
              ...config,
              oldFiles: config.files,
              diff: 0,
            });
          });

          StorageService.SetAsync(FOLDERS_KEY, get().folders);
        },

        async update(config: TransactionConfig, idx: number) {
          set((state: State) => {
            state.folders[idx] = {
              ...config,
              oldFiles: config.files,
              diff: 0,
            };
          });

          StorageService.SetAsync(FOLDERS_KEY, get().folders);
        },

        async remove(idx: number) {
          set((state: State) => {
            state.folders = state.folders.filter((_, i) => i !== idx);
          });
          StorageService.SetAsync(FOLDERS_KEY, get().folders);
        },
      })
    )
  )
);
