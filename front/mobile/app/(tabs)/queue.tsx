import { useShallow } from 'zustand/react/shallow';
import { StyleSheet, Text, View } from 'react-native';
import { useQueue } from '../../src/hooks/useQueue';
import SIcon from '../../src/components/icons/SIcon';
import { colors } from '../../src/theme/colors';
import QueueItemCard from '../../src/components/queue/queue-item-card';
import { ScrollView } from 'react-native-gesture-handler';
import UploadCard from '../../src/components/queue/upload-card';
import { useObjectNavigation } from '../../src/hooks/useObjectNavigation';
import { TransactionType } from '../../src/models/transaction-request';
import SText from '../../src/components/shared/SText';
import SButton from '../../src/components/shared/SButton';
import { router } from 'expo-router';

export default function QueuePage() {
  const { active, completed, uploads, cancel } = useQueue(
    useShallow((s) => ({
      active: s.transactions,
      completed: s.completedTransactions,
      uploads: s.uploads,
      cancel: s.cancel,
    }))
  );

  const navigate = useObjectNavigation((s) => s.navigate);

  const areUploads = uploads.length !== 0;
  const areActive = active.length !== 0;
  const areCompleted = completed.length !== 0;

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: 'bold', fontSize: 28 }}>Transaction queue</Text>

      {!areActive && !areUploads && !areCompleted && (
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

      {areUploads && (
        <>
          <View style={styles.section}>
            <SIcon
              name="cloud_upload"
              color={colors.secondary_container}
              size={24}
              type="outlined"
            />
            <Text style={styles.label}>UPLOADS</Text>
          </View>

          <View style={{ marginTop: 16, gap: 10 }}>
            {uploads.map((e, i) => (
              <UploadCard
                key={e.id}
                data={e}
                onRetry={() => navigate(getPath(e.request.type), e.request)}
              />
            ))}
          </View>
        </>
      )}

      {areActive && (
        <>
          <View style={styles.section}>
            <SIcon name="pending_actions" color={colors.primary} size={24} />
            <Text style={styles.label}>ACTIVE</Text>
          </View>

          <View style={{ marginTop: 16, gap: 10 }}>
            {active.map((e, i) => (
              <QueueItemCard key={e.id} data={e} idx={i} onTap={() => cancel(e.id)} />
            ))}
          </View>
        </>
      )}

      {areCompleted && (
        <>
          <View style={[styles.section, { marginTop: 20 }]}>
            <SIcon name="check_circle" color={colors.ok} size={24} type="outlined" />
            <Text style={styles.label}>COMPLETED</Text>
          </View>

          <View style={{ marginTop: 16, gap: 10 }}>
            {completed.map((e, i) => (
              <QueueItemCard
                key={i + e.id}
                data={e}
                idx={i}
                onTap={() => navigate(getPath(e.type), e)}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function getPath(type: TransactionType) {
  switch (type) {
    case 'comic':
      return '/send-comic';
    case 'epub':
      return '/send-book';
    case 'remote':
      return '/send-libgen';
  }
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
