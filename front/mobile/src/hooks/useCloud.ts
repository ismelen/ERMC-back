import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { StorageService } from '../services/storage-service';
import { AuthService, OAuthData } from '../services/auth-serivice';

const FOLDER_PATH_KEY = 'folder_path_key';
const OAUTH_KEY = 'oauth_tokens';

export interface CloudInfo {
  token?: string;
  folderPath?: string;
}

interface State {
  email?: string;
  cloudInfo: CloudInfo;
  refresh?: string;
  expiresAt: number;
  showDialog: boolean;
  onFolderSelect?(data?: string): void;
}

const initialState = {
  expiresAt: 0,
  showDialog: false,
  cloudInfo: {},
} as State;

export const useCloud = create(
  immer(
    combine(initialState, (set, get) => ({
      async init() {
        let json = await StorageService.GetSecureAsync(OAUTH_KEY);
        const { email, expiresAt, refresh }: OAuthData = json ? JSON.parse(json) : {};

        json = await StorageService.GetSecureAsync(FOLDER_PATH_KEY);
        const cloudInfo = json ? JSON.parse(json) : {};

        set({
          email,
          expiresAt,
          refresh,
          cloudInfo: cloudInfo,
        });
      },

      logout() {
        StorageService.SetSecureAsync(OAUTH_KEY, JSON.stringify({}));
        StorageService.SetSecureAsync(FOLDER_PATH_KEY, '');
        set(initialState);
      },

      async getCloudInfo(forced?: boolean): Promise<CloudInfo | undefined> {
        const info = get().cloudInfo;
        forced = forced ?? false;
        if (info.folderPath && info.token && !forced) return info;

        if (!info.token) {
          const token = await useCloud.getState().getToken(forced);
          if (!token) {
            alert('no token');
            return;
          }
          info.token = token;
        }
        if (!info.folderPath) {
          const path = await new Promise<string | undefined>((resolve) => {
            set({ onFolderSelect: resolve, showDialog: true });
          });
          set({ showDialog: false, onFolderSelect: undefined });
          if (!path) {
            alert('no folder path');
            return;
          }

          info.folderPath = path;
        }

        set({ cloudInfo: info });
        StorageService.SetSecureAsync(FOLDER_PATH_KEY, JSON.stringify(info));
        return info;
      },

      async getToken(forced?: boolean): Promise<string | undefined> {
        const { refresh, cloudInfo, expiresAt } = get();

        if ((forced ?? false) || expiresAt <= Date.now() || !cloudInfo.token) {
          const tokens = await (!refresh || (forced ?? false)
            ? AuthService.login()
            : AuthService.refreshToken(refresh));
          if (!tokens) return;

          if (!tokens.email) {
            tokens.email = get().email;
          }

          set((s) => ({
            cloudInfo: {
              ...s,
              token: tokens.token,
            },
            refresh: tokens.refresh,
            expiresAt: tokens.expiresAt,
            email: tokens.email,
          }));

          StorageService.SetSecureAsync(OAUTH_KEY, JSON.stringify(tokens));
          StorageService.SetSecureAsync(FOLDER_PATH_KEY, JSON.stringify(get().cloudInfo));

          return tokens.token;
        }

        return cloudInfo.token;
      },
    }))
  )
);
