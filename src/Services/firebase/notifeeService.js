import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

/**
 * Notification display service (Notifee).
 *
 * FCM only auto-displays notifications when the app is in the background/quit
 * state — foreground messages arrive silently. This module renders them via
 * Notifee and reports taps back to the caller.
 */

const DEFAULT_CHANNEL_ID = 'default';

/**
 * Create (or update) the default Android notification channel.
 *
 * Android 8+ requires every notification to belong to a channel. Safe to call
 * repeatedly — Notifee upserts by id. No-op payload-wise on iOS.
 *
 * @returns {Promise<string>} the channel id to display notifications on.
 */
export async function createDefaultChannel() {
  const channelId = await notifee.createChannel({
    id: DEFAULT_CHANNEL_ID,
    name: 'General Notifications',
    importance: AndroidImportance.HIGH,
  });
  console.log('[Notifee] Channel ready:', channelId);
  return channelId;
}

/**
 * Display a heads-up notification from an FCM remote message.
 *
 * Reads the standard `notification` block, falling back to `data.title` /
 * `data.body` for data-only messages. The original `data` payload is preserved
 * so it's available again when the notification is tapped.
 *
 * @param {import('@react-native-firebase/messaging').FirebaseMessagingTypes.RemoteMessage} remoteMessage
 * @returns {Promise<void>}
 */
export async function displayNotification(remoteMessage) {
  try {
    const { notification, data } = remoteMessage || {};
    const title = notification?.title || data?.title || 'Notification';
    const body = notification?.body || data?.body || '';

    await notifee.displayNotification({
      title,
      body,
      data: data || {},
      android: {
        channelId: DEFAULT_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' }, // makes the notification tappable
        smallIcon: 'ic_launcher', // swap for a dedicated white status-bar icon later
      },
    });
    console.log('[Notifee] Displayed:', title);
  } catch (error) {
    console.log('[Notifee] displayNotification error:', error);
  }
}

/**
 * Subscribe to foreground notification interactions (tap / dismiss).
 *
 * @param {(data: object) => void} onPress invoked with the notification's data
 *   payload when the user taps it.
 * @returns {() => void} unsubscribe function.
 */
export function onNotificationPress(onPress) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      console.log('[Notifee] Pressed:', detail.notification?.data);
      onPress(detail.notification?.data || {});
    }
  });
}
