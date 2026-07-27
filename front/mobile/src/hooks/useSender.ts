// import { useShallow } from 'zustand/react/shallow';
// import { useObjectNavigation } from './useObjectNavigation';
// import { useQueue } from './useQueue';
// import { useSettings } from './useSettings';
// import { useEffect, useState } from 'react';
// import { router } from 'expo-router';
// import { useMonitoredFolders } from './useMonitoredFolders';
// import { TransactionMode } from '../models/transaction-config';

import { useShallow } from 'zustand/react/shallow';
import { TransactionConfig, TransactionMode } from '../models/transaction-config';
import { useObjectNavigation } from './useObjectNavigation';
import { useEffect, useState } from 'react';
import { useSettings } from './useSettings';
import { useQueue } from './useQueue';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useMonitoredFolders } from './useMonitoredFolders';
import { StorageService } from '../services/storage-service';
import { setLocalesAsync } from '@expo/config-plugins/build/android/Locales.js';

interface State {
  config: TransactionConfig;
  monitoredIdx?: number;
  sending: boolean;
}

const LAST_STATE = 'last_sender_state';

export function useSender(mode: TransactionMode) {
  const { clear, initData } = useObjectNavigation(
    useShallow((s) => ({ clear: s.clear, initData: s.object }))
  );

  const { last } = useLocalSearchParams();
  const pathname = usePathname();

  const { settings, setSettings, setModel } = useSettings(
    useShallow((s) => ({ settings: s.settings, setSettings: s.setSettings, setModel: s.setModel }))
  );

  const [config, setConfig] = useState<TransactionConfig>({
    title: '',
    author: '',
    merge: settings.merge,
    model: settings.model,
    toCloud: settings.toCloud,
    ...initData,
    mode: mode,
  });

  const [monitoredIdx, setMonitoredIdx] = useState<number | undefined>();
  const { addMonitored, removeMonitored, updateMonitored } = useMonitoredFolders(
    useShallow((s) => ({
      addMonitored: s.add,
      updateMonitored: s.update,
      removeMonitored: s.remove,
    }))
  );

  const send = useQueue((s) => s.send);
  const [sending, setSending] = useState(false);
  const handleSend = async (): Promise<boolean> => {
    if (!config.model || config.model === '') return false;

    if (settings.model) {
      const differentModel = config.model !== settings.model;
      if (differentModel) alert('Different model selected'); // TODO: Better dialogs with cancel...
    }

    setSending(true);
    await StorageService.SetAsync<State>(LAST_STATE, {
      config: config,
      sending: true,
      monitoredIdx: monitoredIdx,
    });
    const done = await send(config, pathname);
    setSending(false);

    if (!done) return false;

    router.navigate('/(tabs)/queue');
    if (!monitoredIdx) {
      setSettings({ ...config, model: settings.model });
      if (config.model !== settings.model) {
        // TODO: Ask if user wants to change model (dialog)
        setModel(config.model);
      }

      if (config.monitoredIdx && config.folder) addMonitored(config);
    } else {
      if (config.monitoredIdx && config.folder) {
        updateMonitored(config, monitoredIdx);
      } else {
        removeMonitored(monitoredIdx);
      }
    }

    return true;
  };

  useEffect(() => {
    if (initData) {
      setMonitoredIdx(initData?.monitoredIdx);
    }
    clear();

    if (last === 'true') {
      StorageService.GetAsync<State>(LAST_STATE).then((e) => {
        if (!e) return;
        setConfig(e.config);
        setMonitoredIdx(e.monitoredIdx);
        setSending(e.sending);
      });
    }
  }, []);

  return { config, setConfig, sending, send: handleSend };
}
