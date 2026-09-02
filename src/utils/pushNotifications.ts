import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from '../api';

// Expo Go on Android removed push notification support at SDK 53. Crucially, simply
// *importing* expo-notifications triggers addPushTokenListener internally during module
// initialisation — before any of our runtime guards run — and crashes immediately.
// Solution: use require() so the module is never loaded unless we're in a proper build.
//
// Constants.executionEnvironment values:
//   'storeClient' → Expo Go
//   'bare'        → dev build / bare workflow
//   'standalone'  → production build
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const notificationsSupported = Platform.OS !== 'web' && !isExpoGo;

if (notificationsSupported) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Requests permission, obtains an Expo push token, and registers it with the backend.
// Returns null (without throwing) whenever a token genuinely can't be obtained — no physical
// device, permission denied, no EAS project configured yet, Expo Go, or web — since none
// of those are error conditions the caller needs to surface to the user.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!notificationsSupported || !Device.isDevice) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Requires an EAS project to be configured (`eas init`) — see eas.json. Until then this
  // resolves to undefined and we skip requesting a token rather than throwing.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(tokenData.data);
    return tokenData.data;
  } catch {
    return null;
  }
}
