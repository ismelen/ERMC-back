import { useShallow } from 'zustand/react/shallow';
import { StyleSheet, Text, View } from 'react-native';
import { useQueue } from '../../src/hooks/useQueue';
import SIcon from '../../src/components/icons/SIcon';
import { colors } from '../../src/theme/colors';
import QueueItemCard from '../../src/components/queue/queue-item-card';
import { ScrollView } from 'react-native-gesture-handler';
import { useObjectNavigation } from '../../src/hooks/useObjectNavigation';
import SText from '../../src/components/shared/SText';
import SButton from '../../src/components/shared/SButton';
import { router } from 'expo-router';

export default function QueuePage() {
  const { transactions, cancel } = useQueue(
    useShallow((s) => ({ transactions: s.transactions, cancel: s.cancel }))
  );
  const navigate = useObjectNavigation((s) => s.navigate);
  const areTransactions = transactions.length > 0;

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: 'bold', fontSize: 28 }}>Transaction queue</Text>

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
              Your queue is empty
            </SText>
            <SText style={{ fontSize: 16, textAlign: 'center' }}>Start by sending something.</SText>
            <SText style={{ fontSize: 16, textAlign: 'center' }}>
              Your active and compltede uploads will appear here.
            </SText>
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
              Send something
            </SText>
          </SButton>
        </View>
      )}

      {areTransactions && (
        <View style={{ marginTop: 16, gap: 10 }}>
          {transactions.map((e, i) => (
            <QueueItemCard key={e.id} data={e} idx={i} onRetry={(tranId) => {}} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
  },
  label: { fontSize: 14, fontFamily: 'semibold', color: colors.on_surface_variant },
});
