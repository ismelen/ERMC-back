import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import SButton from '../shared/SButton';
import SText from '../shared/SText';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'expo-router';
import { useCloud } from '../../hooks/useCloud';
import { useShallow } from 'zustand/react/shallow';
import SIcon from '../icons/SIcon';
import CloudConfig from '../shared/cloud-config';

interface Props {
  toCloud: boolean;
  onChange(toCloud: boolean): void;
}

export default function DestinationSelector({ toCloud, onChange }: Props) {
  const [cloudDestination, setCloudDestination] = useState(toCloud);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const destinations: { labelKey: string; value: boolean }[] = [
    { labelKey: 'destination.local', value: false },
    { labelKey: 'destination.cloud', value: true },
  ];

  useEffect(() => {
    onChange(cloudDestination);
  }, [cloudDestination]);

  const { oauth, folder, getFolder, getToken, logout } = useCloud(
    useShallow((s) => ({
      oauth: s.oauth,
      folder: s.folder,
      getToken: s.getToken,
      getFolder: s.getFolder,
      logout: s.logout,
    }))
  );

  const pathname = usePathname();

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          borderRadius: 12,
          backgroundColor: colors.surface_container_lowest,
          boxShadow: colors.boxShadow,
          padding: 5,
          flexDirection: 'row',
          gap: 5,
        }}
      >
        {destinations.map((dest) => (
          <SButton
            key={dest.labelKey}
            onPress={() => setCloudDestination(dest.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 7,
              backgroundColor:
                dest.value === cloudDestination ? colors.primary_container : 'transparent',
            }}
          >
            <SText
              style={{
                fontFamily: 'semibold',
                color: dest.value === cloudDestination ? colors.on_primary : colors.on_surface,
              }}
            >
              {t(dest.labelKey)}
            </SText>
          </SButton>
        ))}
      </View>

      {cloudDestination && <CloudConfig />}
    </View>
  );
}
