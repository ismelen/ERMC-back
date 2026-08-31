import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TransactionFile } from '../../models/transaction-file';
import { colors } from '../../theme/colors';
import SIcon from '../icons/SIcon';
import SText from '../shared/SText';
import { RetryButton } from './queue-buttons';

type FileStatus = TransactionFile['status'];

const fileStatusConfig: Record<FileStatus, { labelKey: string; color: string; icon?: string }> = {
  processing: { labelKey: 'queue.fileStatus.converting', color: colors.primary, icon: 'autorenew' },
  pending: { labelKey: 'queue.fileStatus.pending', color: colors.outline },
  done: { labelKey: 'queue.fileStatus.done', color: colors.ok, icon: 'check_circle' },
  error: { labelKey: 'queue.fileStatus.error', color: colors.error, icon: 'info' },
  unknown: { labelKey: 'queue.fileStatus.unknown', color: colors.outline },
};

export function ItemRow({ item, onRetry }: { item: TransactionFile; onRetry(id: string): void }) {
  const { t } = useTranslation();
  const cfg = fileStatusConfig[item.status] || fileStatusConfig['unknown'];
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
          <RetryButton onPress={() => onRetry(item.id)} />
        ) : (
          <SText
            style={[s.meta, { color: cfg.color, fontFamily: isProcessing ? 'regular' : 'medium' }]}
          >
            {t(cfg.labelKey)}
          </SText>
        )}
      </View>
      {hasError && item.error && <SText style={s.errorText}>{item.error}</SText>}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 12,
    color: colors.outline,
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
});
