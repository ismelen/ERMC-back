import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { TransactionConfig, TransactionMode } from '../models/transaction-config';
import { useObjectNavigation } from './useObjectNavigation';
import { useEffect, useRef } from 'react';
import { useSettings } from './useSettings';
import { useQueue } from './useQueue';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useMonitoredFolders } from './useMonitoredFolders';

interface FormState {
  config: TransactionConfig;
  monitoredIdx?: number;
  sending: boolean;
}

interface SenderStore {
  forms: Record<string, FormState>;
  setForm: (mode: TransactionMode, form: Partial<FormState>) => void;
  setConfig: (mode: TransactionMode, config: Partial<TransactionConfig>) => void;
  clearForm: (mode: TransactionMode) => void;
}

export const useSenderStore = create<SenderStore>((set) => ({
  forms: {},
  setForm: (mode, form) => {
    set((state) => ({
      forms: {
        ...state.forms,
        [mode]: {
          ...(state.forms[mode] || { sending: false, config: {} as TransactionConfig }),
          ...form,
        },
      },
    }));
  },
  setConfig: (mode, config) => {
    set((state) => {
      const existingForm = state.forms[mode] || { sending: false, config: {} as TransactionConfig };
      return {
        forms: {
          ...state.forms,
          [mode]: {
            ...existingForm,
            config: { ...existingForm.config, ...config } as TransactionConfig,
          },
        },
      };
    });
  },
  clearForm: (mode) => {
    set((state) => {
      const newForms = { ...state.forms };
      delete newForms[mode];
      return { forms: newForms };
    });
  },
}));

export function useSender(mode: TransactionMode) {
  const { clear, initData } = useObjectNavigation(
    useShallow((s) => ({ clear: s.clear, initData: s.object }))
  );

  const { last } = useLocalSearchParams();
  const pathname = usePathname();

  const { settings, setSettings, setModel } = useSettings(
    useShallow((s) => ({ settings: s.settings, setSettings: s.setSettings, setModel: s.setModel }))
  );

  const rawFormState = useSenderStore((s) => s.forms[mode]);
  const setStoreForm = useSenderStore((s) => s.setForm);
  const setStoreConfig = useSenderStore((s) => s.setConfig);
  const clearStoreForm = useSenderStore((s) => s.clearForm);

  // Initialize with defaults if it doesn't exist
  const formState = rawFormState || {
    config: {
      title: '',
      author: '',
      merge: mode === 'cbz' ? settings.merge : false,
      model: settings.model,
      toCloud: settings.toCloud,
      mode: mode,
      files: [],
    },
    sending: false,
  };

  const { config, sending, monitoredIdx } = formState;

  const setConfig = (
    updater: TransactionConfig | ((prev: TransactionConfig) => TransactionConfig)
  ) => {
    if (typeof updater === 'function') {
      const current = useSenderStore.getState().forms[mode]?.config || formState.config;
      setStoreConfig(mode, updater(current));
    } else {
      setStoreConfig(mode, updater);
    }
  };

  const { addMonitored, removeMonitored, updateMonitored } = useMonitoredFolders(
    useShallow((s) => ({
      addMonitored: s.add,
      updateMonitored: s.update,
      removeMonitored: s.remove,
    }))
  );

  const send = useQueue((s) => s.send);
  const oauthRetryFired = useRef(false);

  const handleSend = async (
    files?: any[],
    overrideConfig?: TransactionConfig
  ): Promise<boolean> => {
    const finalConfig = { ...(overrideConfig ?? config) };
    if (files) finalConfig.files = files;

    if (!finalConfig.model || finalConfig.model === '') return false;

    if (settings.model) {
      const differentModel = finalConfig.model !== settings.model;
      if (differentModel) alert('Different model selected');
    }

    setStoreForm(mode, { sending: true });

    const done = await send(finalConfig, router.canGoBack() ? pathname : undefined);

    setStoreForm(mode, { sending: false });

    if (!done) {
      return false;
    }

    // Clear form after successful send
    clearStoreForm(mode);
    router.navigate('/(tabs)/queue');

    if (monitoredIdx === undefined) {
      setSettings({ ...finalConfig, model: settings.model });
      if (finalConfig.model !== settings.model) {
        setModel(finalConfig.model);
      }
      if (finalConfig.monitoredIdx !== undefined && finalConfig.folder !== undefined) addMonitored(finalConfig);
    } else {
      if (finalConfig.monitoredIdx !== undefined && finalConfig.folder !== undefined) {
        updateMonitored(finalConfig, monitoredIdx);
      } else {
        removeMonitored(monitoredIdx);
      }
    }

    return true;
  };

  const unmonitor = () => {
    if (monitoredIdx !== undefined) {
      removeMonitored(monitoredIdx);
      setStoreForm(mode, { monitoredIdx: undefined });
    }
  };

  const manualClear = () => {
    clearStoreForm(mode);
  };

  useEffect(() => {
    if (initData) {
      setStoreForm(mode, {
        config: { ...config, ...initData },
        monitoredIdx: initData.monitoredIdx,
      });
      clear();
    }

    if (String(last) === 'true' && !oauthRetryFired.current) {
      oauthRetryFired.current = true;
      const currentForm = useSenderStore.getState().forms[mode];

      if (currentForm?.sending) {
        setStoreForm(mode, { sending: false });
        handleSend(undefined, currentForm.config);
      }
    }
  }, [last]);

  return {
    config,
    setConfig,
    sending,
    send: handleSend,
    monitoredIdx,
    unmonitor,
    clear: manualClear,
  };
}
