import { useShallow } from 'zustand/react/shallow';
import { useObjectNavigation } from './useObjectNavigation';
import { useQueue } from './useQueue';
import { useSettings } from './useSettings';
import { useEffect, useState } from 'react';
import { TransactionRequest, TransactionType } from '../models/transaction-request';
import { router } from 'expo-router';
import { useMonitoredFolders } from './useMonitoredFolders';

export function useSender(type: TransactionType) {
  const { clear, initData } = useObjectNavigation(
    useShallow((s) => ({ clear: s.clear, initData: s.object }))
  );
  const [hasOrigin, setHasOrigin] = useState(false);
  const [sending, setSending] = useState(false);
  const [monitoredIdx] = useState<number>(initData?.monitoredIdx ?? -1);

  const send = useQueue((s) => s.send);
  const { config, updateConfig } = useSettings(
    useShallow((s) => ({ config: s.baseConfig, updateConfig: s.udpateConfig }))
  );
  const [req, setReq] = useState<TransactionRequest>({
    sourceMode: 'no-select',
    sources: [],
    author: '',
    title: '',
    monitorize: false,
    ...config,
    ...initData,
    type: type,
  });

  useEffect(() => {
    if (!initData) return;
    setHasOrigin(true);
    clear();
  }, []);

  const handleSend = async () => {
    setSending(true);
    const done = await send(req);
    setSending(false);

    if (done) {
      router.navigate('/(tabs)/queue');
      if (!hasOrigin) {
        updateConfig({
          deleteOrigin: req.deleteOrigin,
          destination: req.destination,
          merge: req.merge,
          model: req.model,
        });
      }
      const isMonitored = monitoredIdx !== -1;
      const isFolder = req.sourceMode === 'folder';

      if (isMonitored) {
        if (req.monitorize && isFolder) {
          useMonitoredFolders.getState().update(req, monitoredIdx);
        } else {
          useMonitoredFolders.getState().remove(monitoredIdx);
        }
      } else if (req.monitorize && !isFolder) {
        useMonitoredFolders.getState().add(req);
      }
    }
  };

  return { sending, req, setReq, handleSend };
}
