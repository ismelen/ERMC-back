import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { StorageService } from '../services/storage-service';
import { AuthService, OAuthData } from '../services/auth-serivice';
import { CloudService } from '../services/cloud-service';
import { usePathname } from 'expo-router';

const FOLDER_PATH_KEY = 'folder_path_key';
const OAUTH_KEY = 'oauth_tokens';

export interface CloudInfo {
  token?: string;
  folderPath?: string;
}

interface State {
  folder?: string;
  oauth?: OAuthData;
  showDialog: boolean;
  onFolderSelect?(data?: string): void;
}

export const useCloud = create(
  immer(
    combine({ showDialog: false } as State, (set, get) => ({
      async init() {
        const json = await StorageService.GetSecureAsync(OAUTH_KEY);
        const oauth: OAuthData = json ? JSON.parse(json) : {};

        const folder = await StorageService.GetSecureAsync(FOLDER_PATH_KEY);

        set({ oauth, folder });
      },

      logout() {
        StorageService.SetSecureAsync(OAUTH_KEY, JSON.stringify({}));
        StorageService.SetSecureAsync(FOLDER_PATH_KEY, '');
        set({ oauth: undefined, showDialog: false, folder: undefined });
      },

      async getCloudInfo(pathName?: string, forced?: boolean): Promise<CloudInfo | undefined> {
        const state = useCloud.getState();

        const token = await state.getToken(pathName, forced);
        if (!token) return;

        const folder = await state.getFolder(forced);
        if (!folder) return;

        return { token: token, folderPath: folder };
      },

      async getFolder(forced?: boolean): Promise<string | undefined> {
        if (!forced && get().folder) return get().folder;

        const path = await new Promise<string | undefined>((resolve) => {
          set({ onFolderSelect: resolve, showDialog: true });
        });
        set({ showDialog: false, onFolderSelect: undefined });
        if (!path) {
          alert('no folder path');
          return;
        }

        StorageService.SetSecureAsync(FOLDER_PATH_KEY, path);
        set({ folder: path });

        return path;
      },

      async getToken(returnPath?: string, forced?: boolean): Promise<string | undefined> {
        const oauth = await CloudService.getToken(get().oauth, forced, returnPath);

        set({ oauth: { ...oauth } });
        StorageService.SetSecureAsync(OAUTH_KEY, JSON.stringify(oauth ?? {}));

        return oauth?.token;
      },
    }))
  )
);
