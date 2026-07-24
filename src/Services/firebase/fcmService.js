import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';

/**
 * Firebase Cloud Messaging (FCM) service.
 *
 * Thin functional wrappers around @react-native-firebase/messaging — no UI or
 * notification-display logic here. Callers wire these up to their own state /
 * navigation / local-notification layer.
 */

/**
 * Request notification permission from the user.
 *
 * On Android 13+ (API 33) the runtime POST_NOTIFICATIONS permission must be
 * granted explicitly; on older Android it's granted at install time. On both
 * platforms we also call messaging().requestPermission() so iOS gets its APNs
 * prompt and Firebase registers the app for remote messages.
 *
 * @returns {Promise<boolean>} true if notifications are authorized.
 */
export async function requestUserPermission() {
  try {
    // Android 13+ needs the runtime notifications permission.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[FCM] POST_NOTIFICATIONS not granted:', result);
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[FCM] Permission status:', authStatus, '-> enabled:', enabled);
    return enabled;
  } catch (error) {
    console.log('[FCM] requestUserPermission error:', error);
    return false;
  }
}

/**
 * Fetch the current FCM registration token for this device.
 *
 * @returns {Promise<string|null>} the token, or null if it couldn't be retrieved.
 */
export async function getFcmToken() {
  try {
    const token = await messaging().getToken();
    console.log('[FCM] Token:', token);
    return token;
  } catch (error) {
    console.log('[FCM] getFcmToken error:', error);
    return null;
  }
}

/**
 * Subscribe to FCM token refreshes.
 *
 * The token can rotate (app restore, reinstall, token expiry) — sync the new
 * value to your backend from the callback.
 *
 * @param {(token: string) => void} callback invoked with the refreshed token.
 * @returns {() => void} unsubscribe function.
 */
export function listenTokenRefresh(callback) {
  return messaging().onTokenRefresh((token) => {
    console.log('[FCM] Token refreshed:', token);
    callback(token);
  });
}

/**
 * Subscribe to messages received while the app is in the foreground.
 *
 * Foreground messages are NOT shown as system notifications automatically —
 * the callback should hand the payload to your own display layer if needed.
 *
 * @param {(message: import('@react-native-firebase/messaging').FirebaseMessagingTypes.RemoteMessage) => void} callback
 * @returns {() => void} unsubscribe function.
 */
export function onForegroundMessage(callback) {
  return messaging().onMessage((remoteMessage) => {
    console.log('[FCM] Foreground message:', remoteMessage);
    callback(remoteMessage);
  });
}

/**
 * Subscribe to notification taps that bring the app from the background to the
 * foreground.
 *
 * @param {(message: import('@react-native-firebase/messaging').FirebaseMessagingTypes.RemoteMessage) => void} callback
 * @returns {() => void} unsubscribe function.
 */
export function onNotificationOpenedFromBackground(callback) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[FCM] Opened from background:', remoteMessage);
    callback(remoteMessage);
  });
}

/**
 * Get the notification that opened the app from a fully-quit (killed) state.
 *
 * Returns null when the app was launched normally (not via a notification tap).
 *
 * @returns {Promise<import('@react-native-firebase/messaging').FirebaseMessagingTypes.RemoteMessage|null>}
 */
export async function getInitialNotification() {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('[FCM] Opened from killed state:', remoteMessage);
    }
    return remoteMessage || null;
  } catch (error) {
    console.log('[FCM] getInitialNotification error:', error);
    return null;
  }
}

/**
 * Register the background/quit-state message handler.
 *
 * Must be called at module scope in index.js (outside the React tree), before
 * the app registers its root component, so it's set before any background
 * message arrives.
 *
 * @param {(message: import('@react-native-firebase/messaging').FirebaseMessagingTypes.RemoteMessage) => Promise<void>} [callback]
 *   optional custom handler; a default logging handler is used if omitted.
 */
export function registerBackgroundHandler(callback) {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] Background message:', remoteMessage);
    if (callback) {
      await callback(remoteMessage);
    }
  });
}
