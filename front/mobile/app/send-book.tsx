import React from 'react';
import { StyleSheet, View } from 'react-native';
import SText from '../src/components/shared/SText';
import { Stack } from 'expo-router';
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
  const { sending, req, setReq, handleSend } = useSender('epub');

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
              initSources={req.sources}
              onChange={(srcs) => setReq((s) => ({ ...s, sources: srcs }))}
              onModeChange={(mode) => setReq((s) => ({ ...s, sourceMode: mode }))}
            />
            {req.sourceMode === 'folder' && (
              <OptionCardChecker
                initialChecked={req.monitorize ?? false}
                label="Monitorize folder"
                text="Monitor changes in this folder"
                onChange={(checked) => setReq((s) => ({ ...s, monitorize: checked }))}
              />
            )}
          </View>

          <View>
            <SText style={styles.title}>READER MODEL</SText>
            <SSelect
              value={req.model}
              options={eReaderProfiles}
              onOptionChange={(opt) => setReq((s) => ({ ...s, model: opt.value }))}
            />
          </View>

          <View>
            <SText style={styles.title}>DESTINATION</SText>
            <DestinationSelector
              initDestination={req.destination}
              onChange={(dest) => setReq((s) => ({ ...s, destination: dest }))}
            />
          </View>

          {/* <View>
            <SText style={styles.title}>OPTIONS</SText>
            <OptionCardChecker
              initialChecked={req.deleteOrigin}
              label="Delete source"
              text="Remove original after successful upload"
              onChange={(checked) => setReq((s) => ({ ...s, deleteOrigin: checked }))}
            />
          </View> */}
        </View>

        <SButton
          onPress={handleSend}
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
