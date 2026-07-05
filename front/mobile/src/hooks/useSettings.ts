import { create } from 'zustand';
import { StorageService } from '../services/storage-service';
import { TransactionRequest } from '../models/transaction-request';
import { BaseConfig } from '../models/base-config';

interface State {
  baseConfig: BaseConfig;
  setModel(model?: string): void;
  init(): Promise<void>;
  udpateConfig(baseConfig: BaseConfig): void;
}

const BASE_CONFIG_KEY = 'base_config_key';

export const useSettings = create<State>((set, get) => ({
  baseConfig: {
    deleteOrigin: false,
    merge: true,
    destination: 'local',
  },

  async init() {
    const baseConfig = await StorageService.GetAsync<BaseConfig>(BASE_CONFIG_KEY);
    if (!baseConfig) return;
    set({ baseConfig });
  },

  setModel(model?: string) {
    set((s) => {
      const newConfig = {
        ...s.baseConfig,
        model,
      };
      StorageService.SetAsync(BASE_CONFIG_KEY, newConfig);

      return { baseConfig: newConfig };
    });
  },

  udpateConfig(baseConfig: BaseConfig) {
    set({ baseConfig });
    StorageService.SetAsync(BASE_CONFIG_KEY, baseConfig);
  },
}));

// interface State {
//   model?: string;
//   setModel(model?: string): void;
//   init(): Promise<void>;
// }

// const MODEL_KEY = 'e_reader_model';

// export const useSettings = create<State>((set, get) => ({
//   async init() {
//     const model = await StorageService.GetAsync<string>(MODEL_KEY);
//     set({ model: model });
//   },

//   setModel(model?: string) {
//     set({ model });
//     StorageService.SetAsync(MODEL_KEY, model);
//   },
// }));
