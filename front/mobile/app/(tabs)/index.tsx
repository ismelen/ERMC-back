import React from 'react';
import { View } from 'react-native';
import ActionCard from '../../src/components/home/action-card';
import SText from '../../src/components/shared/SText';
import { router, Tabs } from 'expo-router';
import AppHeader from '../../src/components/app-header';
import { MonitoredFolder, useMonitoredFolders } from '../../src/hooks/useMonitoredFolders';
import { colors } from '../../src/theme/colors';
import SButton from '../../src/components/shared/SButton';
import SIcon from '../../src/components/icons/SIcon';
import { useObjectNavigation } from '../../src/hooks/useObjectNavigation';
import { TransactionMode } from '../../src/models/transaction-config';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const folders = useMonitoredFolders((s) => s.folders);
  const navigate = useObjectNavigation((s) => s.navigate);
  const { t } = useTranslation();

  return (
    <>
      <Tabs.Screen options={{ headerShown: true, header: () => <AppHeader /> }} />
      <View style={{ gap: 32, paddingHorizontal: 24 }}>
        <View style={{ gap: 16 }}>
          <ActionCard
            icon="menu_book"
            title={t('home.sendComic')}
            subtitle={t('home.sendComicSubtitle')}
            tag={t('home.sendComicTag')}
            onClick={() => router.push('/send-comic')}
          />
          <ActionCard
            icon="book"
            title={t('home.sendBook')}
            subtitle={t('home.sendBookSubtitle')}
            tag={t('home.sendBookTag')}
            onClick={() => router.push('/send-book')}
          />
        </View>

        {folders.length !== 0 && (
          <View style={{ gap: 8 }}>
            <SText style={{ fontFamily: 'semibold', fontSize: 20 }}>{t('home.monitoredFolders')}</SText>

            {folders.map((e, i) => (
              <SButton
                key={i}
                onPress={() => {
                  e.monitoredIdx = i;
                  navigate(getPath(e.mode), e);
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
                    {e.diff !== 0 ? t('home.newFiles', { count: e.diff }) : t('home.synced')}
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

function getPath(mode: TransactionMode) {
  switch (mode) {
    case 'cbz':
      return '/send-comic';
    case 'epub':
      return '/send-book';
    case 'md5':
      return '/send-libgen';
  }
}
