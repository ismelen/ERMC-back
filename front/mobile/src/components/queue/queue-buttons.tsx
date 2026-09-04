import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import { Transaction } from '../../models/transaction';
import { useQueue } from '../../hooks/useQueue';
import { TransactionService } from '../../services/transaction-service';
import { colors } from '../../theme/colors';
import SIcon from '../icons/SIcon';
import SButton from '../shared/SButton';
import SText from '../shared/SText';

export function RetryButton({ onPress }: { onPress(): void }) {
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

export function EditFileButton({ onPress }: { onPress(): void }) {
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
        <SIcon name="edit" color={colors.primary} size={18} type="outlined" />
      )}
    </SButton>
  );
}

export function StartUploadsButton({ onPress }: { onPress(): void }) {
  const { t } = useTranslation();
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
    <SButton onPress={handle} disabled={loading} style={s.startUploadsBtn}>
      {loading ? (
        <ActivityIndicator size={16} color={colors.on_primary} />
      ) : (
        <SIcon name="cloud_upload" color={colors.on_primary} size={18} type="outlined" />
      )}
      <SText style={s.startUploadsText}>{t('queue.startUploads', 'Iniciar subidas')}</SText>
    </SButton>
  );
}

export function CancelButton({ onPress }: { onPress(): void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handle = () => {
    Alert.alert(t('queue.cancelTitle'), t('queue.cancelMessage'), [
      { text: t('queue.no'), style: 'cancel' },
      {
        text: t('queue.yesCancel'),
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
      <SText style={s.cancelText}>{t('queue.cancel')}</SText>
    </SButton>
  );
}

export function DownloadAllButton({ tran, idx }: { tran: Transaction; idx: number }) {
  const { t } = useTranslation();
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
        <ActivityIndicator size={18} color={colors.on_primary_container} />
      ) : (
        <SIcon name="download" color={colors.on_primary_container} size={18} type="outlined" />
      )}
      <SText style={s.downloadAllText}>
        {loading ? t('queue.downloading') : t('queue.downloadAll')}
      </SText>
    </SButton>
  );
}

export function RedoButton({ onPress }: { onPress(): void }) {
  const { t } = useTranslation();
  return (
    <SButton onPress={onPress} style={s.redoBtn}>
      <SIcon name="refresh" color={colors.primary} size={18} type="outlined" />
      <SText style={s.redoText}>{t('queue.redo', 'Reenviar')}</SText>
    </SButton>
  );
}

export function ShareAllButton({ tran }: { tran: Transaction }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleShareAll = async () => {
    setLoading(true);
    try {
      for (const result of tran.results) {
        const path = await TransactionService.downloadToCache(tran, result.id);
        if (!path) continue;

        const mimeType = TransactionService.getMimeType(result.filename);
        await Sharing.shareAsync(`file://${path}`, { mimeType, dialogTitle: result.filename });
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SButton onPress={handleShareAll} disabled={loading} style={s.shareAllBtn}>
      {loading ? (
        <ActivityIndicator size={18} color={colors.on_primary_container} />
      ) : (
        <SIcon name="share" color={colors.on_primary_container} size={18} type="outlined" />
      )}
    </SButton>
  );
}

const s = StyleSheet.create({
  iconBtn: {
    padding: 4,
    borderRadius: 8,
  },
  downloadAllBtn: {
    backgroundColor: colors.primary_container,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
  },
  downloadAllText: {
    fontFamily: 'medium',
    color: colors.on_primary_container,
    fontSize: 14,
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
  redoBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary_container,
  },
  redoText: {
    fontFamily: 'medium',
    color: colors.primary,
    fontSize: 14,
  },
  startUploadsBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.primary,
  },
  startUploadsText: {
    fontFamily: 'medium',
    color: colors.on_primary,
    fontSize: 14,
  },
  shareAllBtn: {
    backgroundColor: colors.primary_container,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
