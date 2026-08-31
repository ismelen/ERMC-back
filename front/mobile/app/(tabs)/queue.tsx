import { useShallow } from 'zustand/react/shallow';
import { StyleSheet, View, FlatList } from 'react-native';
import { useQueue } from '../../src/hooks/useQueue';
import SIcon from '../../src/components/icons/SIcon';
import { colors } from '../../src/theme/colors';
import QueueItemCard from '../../src/components/queue/queue-item-card';
import SText from '../../src/components/shared/SText';
import SButton from '../../src/components/shared/SButton';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function QueuePage() {
  const { transactions, loadMore } = useQueue(
    useShallow((s: any) => ({
      transactions: s.transactions,
      loadMore: s.loadMore,
    }))
  );
  const { t } = useTranslation();

  const renderEmpty = () => (
    <View
      style={{
        alignItems: 'center',
        gap: 35,
        flex: 1,
        justifyContent: 'center',
        marginTop: 50,
      }}
    >
      <View style={{ backgroundColor: colors.primary_fixed, borderRadius: 999, padding: 15 }}>
        <SIcon name="cloud_off" color={colors.primary} size={60} type="outlined" />
      </View>
      <View>
        <SText style={{ fontSize: 16, textAlign: 'center', fontFamily: 'semibold' }}>
          {t('queue.empty')}
        </SText>
        <SText style={{ fontSize: 16, textAlign: 'center' }}>{t('queue.emptySubtitle1')}</SText>
        <SText style={{ fontSize: 16, textAlign: 'center' }}>{t('queue.emptySubtitle2')}</SText>
      </View>
      <SButton
        onPress={() => router.navigate('/(tabs)/')}
        style={{
          backgroundColor: colors.primary_container,
          paddingVertical: 14,
          paddingHorizontal: 30,
          borderRadius: 12,
        }}
      >
        <SText style={{ color: colors.on_primary, fontFamily: 'semibold', fontSize: 16 }}>
          {t('queue.sendSomething')}
        </SText>
      </SButton>
    </View>
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      <SText style={{ fontFamily: 'bold', fontSize: 28, marginBottom: 16 }}>{t('queue.title')}</SText>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <QueueItemCard data={item} idx={index} />}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
