import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../theme/colors';
import SButton from '../shared/SButton';
import SText from '../shared/SText';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'expo-router';
import { useCloud } from '../../hooks/useCloud';
import { useShallow } from 'zustand/react/shallow';
import SIcon from '../icons/SIcon';

interface Props {
  toCloud: boolean;
  onChange(toCloud: boolean): void;
  onConnect?(): Promise<void>;
}

export default function DestinationSelector({ toCloud, onChange, onConnect }: Props) {
  const [cloudDestination, setCloudDestination] = useState(toCloud);
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

      {cloudDestination && (
        <View style={{ gap: 10 }}>
          <View
            style={{
              boxShadow: colors.boxShadow,
              borderRadius: 12,
              backgroundColor: colors.surface_container_lowest,
              padding: 10,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <SIcon name="cloud" color={colors.primary} size={32} type="outlined" />
              <SText style={{ fontSize: 18, flex: 1, fontFamily: 'semibold' }}>Dropbox</SText>
              <SButton
                onPress={async () => {
                  if (oauth?.email) {
                    logout();
                  } else {
                    if (onConnect) await onConnect();
                    getToken(`${pathname}?last=true`, true);
                  }
                }}
                style={{
                  borderWidth: 1,
                  borderColor: colors.primary_fixed,
                  alignSelf: 'flex-start',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 12,
                }}
              >
                <SText style={{ fontFamily: 'semibold', color: colors.primary }}>
                  {oauth?.email ? t('settings.disconnect') : t('settings.connect')}
                </SText>
              </SButton>
            </View>
            {oauth?.email && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 5,
                  alignItems: 'center',
                  marginTop: 5,
                }}
              >
                <SIcon name="check_circle" color={colors.primary} size={14} />
                <SText style={{ fontSize: 12, color: colors.primary, fontFamily: 'semibold' }}>
                  {t('settings.connectedAs', { email: oauth.email })}
                </SText>
              </View>
            )}
          </View>

          {oauth?.email && (
            <View
              style={{
                boxShadow: colors.boxShadow,
                backgroundColor: colors.surface_container_lowest,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <SText style={{ fontSize: 14, fontFamily: 'semibold', marginBottom: 2 }}>
                {t('settings.folder')}
              </SText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View
                  style={{
                    flex: 1,
                    borderWidth: 0.5,
                    borderColor: colors.outline,
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <SText>{folder ?? t('settings.selectFolder')}</SText>
                </View>
                <SButton
                  onPress={() => getFolder(true)}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 12,
                    justifyContent: 'center',
                  }}
                >
                  <SText
                    style={{
                      color: colors.on_primary,
                      fontFamily: 'semibold',
                    }}
                  >
                    {t('settings.browse')}
                  </SText>
                </SButton>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
