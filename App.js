import React, { useEffect } from 'react';
import Config from 'react-native-config';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/Redux/store';
import { syncDeviceToken } from './src/Redux/slices/userSlice';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/Navigations/AppNavigator';
import { navigationRef } from './src/Navigations/navigationRef';
import {
  requestUserPermission,
  listenTokenRefresh,
  onForegroundMessage,
  onNotificationOpenedFromBackground,
  getInitialNotification,
} from './src/Services/firebase/fcmService';
import {
  createDefaultChannel,
  displayNotification,
  onNotificationPress,
} from './src/Services/firebase/notifeeService';
import { handleNotificationNavigation } from './src/Services/firebase/notificationRouting';

function App() {
  useEffect(() => {
    // Ask for permission, then fetch the token (send this to your backend so
    // the device can be targeted). Listeners are torn down on unmount.
    (async () => {
      await createDefaultChannel();
      const granted = await requestUserPermission();
      if (granted) {
        // Register/refresh this device's token with the backend (no-op until
        // the user is authenticated; re-run on login via the token-refresh path).
        store.dispatch(syncDeviceToken());
      }
      // If the app was opened from a killed state by tapping a notification —
      // wait for the nav container to be ready before routing.
      const initial = await getInitialNotification();
      if (initial?.data) {
        setTimeout(() => handleNotificationNavigation(initial.data), 600);
      }
    })();

    // Foreground FCM messages arrive silently — render them via Notifee.
    const unsubForeground = onForegroundMessage((remoteMessage) => {
      displayNotification(remoteMessage);
    });
    // Tap on a Notifee notification while the app is in the foreground.
    const unsubNotifeePress = onNotificationPress((data) => {
      handleNotificationNavigation(data);
    });
    // Tap on a system notification that brought the app back from background.
    const unsubOpened = onNotificationOpenedFromBackground((remoteMessage) => {
      handleNotificationNavigation(remoteMessage?.data);
    });
    // Firebase rotates tokens periodically — push the new one to the backend.
    const unsubTokenRefresh = listenTokenRefresh((token) => {
      store.dispatch(syncDeviceToken(token));
    });

    return () => {
      unsubForeground();
      unsubNotifeePress();
      unsubOpened();
      unsubTokenRefresh();
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <StripeProvider publishableKey={Config.STRIPE_KEY || 'pk_test_51TuSBhShVwQKFXgv4XQSJ1OVLvVqFoyH4Sh8jqAIbPsd3JTT4hsSrCF6ex4rZBVmjlVgBOYwwHoJ1ntNeKnjbQta00JtEFfqrN'}>
            <ToastProvider>
              <NavigationContainer ref={navigationRef}>
                <AppNavigator />
              </NavigationContainer>
            </ToastProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
