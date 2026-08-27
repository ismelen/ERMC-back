import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Transaction } from '../../models/transaction';
import { TransactionResult } from '../../models/transaction-result';
import { useQueue } from '../../hooks/useQueue';
import { TransactionService } from '../../services/transaction-service';
import { colors } from '../../theme/colors';
import SIcon from '../icons/SIcon';
import SButton from '../shared/SButton';
import SText from '../shared/SText';
import * as Sharing from 'expo-sharing';

export function ResultRow({
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

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 13,
    color: colors.on_surface,
    flexShrink: 1,
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
});
