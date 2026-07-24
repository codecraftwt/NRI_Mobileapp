/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/Services/firebase/fcmService';

// if(__DEV__) {
//    import('./ReactotronConfig').then(() => console.log('Reactotron Configured'))
//    }

// Must be registered at module scope (outside React) so background/quit-state
// FCM messages are handled before the app component mounts.
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
