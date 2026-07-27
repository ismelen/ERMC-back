import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Transaction } from '../../models/transaction';
import { TransactionFile } from '../../models/transaction-file';
import { TransactionResult } from '../../models/transaction-result';
import { TransactionUpload } from '../../models/transaction-upload';
import { useQueue } from '../../hooks/useQueue';
import { TransactionService } from '../../services/transaction-service';
import SIcon from '../icons/SIcon';
import SButton from '../shared/SButton';
import SText from '../shared/SText';
import { useShallow } from 'zustand/react/shallow';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';

// --- Status config ---

type TransactionStatus = Transaction['status'];

const statusConfig: Record<TransactionStatus, { label: string; bg: string; fg: string }> = {
  processing: { label: 'PROCESSING', bg: colors.primary_fixed, fg: colors.on_primary },
  merging: { label: 'MERGING', bg: colors.secondary_fixed, fg: colors.on_secondary_fixed },
  error: { label: 'ERROR', bg: colors.error_container, fg: colors.error },
  done: { label: 'DONE', bg: colors.ok, fg: '#ffffff' },
  waiting: { label: 'WAITING', bg: colors.surface_container_high, fg: colors.on_surface_variant },
  canceled: { label: 'CANCELED', bg: colors.outline_variant, fg: colors.on_surface_variant },
  unknown: { label: 'UNKNOWN', bg: colors.surface_container_high, fg: colors.on_surface_variant },
};

type FileStatus = TransactionFile['status'];

const fileStatusConfig: Record<FileStatus, { label: string; color: string; icon?: string }> = {
  processing: { label: 'Converting...', color: colors.primary, icon: 'autorenew' },
  pending: { label: 'Pending', color: colors.outline },
  done: { label: 'Done', color: colors.ok, icon: 'check_circle' },
  error: { label: 'Error', color: colors.error, icon: 'info' },
  unknown: { label: 'Unknown', color: colors.outline },
};

type UploadStatus = TransactionUpload['status'];

const uploadStatusConfig: Record<UploadStatus, { label: string; color: string }> = {
  sending: { label: 'Sending...', color: colors.primary },
  done: { label: 'Done', color: colors.ok },
  error: { label: 'Error', color: colors.error },
};

const SECTION_MAX_HEIGHT = 160;

// --- Main Component ---

interface Props {
  data: Transaction;
  idx: number;
  onRetry?(tranId: string): void;
}

export default function QueueItemCard({ data, idx, onRetry }: Props) {
  const hasUploads = data.uploads.length > 0;
  const hasItems = (data.items?.length ?? 0) > 0;
  const hasResults = (data.results?.length ?? 0) > 0;
  const isError = data.status === 'error';
  const isDone = data.status === 'done';
  const isCancellable = data.status === 'processing' || data.status === 'waiting';

  const { checkProgress, cancel } = useQueue(
    useShallow((s) => ({ checkProgress: s.checkProgress, cancel: s.cancel }))
  );

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => checkProgress(idx), 2000);
      return () => clearInterval(interval);
    }, [])
  );

  // const handleRetry = () => onRetry?.(data.id);
  const handleRetry = () => {};

  return (
    <SButton onPress={() => onRetry?.(data.id)} style={[s.card, isError && s.cardError]}>
      {/* Header */}
      <CardHeader data={data} />

      {/* Uploads */}
      {hasUploads && (
        <Section title="Uploads">
          {data.uploads.map((u, i) => (
            <UploadRow key={i} upload={u} onRetry={handleRetry} />
          ))}
        </Section>
      )}

      {/* Items */}
      {hasItems && (
        <Section title="Items">
          {data.items.map((item) => (
            <ItemRow key={item.id} item={item} onRetry={handleRetry} />
          ))}
        </Section>
      )}

      {/* Results */}
      {hasResults && (
        <Section title="Results">
          <View style={{ gap: 4, flexDirection: 'column' }}>
            {data.results.map((result) => (
              <ResultRow key={result.id} result={result} tran={data} idx={idx} />
            ))}
          </View>
        </Section>
      )}

      {/* Download All button */}
      {!data.config.toCloud && isDone && hasResults && <DownloadAllButton tran={data} idx={idx} />}

      {/* Cancel button */}
      {isCancellable && <CancelButton onPress={() => cancel(idx)} />}
    </SButton>
  );
}

// --- Card Header ---

function CardHeader({ data }: { data: Transaction }) {
  const title = data.config.title || `Transaction ${data.id.slice(0, 8)}`;
  const cfg = statusConfig[data.status];
  const isProcessing = data.status === 'processing';

  return (
    <View style={{ gap: 6 }}>
      <View style={s.row}>
        <View style={[s.row, { flex: 1, gap: 8 }]}>
          {isProcessing && <SIcon name="autorenew" color={colors.primary} size={20} />}
          <SText style={s.title} numberOfLines={2}>
            {title}
          </SText>
        </View>
        <StatusBadge label={cfg.label} bg={cfg.bg} fg={cfg.fg} />
      </View>
      <View style={[s.row, { gap: 12 }]}>
        <FormatBadge mode={data.config.mode} />
        <DestinationBadge toCloud={data.config.toCloud} />
      </View>
    </View>
  );
}

// --- Reusable Badges ---

function StatusBadge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <SText style={{ color: fg, fontSize: 10, fontFamily: 'semibold' }}>{label}</SText>
    </View>
  );
}

function FormatBadge({ mode }: { mode: string }) {
  return (
    <View style={[s.row, { gap: 4 }]}>
      <SText style={s.meta}>Format:</SText>
      <SText style={[s.meta, { fontFamily: 'medium' }]}>{mode}</SText>
    </View>
  );
}

function DestinationBadge({ toCloud }: { toCloud: boolean }) {
  return (
    <View style={[s.row, { gap: 4 }]}>
      <SIcon name="cloud" color={colors.outline} size={14} type="outlined" />
      <SText style={s.meta}>{toCloud ? 'Cloud' : 'Local'}</SText>
    </View>
  );
}

// --- Section with ScrollView ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <SText style={s.sectionTitle}>{title}</SText>
      <ScrollView style={{ maxHeight: SECTION_MAX_HEIGHT }} nestedScrollEnabled>
        {children}
      </ScrollView>
    </View>
  );
}

// --- Row: Upload ---

function UploadRow({ upload, onRetry }: { upload: TransactionUpload; onRetry(): void }) {
  const hasError = !!upload.error;
  const { label, color } = uploadStatusConfig[upload.status];

  return (
    <View style={{ gap: 2 }}>
      <View style={s.fileRow}>
        <View style={[s.row, { flex: 1, gap: 6 }]}>
          <SIcon
            name={hasError ? 'info' : 'check_circle'}
            color={hasError ? colors.error : colors.ok}
            size={16}
            type="outlined"
          />
          <SText style={s.fileName} numberOfLines={1}>
            {upload.file.name}
          </SText>
        </View>
        {hasError ? (
          <RetryButton onPress={onRetry} />
        ) : (
          <SText style={[s.meta, { color: color, fontFamily: 'medium' }]}>{label}</SText>
        )}
      </View>
      {hasError && <SText style={s.errorText}>{upload.error}</SText>}
    </View>
  );
}

// --- Row: Item ---

function ItemRow({ item, onRetry }: { item: TransactionFile; onRetry(): void }) {
  const cfg = fileStatusConfig[item.status];
  const hasError = item.status === 'error';
  const isProcessing = item.status === 'processing';

  return (
    <View>
      <View style={s.fileRow}>
        <View style={[s.row, { flex: 1, gap: 6 }]}>
          {cfg.icon ? (
            <SIcon
              name={cfg.icon}
              color={cfg.color}
              size={16}
              type={hasError ? 'outlined' : 'filled'}
            />
          ) : (
            <SIcon name="docs" color={colors.outline} size={16} />
          )}
          <SText style={s.fileName} numberOfLines={1}>
            {item.title}
          </SText>
        </View>
        {hasError ? (
          <RetryButton onPress={onRetry} />
        ) : (
          <SText
            style={[s.meta, { color: cfg.color, fontFamily: isProcessing ? 'regular' : 'medium' }]}
          >
            {cfg.label}
          </SText>
        )}
      </View>
      {hasError && item.error && <SText style={s.errorText}>{item.error}</SText>}
    </View>
  );
}

// --- Row: Result ---

function ResultRow({
  result,
  tran,
  idx,
}: {
  result: TransactionResult;
  tran: Transaction;
  idx: number;
}) {
  const download = useQueue((s) => s.download);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const path = await TransactionService.downloadToCache(tran, result.id);
      if (!path) return;

      const mimeType = TransactionService.getMimeType(result.filename);
      await Sharing.shareAsync(`file://${path}`, { mimeType, dialogTitle: result.filename });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await download(idx, result.id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={s.resultRow}>
      <SText style={[s.fileName, { flex: 1 }]} numberOfLines={1}>
        {result.filename}
      </SText>
      <View style={[s.row, { gap: 4 }]}>
        <SButton onPress={handleShare} disabled={sharing} style={s.iconBtn}>
          {sharing ? (
            <ActivityIndicator size={18} color={colors.primary} />
          ) : (
            <SIcon name="chevron_right" color={colors.primary} size={20} type="outlined" />
          )}
        </SButton>
        {!tran.config.toCloud && (
          <SButton onPress={handleDownload} disabled={downloading} style={s.iconBtn}>
            {downloading ? (
              <ActivityIndicator size={18} color={colors.primary} />
            ) : (
              <SIcon name="download" color={colors.primary} size={20} type="outlined" />
            )}
          </SButton>
        )}
      </View>
    </View>
  );
}

// --- Retry Button ---

function RetryButton({ onPress }: { onPress(): void }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await onPress();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SButton onPress={handle} disabled={loading} style={s.iconBtn}>
      {loading ? (
        <ActivityIndicator size={16} color={colors.primary} />
      ) : (
        <SIcon name="repeat" color={colors.primary} size={18} type="outlined" />
      )}
    </SButton>
  );
}

// --- Cancel Button ---

function CancelButton({ onPress }: { onPress(): void }) {
  const [loading, setLoading] = useState(false);

  const handle = () => {
    Alert.alert('Cancel transaction', 'Are you sure you want to cancel this transaction?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await onPress();
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SButton onPress={handle} disabled={loading} style={s.cancelBtn}>
      {loading ? (
        <ActivityIndicator size={16} color={colors.error} />
      ) : (
        <SIcon name="close" color={colors.error} size={18} type="outlined" />
      )}
      <SText style={s.cancelText}>Cancel</SText>
    </SButton>
  );
}

// --- Download All ---

function DownloadAllButton({ tran, idx }: { tran: Transaction; idx: number }) {
  const download = useQueue((s) => s.download);
  const [loading, setLoading] = useState(false);

  const handleDownloadAll = async () => {
    setLoading(true);
    try {
      await Promise.all(tran.results.map((r) => download(idx, r.id)));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SButton onPress={handleDownloadAll} disabled={loading} style={s.downloadAllBtn}>
      {loading ? (
        <ActivityIndicator size={20} color={colors.on_primary} />
      ) : (
        <SIcon name="download" color={colors.on_primary} size={22} type="outlined" />
      )}
      <SText style={s.downloadAllText}>{loading ? 'Downloading...' : 'Download All Results'}</SText>
    </SButton>
  );
}

// --- Styles ---

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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'semibold',
    color: colors.on_surface,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  meta: {
    fontSize: 12,
    color: colors.outline,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'medium',
    color: colors.on_surface_variant,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  fileName: {
    fontSize: 13,
    color: colors.on_surface,
    flexShrink: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'medium',
    color: colors.error,
    marginLeft: 22,
  },
  iconBtn: {
    padding: 4,
    borderRadius: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface_container_low,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  downloadAllBtn: {
    backgroundColor: colors.primary_container,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
  },
  downloadAllText: {
    fontFamily: 'semibold',
    color: colors.on_primary,
    fontSize: 15,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.error_container,
  },
  cancelText: {
    fontFamily: 'medium',
    color: colors.error,
    fontSize: 14,
  },
});
