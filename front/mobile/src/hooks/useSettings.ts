import { create } from 'zustand';
import { StorageService } from '../services/storage-service';
import { immer } from 'zustand/middleware/immer';
import { combine } from 'zustand/middleware';
import { TransactionConfig } from '../models/transaction-config';
import i18n, { SupportedLanguage } from '../i18n/i18n';

const SETTINGS_KEY = 'settings_key';
export type Settings = Omit<TransactionConfig, 'title' | 'author' | 'files' | 'folder' | 'mode'> & {
  language?: SupportedLanguage;
};

export const useSettings = create(
  immer(
    combine(
      {
        settings: {
          merge: true,
          toCloud: false,
        } as Settings,
      },
      (set) => ({
        async init() {
          const settings = await StorageService.GetAsync<Settings>(SETTINGS_KEY);
          if (!settings) return;

          if (settings.language) {
            await i18n.changeLanguage(settings.language);
          }

          set({ settings });
        },

        setModel(model?: string) {
          set((s) => {
            s.settings.model = model ?? '';
            StorageService.SetAsync(SETTINGS_KEY, s.settings);
          });
        },

        async setLanguage(language: SupportedLanguage) {
          await i18n.changeLanguage(language);
          set((s) => {
            s.settings.language = language;
            StorageService.SetAsync(SETTINGS_KEY, s.settings);
          });
        },

        setSettings(settings: Settings) {
          set({ settings });
          StorageService.SetAsync(SETTINGS_KEY, settings);
        },
      })
    )
  )
);
