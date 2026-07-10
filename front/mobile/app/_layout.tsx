import { router, SplashScreen, Stack } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme/colors';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { COMPLETE_TRANSACTIONS_KEY, TRANSACTIONS_KEY, useQueue } from '../src/hooks/useQueue';
import { useCloud } from '../src/hooks/useCloud';
import { DropboxFolderPickerModal } from '../src/components/modals/dropbox-folder-picker-modal';
import { useSettings } from '../src/hooks/useSettings';
import { useMonitoredFolders } from '../src/hooks/useMonitoredFolders';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  AndroidNotificationPriority,
  NotificationBehavior,
  setNotificationHandler,
} from 'expo-notifications';
import { defineTask } from 'expo-task-manager';
import { StorageService } from '../src/services/storage-service';
import { QueueElement } from '../src/models/queue-element';
import { useVersionChecker } from '../src/hooks/useVersionhecker';

SplashScreen.preventAutoHideAsync();

setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: AndroidNotificationPriority.HIGH,
    }) as NotificationBehavior,
});

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error || !data) {
    return;
  }

  if (data) {
    const notiData = (data as any).notification?.request?.content?.data;
    await processNotification(notiData);
  }
});

async function processNotification(
  data: any
): Promise<[QueueElement[], QueueElement[]] | undefined> {
  let actives = await StorageService.GetAsync<QueueElement[]>(TRANSACTIONS_KEY);
  if (!actives) return;

  const idx = actives.findIndex((e) => e.id === data.id);
  if (idx === -1) return;

  const completeds = await StorageService.GetAsync<QueueElement[]>(COMPLETE_TRANSACTIONS_KEY);
  if (!completeds) return;

  const tran = actives[idx];
  switch (data.type) {
    case 'success':
      tran.progress === 100;
      break;
    case 'error':
      tran.error = data.error;
      break;
    case 'canceled':
      tran.error = 'Canceled';
  }
  completeds.unshift(tran);
  actives = actives.filter((_, i) => i !== idx);

  await StorageService.SetAsync<QueueElement[]>(COMPLETE_TRANSACTIONS_KEY, completeds);
  await StorageService.SetAsync<QueueElement[]>(TRANSACTIONS_KEY, actives);

  return [actives, completeds];
}

export default function RootLayout() {
  const initQueue = useQueue((s) => s.init);
  const initCloud = useCloud((s) => s.init);
  const initSettings = useSettings((s) => s.init);
  const initMonitoredFolders = useMonitoredFolders((s) => s.init);
  const initVersionChecker = useVersionChecker((s) => s.init);

  useEffect(() => {
    initVersionChecker();
    initMonitoredFolders();
    initSettings();
    initQueue();
    initCloud();
  }, []);

  useEffect(() => {
    const foregroundSubscription = addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      const transactions = await processNotification(data);
      if (!transactions) return;

      const [actives, completeds] = transactions;
      useQueue.setState({
        transactions: actives,
        completedTransactions: completeds,
      });
    });

    const responseSubscription = addNotificationResponseReceivedListener(() => {
      router.navigate('/(tabs)/queue');
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const [fontsLoaded] = useFonts({
    regular: Inter_400Regular,
    medium: Inter_500Medium,
    semibold: Inter_600SemiBold,
    bold: Inter_700Bold,
    black: Inter_900Black,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <DropboxFolderPickerModal />
    </GestureHandlerRootView>
  );
}
