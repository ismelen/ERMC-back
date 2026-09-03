import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, hexToRgba } from '../../theme/colors';
import { BookMetadata } from '../../models/book-metadata';
import SText from '../shared/SText';
import STextInput from '../shared/STextInput';
import { useTranslation } from 'react-i18next';

interface Props {
  initialMetadata?: BookMetadata;
  onChange(metadata: BookMetadata): void;
}

export default function MetadataSection({ initialMetadata, onChange }: Props) {
  const [metadata, setMetadata] = useState(initialMetadata ?? {});
  const { t } = useTranslation();

  useEffect(() => {
    onChange(metadata);
  }, [metadata]);

  useEffect(() => {
    if (initialMetadata?.title !== undefined || initialMetadata?.author !== undefined) {
      setMetadata((s) => ({
        ...s,
        title: initialMetadata.title ?? s.title,
        author: initialMetadata.author ?? s.author,
      }));
    }
  }, [initialMetadata?.title, initialMetadata?.author]);

  return (
    <View
      style={{
        boxShadow: colors.boxShadow,
        borderRadius: 12,
        padding: 15,
        gap: 8,
        backgroundColor: colors.surface_container_lowest,
      }}
    >
      <View style={styles.section}>
        <SText style={styles.label}>{t('metadata.title')}</SText>
        <STextInput
          style={{
            borderColor: hexToRgba(colors.outline_variant, 0.2),
            borderWidth: 1,
          }}
          value={initialMetadata?.title}
          placeholder={t('metadata.title')}
          onChangeText={(e) => setMetadata((s) => ({ ...s, title: e }))}
        />
      </View>

      <View style={styles.section}>
        <SText style={styles.label}>{t('metadata.author')}</SText>
        <STextInput
          value={initialMetadata?.author}
          style={{
            borderWidth: 1,
            borderColor: hexToRgba(colors.outline_variant, 0.2),
          }}
          placeholder={t('metadata.author')}
          onChangeText={(e) => setMetadata((s) => ({ ...s, author: e }))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 5,
  },
  label: {
    fontFamily: 'semibold',
  },
});
