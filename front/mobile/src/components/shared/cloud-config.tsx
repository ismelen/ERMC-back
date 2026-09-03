import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import SButton from './SButton';
import SText from './SText';
import SIcon from '../icons/SIcon';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'expo-router';
import { useCloud } from '../../hooks/useCloud';
import { useShallow } from 'zustand/react/shallow';
import SConfirmDialog from './SConfirmDialog';

export default function CloudConfig() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const { oauth, folder, getFolder, getToken, logout, showFolderAlert, setShowFolderAlert } =
    useCloud(
      useShallow((s) => ({
        oauth: s.oauth,
        folder: s.folder,
        getToken: s.getToken,
        getFolder: s.getFolder,
        logout: s.logout,
        showFolderAlert: s.showFolderAlert,
        setShowFolderAlert: s.setShowFolderAlert,
      }))
    );

  return (
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
              setLoading(true);
              if (oauth?.email) {
                await logout();
              } else {
                await getToken(pathname, true);
              }
              setLoading(false);
            }}
            disabled={loading}
            style={{
              borderWidth: 1,
              borderColor: loading ? colors.outline : colors.primary_fixed,
              alignSelf: 'flex-start',
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 12,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <SText style={{ fontFamily: 'semibold', color: colors.primary }}>
                {oauth?.email ? t('settings.disconnect') : t('settings.connect')}
              </SText>
            )}
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
        <SButton
          onPress={() => getFolder(true)}
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
            <View
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
            </View>
          </View>
        </SButton>
      )}

      <SConfirmDialog
        visible={showFolderAlert}
        title={t('common.error')}
        message={t('settings.selectFolder')}
        onConfirm={() => setShowFolderAlert(false)}
      />
    </View>
  );
}
