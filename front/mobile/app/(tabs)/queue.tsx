import { useShallow } from 'zustand/react/shallow';
import { StyleSheet, View } from 'react-native';
import { useQueue } from '../../src/hooks/useQueue';
import SIcon from '../../src/components/icons/SIcon';
import { colors } from '../../src/theme/colors';
import QueueItemCard from '../../src/components/queue/queue-item-card';
import { ScrollView } from 'react-native-gesture-handler';
import { useObjectNavigation } from '../../src/hooks/useObjectNavigation';
import SText from '../../src/components/shared/SText';
import SButton from '../../src/components/shared/SButton';
import { router } from 'expo-router';
import { TransactionMode } from '../../src/models/transaction-config';
import { useTranslation } from 'react-i18next';

export default function QueuePage() {
  const { transactions } = useQueue(
    useShallow((s) => ({ transactions: s.transactions, cancel: s.cancel }))
  );
  const areTransactions = transactions.length > 0;
  const { t } = useTranslation();

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
      <SText style={{ fontFamily: 'bold', fontSize: 28 }}>{t('queue.title')}</SText>

      {!areTransactions && (
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
      )}

      {areTransactions && (
        <View style={{ marginTop: 16, gap: 10, paddingBottom: 16 }}>
          {transactions.map((e, i) => (
            <QueueItemCard key={e.id} data={e} idx={i} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
