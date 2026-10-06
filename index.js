/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/Services/firebase/fcmService';
import { createDefaultChannel, displayNotification } from './src/Services/firebase/notifeeService';

// if(__DEV__) {
//    import('./ReactotronConfig').then(() => console.log('Reactotron Configured'))
//    }

// Must be registered at module scope (outside React) so background/quit-state
// FCM messages are handled before the app component mounts.
// Only data-only messages (without a `notification` payload) need a manual
// local notification display; standard notification messages are already
// displayed automatically by the OS/APNs/FCM SDK in the background.
registerBackgroundHandler(async (remoteMessage) => {
  if (!remoteMessage?.notification && remoteMessage?.data) {
    await createDefaultChannel();
    await displayNotification(remoteMessage);
  }
});

AppRegistry.registerComponent(appName, () => App);
