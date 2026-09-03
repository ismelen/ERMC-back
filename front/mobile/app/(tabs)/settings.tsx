import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import SText from '../../src/components/shared/SText';
import { colors } from '../../src/theme/colors';
import SSelect from '../../src/components/shared/SSelect';
import { eReaderProfiles } from '../../src/constants';
import { useSettings } from '../../src/hooks/useSettings';
import { useShallow } from 'zustand/react/shallow';
import SIcon from '../../src/components/icons/SIcon';
import { useCloud } from '../../src/hooks/useCloud';
import SButton from '../../src/components/shared/SButton';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SupportedLanguage } from '../../src/i18n/i18n';
import SConfirmDialog from '../../src/components/shared/SConfirmDialog';

const languageOptions: { value: SupportedLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

export default function SettingsPage() {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  const { settings, setModel, setLanguage } = useSettings(
    useShallow((s) => ({ settings: s.settings, setModel: s.setModel, setLanguage: s.setLanguage }))
  );

  const { oauth, folder, getFolder, getToken, logout, showAuthConfirm, resolveAuthConfirm } =
    useCloud(
      useShallow((s) => ({
        oauth: s.oauth,
        folder: s.folder,
        getToken: s.getToken,
        getFolder: s.getFolder,
        logout: s.logout,
        showAuthConfirm: s.showAuthConfirm,
        resolveAuthConfirm: s.resolveAuthConfirm,
      }))
    );

  return (
    <>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
        <SText style={{ fontFamily: 'bold', fontSize: 28 }}>{t('settings.title')}</SText>
        <View style={{ marginTop: 14, gap: 4 }}>
          <SText style={styles.title}>{t('settings.readerModel')}</SText>
          <SSelect
            value={settings.model}
            options={eReaderProfiles}
            onOptionChange={(opt) => setModel(opt.value)}
          />
        </View>

        <View style={{ marginTop: 32, gap: 4 }}>
          <SText style={styles.title}>{t('settings.language')}</SText>
          <SSelect
            value={settings.language ?? (i18n.resolvedLanguage || i18n.language || 'en')}
            options={languageOptions}
            onOptionChange={(opt) => setLanguage(opt.value as SupportedLanguage)}
          />
        </View>

        <View style={{ marginTop: 32, gap: 4 }}>
          <SText style={styles.title}>{t('settings.cloudSync')}</SText>
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
                onPress={() => (oauth?.email ? logout() : getToken(pathname, true))}
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
        </View>

        {oauth?.email && (
          <View
            style={{
              marginTop: 10,
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
      </ScrollView>
      <SConfirmDialog
        visible={showAuthConfirm}
        title={t('common.authConfirmTitle')}
        message={t('common.authConfirmMessage')}
        confirmText={t('common.authConfirmOk')}
        cancelText={t('common.cancel')}
        onCancel={() => resolveAuthConfirm(false)}
        onConfirm={() => resolveAuthConfirm(true)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'semibold',
    fontSize: 14,
    color: colors.on_surface_variant,
  },
});
