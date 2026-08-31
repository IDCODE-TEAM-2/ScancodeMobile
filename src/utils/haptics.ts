import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

// expo-haptics has no web implementation — every export here is a safe no-op on web instead
// of every call site needing its own Platform.OS guard.
const isSupported = Platform.OS !== 'web';

export function tapLight() {
  if (isSupported) ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
}

export function tapMedium() {
  if (isSupported) ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
}

export function notifySuccess() {
  if (isSupported) ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
}

export function notifyWarning() {
  if (isSupported) ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
}
