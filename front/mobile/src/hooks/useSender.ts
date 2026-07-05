import { useShallow } from 'zustand/react/shallow';
import { useObjectNavigation } from './useObjectNavigation';
import { useQueue } from './useQueue';
import { useSettings } from './useSettings';
import { useEffect, useState } from 'react';
import { TransactionRequest, TransactionType } from '../models/transaction-request';
import { router } from 'expo-router';

export function useSender(type: TransactionType) {
  const { clear, initData } = useObjectNavigation(
    useShallow((s) => ({ clear: s.clear, initData: s.object }))
  );
  const [hasOrigin, setHasOrigin] = useState(false);

  const send = useQueue((s) => s.send);
  const { config, updateConfig } = useSettings(
    useShallow((s) => ({ config: s.baseConfig, updateConfig: s.udpateConfig }))
  );
  const [req, setReq] = useState<TransactionRequest>({
    sourceMode: 'no-select',
    sources: [],
    author: '',
    title: '',
    ...config,
    ...initData,
    type: type,
  });

  const [sending, setSending] = useState(false);

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
    }
  };

  return { sending, req, setReq, handleSend };
}
