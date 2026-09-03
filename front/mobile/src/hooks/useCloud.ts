import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { StorageService } from '../services/storage-service';
import { AuthService, OAuthData } from '../services/auth-serivice';
import { CloudService } from '../services/cloud-service';

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
  showAuthConfirm: boolean;
  onAuthConfirm?(confirmed: boolean): void;
  showFolderAlert: boolean;
  setShowFolderAlert(show: boolean): void;
}

export const useCloud = create(
  immer(
    combine(
      { showDialog: false, showAuthConfirm: false, showFolderAlert: false } as State,
      (set, get) => ({
        async init() {
          const json = await StorageService.GetSecureAsync(OAUTH_KEY);
          const oauth: OAuthData = json ? JSON.parse(json) : {};

          let folder = await StorageService.GetSecureAsync(FOLDER_PATH_KEY);
          if (folder === '') {
            folder = undefined;
            await StorageService.RemoveSecureAsync(FOLDER_PATH_KEY);
          }

          set({ oauth, folder });
        },

        logout() {
          StorageService.SetSecureAsync(OAUTH_KEY, JSON.stringify({}));
          StorageService.SetSecureAsync(FOLDER_PATH_KEY, '');
          set({ oauth: undefined, showDialog: false, showAuthConfirm: false, folder: undefined });
        },

        async getCloudInfo(pathName?: string, forced?: boolean): Promise<CloudInfo | undefined> {
          const state = useCloud.getState();

          const token = await state.getToken(pathName, forced);
          if (!token) return;

          const folder = await state.getFolder(forced);
          if (folder === undefined) return;

          return { token: token, folderPath: folder };
        },

        async getFolder(forced?: boolean): Promise<string | undefined> {
          if (!forced && get().folder !== undefined) return get().folder;

          const path = await new Promise<string | undefined>((resolve) => {
            set({ onFolderSelect: resolve, showDialog: true });
          });
          set({ showDialog: false, onFolderSelect: undefined });
          if (path === undefined) {
            return;
          }

          StorageService.SetSecureAsync(FOLDER_PATH_KEY, path);
          set({ folder: path });

          return path;
        },

        /** Shows an in-app confirmation dialog before opening the Dropbox auth browser. */
        async requestAuthConfirm(): Promise<boolean> {
          return new Promise<boolean>((resolve) => {
            set({ showAuthConfirm: true, onAuthConfirm: resolve });
          });
        },

        resolveAuthConfirm(confirmed: boolean) {
          const cb = get().onAuthConfirm;
          set({ showAuthConfirm: false, onAuthConfirm: undefined });
          cb?.(confirmed);
        },

        setShowFolderAlert(show: boolean) {
          set({ showFolderAlert: show });
        },

        async getToken(returnPath?: string, forced?: boolean): Promise<string | undefined> {
          const current = get().oauth;
          const { refresh, expiresAt, token } = current ?? {};
          const needsLogin = !token || forced || !expiresAt || expiresAt <= Date.now();
          const needsBrowserLogin = needsLogin && (!refresh || forced);

          if (needsBrowserLogin) {
            // Ask the user before opening the external Dropbox auth browser
            const confirmed = await useCloud.getState().requestAuthConfirm();
            if (!confirmed) return;
          }

          const oauth = await CloudService.getToken(current, forced, returnPath);

          set({ oauth: { ...oauth } });
          StorageService.SetSecureAsync(OAUTH_KEY, JSON.stringify(oauth ?? {}));

          return oauth?.token;
        },
      })
    )
  )
);
