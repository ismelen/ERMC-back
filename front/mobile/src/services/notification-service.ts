import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getMessaging, getToken } from '@react-native-firebase/messaging';

export class NotificationService {
  static async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  static async getToken(): Promise<string> {
    if (!NotificationService.requestNotificationPermission()) return '';

    const inst = getMessaging();
    return await getToken(inst);
  }
}
