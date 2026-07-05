import { create } from 'zustand';
import { Source } from '../models/source';
import { TransactionRequest } from '../models/transaction-request';
import { StorageService } from '../services/storage-service';
import { FilesystemService } from '../services/filesystem-service';

interface State {
  folders: MonitoredFolder[];
  init(): Promise<void>;
  add(req: TransactionRequest): Promise<void>;
  remove(idx: number): Promise<void>;
  update(req: TransactionRequest, idx: number): Promise<void>;
}

export interface MonitoredFolder extends TransactionRequest {
  diff: number;
  oldFiles: Source[];
}

const FOLDERS_KEY = 'monitored_folders_key';

export const useMonitoredFolders = create<State>((set, get) => ({
  folders: [],

  async init() {
    const folders = await StorageService.GetAsync<MonitoredFolder[]>(FOLDERS_KEY);
    if (!folders) return;

    for (const folder of folders) {
      const src = folder.sources[0];
      const newFiles = await FilesystemService.filesFromFolder(src.path);
      const oldFiles = new Set(folder.oldFiles);

      const diff = newFiles.filter((s) => !oldFiles.has(s));
      if (diff.length === 0) continue;

      src.children = diff;
      folder.diff = diff.length;
    }

    StorageService.SetAsync(FOLDERS_KEY, folders);
    set({ folders });
  },

  async add(req: TransactionRequest) {
    if (req.sourceMode !== 'folder') return;

    const folders = get().folders;
    folders.push({ ...req, oldFiles: req.sources[0].children ?? [], diff: 0 });

    StorageService.SetAsync(FOLDERS_KEY, folders);
    set({ folders });
  },

  async update(req: TransactionRequest, idx: number) {
    const folders = get().folders;
    folders[idx] = { ...req, oldFiles: req.sources[0].children ?? [], diff: 0 };

    StorageService.SetAsync(FOLDERS_KEY, folders);
    set({ folders: [...folders] });
  },

  async remove(idx: number) {
    const folders = get().folders.filter((_, i) => i !== idx);

    StorageService.SetAsync(FOLDERS_KEY, folders);
    set({ folders });
  },
}));
