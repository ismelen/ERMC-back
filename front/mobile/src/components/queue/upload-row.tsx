import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TransactionUpload } from '../../models/transaction-upload';
import { colors } from '../../theme/colors';
import SIcon from '../icons/SIcon';
import SText from '../shared/SText';
import { RetryButton } from './queue-buttons';

type UploadStatus = TransactionUpload['status'];

const uploadStatusConfig: Record<UploadStatus, { labelKey: string; color: string }> = {
  sending: { labelKey: 'queue.uploadStatus.sending', color: colors.primary },
  done: { labelKey: 'queue.uploadStatus.done', color: colors.ok },
  error: { labelKey: 'queue.uploadStatus.error', color: colors.error },
  pending: { labelKey: 'queue.uploadStatus.pending', color: colors.outline },
};

export function UploadRow({
  upload,
  idx,
  onRetry,
}: {
  upload: TransactionUpload;
  idx: number;
  onRetry(idx: number): void;
}) {
  const { t } = useTranslation();
  const hasError = !!upload.error;
  const { labelKey, color } = uploadStatusConfig[upload.status];

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
          <RetryButton onPress={() => onRetry(idx)} />
        ) : (
          <SText style={[s.meta, { color: color, fontFamily: 'medium' }]}>{t(labelKey)}</SText>
        )}
      </View>
      {hasError && <SText style={s.errorText}>{upload.error}</SText>}
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
