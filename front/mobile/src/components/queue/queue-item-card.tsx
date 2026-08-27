import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { colors } from '../../theme/colors';
import { Transaction } from '../../models/transaction';
import { useQueue } from '../../hooks/useQueue';
import SButton from '../shared/SButton';
import SText from '../shared/SText';

import { CardHeader } from './card-header';
import { UploadRow } from './upload-row';
import { ItemRow } from './item-row';
import { ResultRow } from './result-row';
import { CancelButton, DownloadAllButton, StartUploadsButton } from './queue-buttons';

const SECTION_MAX_HEIGHT = 160;

interface Props {
  data: Transaction;
  idx: number;
}

export default function QueueItemCard({ data, idx }: Props) {
  const hasUploads = data.uploads.length > 0;
  const hasItems = (data.items?.length ?? 0) > 0;
  const hasResults = (data.results?.length ?? 0) > 0;
  const isError = data.status === 'error';
  const isDone = data.status === 'done';
  const isCancellable = data.status === 'processing' || data.status === 'waiting';

  const { checkProgress, cancel, startUploads, retryUpload, retryItem } = useQueue(
    useShallow((s) => ({
      checkProgress: s.checkProgress,
      cancel: s.cancel,
      startUploads: s.startUploads,
      retryUpload: s.retryUpload,
      retryItem: s.retryItem,
    }))
  );

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => checkProgress(idx), 2000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleRetryUpload = (uploadIdx: number) => {
    retryUpload(idx, uploadIdx);
  };

  const handleRetryItem = (itemId: string) => {
    retryItem(idx, itemId);
  };

  const canStartUploads =
    data.status === 'waiting' && data.uploads.some((u) => u.status === 'pending');

  return (
    <SButton style={[s.card, isError && s.cardError]}>
      {/* Header */}
      <CardHeader data={data} />

      {/* Uploads */}
      {hasUploads && (
        <Section sectionKey="queue.uploads">
          {data.uploads.map((u, i) => (
            <UploadRow key={i} upload={u} idx={i} onRetry={handleRetryUpload} />
          ))}
        </Section>
      )}

      {/* Items */}
      {hasItems && (
        <Section sectionKey="queue.items">
          {data.items.map((item) => (
            <ItemRow key={item.id} item={item} onRetry={handleRetryItem} />
          ))}
        </Section>
      )}

      {/* Results */}
      {hasResults && (
        <Section sectionKey="queue.results">
          <View style={{ gap: 4, flexDirection: 'column' }}>
            {data.results.map((result) => (
              <ResultRow key={result.id} result={result} tran={data} idx={idx} />
            ))}
          </View>
        </Section>
      )}

      {/* Download All button */}
      {!data.config.toCloud && isDone && hasResults && <DownloadAllButton tran={data} idx={idx} />}

      {/* Start Uploads button */}
      {canStartUploads && <StartUploadsButton onPress={() => startUploads?.(idx)} />}

      {/* Cancel button */}
      {isCancellable && <CancelButton onPress={() => cancel(idx)} />}
    </SButton>
  );
}

function Section({ sectionKey, children }: { sectionKey: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 6 }}>
      <SText style={s.sectionTitle}>{t(sectionKey)}</SText>
      <ScrollView style={{ maxHeight: SECTION_MAX_HEIGHT }} nestedScrollEnabled>
        {children}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface_container_lowest,
    borderRadius: 16,
    boxShadow: colors.boxShadow,
    padding: 16,
    gap: 14,
  },
  cardError: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'medium',
    color: colors.on_surface_variant,
  },
});
