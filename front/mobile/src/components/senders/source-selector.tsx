import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSource } from '../../hooks/useSource';
import { TransactionSource } from '../../models/transaction-source';
import { colors } from '../../theme/colors';
import SIcon from '../icons/SIcon';
import SButton from '../shared/SButton';
import SText from '../shared/SText';

interface Props {
  initFolder?: TransactionSource;
  initFiles: TransactionSource[];
  onChange(files: TransactionSource[], folder?: TransactionSource): void;
  enabled?: boolean;
}

export default function SourceSelector({ initFolder, initFiles, onChange, enabled = true }: Props) {
  const { files, folder, addFiles, addFolder, deleteSource, loading } = useSource(
    initFolder,
    initFiles
  );

  useEffect(() => {
    onChange(files, folder);
  }, [files, folder]);

  if (loading) {
    return (
      <View
        style={{
          backgroundColor: colors.surface_container_low,
          paddingVertical: 20,
          borderRadius: 12,
        }}
      >
        <ActivityIndicator size={30} color={colors.primary} />
      </View>
    );
  }

  if (folder) {
    return (
      <SourcesViewer
        sources={[folder]}
        deleteSource={deleteSource}
        mode={'folder'}
        enabled={enabled}
      />
    );
  }

  if (files.length > 0) {
    return (
      <View style={{ gap: 10 }}>
        <SourcesViewer sources={files} deleteSource={deleteSource} mode={'files'} />
        <AddMore onClick={addFiles} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Option label="Add Files" icon="upload_file" onClick={addFiles} />
      <Option label="Add Folder" icon="folder_open" onClick={addFolder} />
    </View>
  );
}

function SourcesViewer({
  sources,
  deleteSource,
  mode,
  enabled = true,
}: {
  sources: TransactionSource[];
  deleteSource(index: number): void;
  mode: 'files' | 'folder' | 'no-select';
  enabled?: boolean;
}) {
  return (
    <View
      style={{
        borderRadius: 12,
        backgroundColor: colors.surface_container_lowest,
        boxShadow: colors.boxShadow,
      }}
    >
      {sources.map((src, idx) => (
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 8,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            overflow: 'hidden',
            borderTopWidth: 0.5,
            borderTopColor:
              idx !== 0 && sources.length > 0 ? colors.outline_variant : 'transparent',
          }}
          key={`${idx}${src.src}`}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
            }}
          >
            <SIcon name={mode === 'files' ? 'docs' : 'folder'} size={24} color={colors.primary} />
            <SText
              style={{ fontFamily: 'semibold', flex: 1 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {src.name}
            </SText>
          </View>
          {enabled && (
            <SButton onPress={() => deleteSource(idx)}>
              <SIcon name="delete" size={24} color={colors.primary} type="outlined" />
            </SButton>
          )}
        </View>
      ))}
    </View>
  );
}

function AddMore({ onClick }: { onClick(): void }) {
  return (
    <SButton
      onPress={onClick}
      style={{
        borderRadius: 12,
        paddingVertical: 10,
        backgroundColor: colors.primary_container,
        boxShadow: colors.boxShadow,
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      <SText
        style={{
          color: colors.on_primary,
          fontFamily: 'semibold',
          fontSize: 16,
        }}
      >
        + Add more
      </SText>
    </SButton>
  );
}

function Option({ icon, label, onClick }: { icon: string; label: string; onClick(): void }) {
  return (
    <SButton
      onPress={onClick}
      style={{
        borderRadius: 12,
        backgroundColor: colors.surface_container_lowest,
        boxShadow: colors.boxShadow,
        paddingVertical: 20,
        overflow: 'hidden',
        alignItems: 'center',
        flex: 1,
        gap: 5,
      }}
    >
      <SIcon name={icon} size={32} color={colors.primary} />
      <SText style={{ color: colors.primary, fontFamily: 'semibold', fontSize: 14 }}>{label}</SText>
    </SButton>
  );
}
