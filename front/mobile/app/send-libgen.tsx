import { useShallow } from 'zustand/react/shallow';
import { colors } from '../src/theme/colors';
import { StyleSheet, View } from 'react-native';
import SText from '../src/components/shared/SText';
import SSelect from '../src/components/shared/SSelect';
import { eReaderProfiles } from '../src/constants';
import DestinationSelector from '../src/components/senders/destination-selector';
import SButton from '../src/components/shared/SButton';
import { ScrollView } from 'react-native-gesture-handler';
import SearchedBookCard from '../src/components/search/searched-book-card';
import { useLibgen } from '../src/hooks/useLibgen';
import LoadingScreen from '../src/components/shared/loading-screen';
import { useSender } from '../src/hooks/useSender';
import { Stack, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SendLibgen() {
  const { sending, config, setConfig, send } = useSender('md5');
  const { t } = useTranslation();

  const { selectedBooks, onDelete, clear } = useLibgen(
    useShallow((s) => ({
      selectedBooks: s.selected,
      onDelete: s.selectBook,
      clear: s.clear,
    }))
  );

  if (sending)
    return <LoadingScreen title={t('loading.sendingBook')} subtitle={t('loading.optimizing')} />;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('sendLibgen.title'),
          headerTitleStyle: { fontFamily: 'semibold', fontSize: 20, color: colors.on_background },
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
        }}
      />
      <View style={{ flex: 1, paddingBottom: 24, paddingHorizontal: 24 }}>
        <ScrollView style={{ flex: 1, gap: 32 }}>
          <View style={styles.section}>
            <SText style={styles.title}>{t('sendLibgen.books')}</SText>
            {Object.values(selectedBooks).map((e) => (
              <SearchedBookCard
                key={e.src}
                book={e}
                onSelect={() => onDelete(e)}
                selected={false}
                deleteMode
              />
            ))}
          </View>

          <View>
            <SText style={styles.title}>{t('sendLibgen.readerModel')}</SText>
            <SSelect
              value={config.model}
              options={eReaderProfiles}
              onOptionChange={(opt) => setConfig((s) => ({ ...s, model: opt.value }))}
            />
          </View>

          <View style={styles.section}>
            <SText style={styles.title}>{t('sendLibgen.destination')}</SText>
            <DestinationSelector
              toCloud={config.toCloud}
              onChange={(toCloud) => setConfig((s) => ({ ...s, toCloud: toCloud }))}
            />
          </View>
        </ScrollView>

        <SButton
          onPress={async () => {
            const finalFiles = Object.values(selectedBooks);
            setConfig((s) => ({ ...s, files: finalFiles }));
            if (await send(finalFiles)) clear();
          }}
          style={{
            backgroundColor: colors.primary_container,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            boxShadow: colors.boxShadow,
          }}
        >
          <SText style={{ fontFamily: 'semibold', color: colors.on_primary }}>
            {t('sendLibgen.send')}
          </SText>
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
  section: {
    marginBottom: 32,
  },
});
