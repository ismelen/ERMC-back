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

export default function SendBookPage() {
  const pathname = usePathname();
  const { sending, config, setConfig, send } = useSender('epub', pathname);

  if (sending)
    return (
      <LoadingScreen
        title="Sending your book…"
        subtitle="Optimizing for your e-reader. This won't take long."
      />
    );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Send Book',
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
            <SText style={styles.title}>SOURCE</SText>
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
                label="Monitorize folder"
                text="Monitor changes in this folder"
                onChange={(checked) =>
                  setConfig((s) => ({ ...s, monitoredIdx: checked ? 1 : undefined }))
                }
              />
            )}
          </View>

          <View>
            <SText style={styles.title}>READER MODEL</SText>
            <SSelect
              value={config.model}
              options={eReaderProfiles}
              onOptionChange={(opt) => setConfig((s) => ({ ...s, model: opt.value }))}
            />
          </View>

          <View>
            <SText style={styles.title}>DESTINATION</SText>
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
          <SText style={{ fontFamily: 'semibold', color: colors.on_primary }}>Send</SText>
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
