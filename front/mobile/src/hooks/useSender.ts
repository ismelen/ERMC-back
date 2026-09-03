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
import { useEffect, useRef, useState } from 'react';
import { useSettings } from './useSettings';
import { useQueue } from './useQueue';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useMonitoredFolders } from './useMonitoredFolders';
import { StorageService } from '../services/storage-service';

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
    merge: mode === 'cbz' ? settings.merge : false,
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
  // Guard: ensures the OAuth-return auto-send fires exactly once per navigation round-trip
  const oauthRetryFired = useRef(false);

  const handleSend = async (
    files?: any[],
    overrideConfig?: TransactionConfig
  ): Promise<boolean> => {
    const finalConfig = overrideConfig ?? config;
    if (files) finalConfig.files = files;

    if (!finalConfig.model || finalConfig.model === '') return false;

    if (settings.model) {
      const differentModel = finalConfig.model !== settings.model;
      if (differentModel) alert('Different model selected');
    }

    setSending(true);
    await StorageService.SetAsync('oauth_return', 'true');
    await StorageService.SetAsync<State>(LAST_STATE, {
      config: finalConfig,
      sending: true,
      monitoredIdx: monitoredIdx,
    });

    const done = await send(finalConfig, router.canGoBack() ? pathname : undefined);
    setSending(false);

    if (!done) {
      await StorageService.SetAsync<State>(LAST_STATE, { config: finalConfig, sending: false });
      return false;
    }

    router.navigate('/(tabs)/queue');
    if (monitoredIdx === undefined) {
      setSettings({ ...finalConfig, model: settings.model });
      if (finalConfig.model !== settings.model) {
        setModel(finalConfig.model);
      }
      if (finalConfig.monitoredIdx !== undefined && finalConfig.folder) addMonitored(finalConfig);
    } else {
      if (finalConfig.monitoredIdx !== undefined && finalConfig.folder) {
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
      setMonitoredIdx(undefined);
      setConfig((s) => ({ ...s, monitoredIdx: undefined }));
    }
  };

  useEffect(() => {
    if (initData) {
      setConfig((s) => ({ ...s, ...initData }));
      setMonitoredIdx(initData?.monitoredIdx);
    }
    clear();

    StorageService.GetAsync<string>('oauth_return').then((isReturn) => {
      if ((String(last) === 'true' || isReturn === 'true') && !oauthRetryFired.current) {
        oauthRetryFired.current = true;
        StorageService.RemoveAsync('oauth_return');
        StorageService.GetAsync<State>(LAST_STATE).then(async (e) => {
          if (!e) return;
          setConfig(e.config);
          setMonitoredIdx(e.monitoredIdx);

          if (e.sending) {
            // Clear the sending flag BEFORE retrying so a second failure does not loop
            await StorageService.SetAsync<State>(LAST_STATE, { ...e, sending: false });
            handleSend(undefined, e.config);
          }
        });
      }
    });
  }, [last]);

  const saveState = async () => {
    await StorageService.SetAsync('oauth_return', 'true');
    await StorageService.SetAsync<State>(LAST_STATE, {
      config,
      sending: false,
      monitoredIdx,
    });
  };

  return { config, setConfig, sending, send: handleSend, monitoredIdx, unmonitor, saveState };
}
