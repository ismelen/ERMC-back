import React from 'react';
import { StyleSheet, View } from 'react-native';
import SText from '../src/components/shared/SText';
import { Stack, usePathname } from 'expo-router';
import { colors } from '../src/theme/colors';
import SourceSelector from '../src/components/senders/source-selector';
import DestinationSelector from '../src/components/senders/destination-selector';
import OptionCardChecker from '../src/components/senders/option-card-checker';
import SButton from '../src/components/shared/SButton';
import SSelect from '../src/components/shared/SSelect';
import { eReaderProfiles } from '../src/constants';
import LoadingScreen from '../src/components/shared/loading-screen';
import { useSender } from '../src/hooks/useSender';
import { useTranslation } from 'react-i18next';

export default function SendBookPage() {
  const { sending, config, setConfig, send } = useSender('epub');
  const { t } = useTranslation();

  if (sending)
    return (
      <LoadingScreen
        title={t('loading.sendingBook')}
        subtitle={t('loading.optimizing')}
      />
    );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('sendBook.title'),
          headerTitleStyle: { fontFamily: 'semibold', fontSize: 20, color: colors.on_background },
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
        }}
      />
      <View style={{ flex: 1, paddingBottom: 24, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, gap: 32 }}>
          <View>
            <SText style={styles.title}>{t('sendBook.source')}</SText>
            <SourceSelector
              initFolder={config.folder}
              initFiles={config.files}
              onChange={(files, folder) =>
                setConfig((s) => ({ ...s, folder: folder, files: files }))
              }
            />
            {config && (
              <OptionCardChecker
                initialChecked={config.monitoredIdx != undefined}
                label={t('sendBook.monitorizeFolder')}
                text={t('sendBook.monitorizeText')}
                onChange={(checked) =>
                  setConfig((s) => ({ ...s, monitoredIdx: checked ? 1 : undefined }))
                }
              />
            )}
          </View>

          <View>
            <SText style={styles.title}>{t('sendBook.readerModel')}</SText>
            <SSelect
              value={config.model}
              options={eReaderProfiles}
              onOptionChange={(opt) => setConfig((s) => ({ ...s, model: opt.value }))}
            />
          </View>

          <View>
            <SText style={styles.title}>{t('sendBook.destination')}</SText>
            <DestinationSelector
              toCloud={config.toCloud}
              onChange={(toCloud) => setConfig((s) => ({ ...s, toCloud: toCloud }))}
            />
          </View>
        </View>

        <SButton
          onPress={() => send()}
          style={{
            backgroundColor: colors.primary_container,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            boxShadow: colors.boxShadow,
          }}
        >
          <SText style={{ fontFamily: 'semibold', color: colors.on_primary }}>{t('sendBook.send')}</SText>
        </SButton>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'semibold',
    fontSize: 14,
    color: colors.on_surface_variant,
    marginBottom: 5,
  },
});
