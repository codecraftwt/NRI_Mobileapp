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
// FCM messages are handled before the app component mounts. A killed-app
// background message can run this file fresh in a headless JS instance that
// never mounts App.js (so its own createDefaultChannel() call in useEffect
// never runs) — create the channel here too before displaying so the
// notification always has a channel to attach to.
registerBackgroundHandler(async (remoteMessage) => {
  await createDefaultChannel();
  await displayNotification(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
