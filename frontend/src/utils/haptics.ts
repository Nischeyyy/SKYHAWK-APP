import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function tap() {
  if (Platform.OS === 'web') return;
  try { Haptics.selectionAsync(); } catch {}
}

export function success() {
  if (Platform.OS === 'web') return;
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
}

export function warn() {
  if (Platform.OS === 'web') return;
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
}

export function impact() {
  if (Platform.OS === 'web') return;
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}
