import React from 'react';
import { View } from 'react-native';
import ActionCard from '../../src/components/home/action-card';
import SText from '../../src/components/shared/SText';
import { router, Tabs } from 'expo-router';
import AppHeader from '../../src/components/app-header';
import { useMonitoredFolders } from '../../src/hooks/useMonitoredFolders';
import { colors } from '../../src/theme/colors';
import SButton from '../../src/components/shared/SButton';
import SIcon from '../../src/components/icons/SIcon';
import { useObjectNavigation } from '../../src/hooks/useObjectNavigation';
import { TransactionType } from '../../src/models/transaction-request';

export default function HomePage() {
  const folders = useMonitoredFolders((s) => s.folders);
  const navigate = useObjectNavigation((s) => s.navigate);

  return (
    <>
      <Tabs.Screen options={{ headerShown: true, header: () => <AppHeader /> }} />
      <View style={{ gap: 32, paddingHorizontal: 24 }}>
        <View style={{ gap: 16 }}>
          <ActionCard
            icon="menu_book"
            title="Send Comic"
            subtitle="Convert .cbz to .epub and send to device"
            tag=".cbz to .epub"
            onClick={() => router.push('/send-comic')}
          />
          <ActionCard
            icon="book"
            title="Send Book"
            subtitle="Manage and transfer .epub files"
            tag=".epub management"
            onClick={() => router.push('/send-book')}
          />
        </View>

        {folders.length !== 0 && (
          <View style={{ gap: 8 }}>
            <SText style={{ fontFamily: 'semibold', fontSize: 20 }}>Monitored folders</SText>

            {folders.map((e, i) => (
              <SButton
                key={i}
                onPress={() => {
                  e.monitoredIdx = i;
                  navigate(getPath(e.type), e);
                }}
                style={{
                  boxShadow: colors.boxShadow,
                  backgroundColor: colors.surface_container_lowest,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <SText style={{ fontFamily: 'semibold' }}>{e.title}</SText>
                  <SText
                    style={{
                      color: e.diff !== 0 ? colors.ok : colors.secondary_fixed_dim,
                      fontFamily: 'semibold',
                      fontSize: 12,
                    }}
                  >
                    {e.diff !== 0 ? `${e.diff} NEW FILES` : 'SYNCED'}
                  </SText>
                </View>
                <SIcon name="chevron_right" size={32} color={colors.primary} type={'outlined'} />
              </SButton>
            ))}
          </View>
        )}
      </View>
    </>
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
