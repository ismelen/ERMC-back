import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { BookMetadata } from '../../models/book-metadata';
import SText from '../shared/SText';
import STextInput from '../shared/STextInput';

interface Props {
  initialMetadata?: BookMetadata;
  onChange(metadata: BookMetadata): void;
}

export default function MetadataSection({ initialMetadata, onChange }: Props) {
  const [metadata, setMetadata] = useState(initialMetadata ?? {});

  useEffect(() => {
    onChange(metadata);
  }, [metadata]);

  return (
    <View style={{ boxShadow: colors.boxShadow, borderRadius: 12, padding: 15, gap: 8 }}>
      <View style={styles.section}>
        <SText style={styles.label}>Title</SText>
        <STextInput onChangeText={(e) => setMetadata((s) => ({ ...s, title: e }))} />
      </View>

      <View style={styles.section}>
        <SText style={styles.label}>Author</SText>
        <STextInput onChangeText={(e) => setMetadata((s) => ({ ...s, author: e }))} />
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
