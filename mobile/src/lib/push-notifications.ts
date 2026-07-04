import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPushToken } from '@/lib/api';

/**
 * Best-effort registration — every failure path is swallowed and logged, not
 * thrown, since this runs right after login and a push-setup problem should
 * never block the worker from getting into the app.
 *
 * Getting a real Expo push token requires the project to be linked to EAS
 * (`extra.eas.projectId` in app.json, set by running `eas init`), which
 * hasn't been done for this app yet — see README. Until that's done this
 * silently no-ops (logs once) rather than crashing on the missing project ID.
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn(
      '[push] No EAS projectId configured (app.json extra.eas.projectId) — skipping push registration. Run `eas init` to enable push notifications.'
    );
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
  } catch (error) {
    console.warn('[push] Failed to register for push notifications:', error);
  }
}
