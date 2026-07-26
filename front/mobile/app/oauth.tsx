import { View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function OAuthCallbackScreen() {
  const { state } = useLocalSearchParams();

  useFocusEffect(() => {
    setTimeout(() => {
      if (state && typeof state === 'string') {
        router.replace(state as any);
      } else {
        router.replace('/(tabs)/settings');
      }
    }, 100);
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
