import React, { useEffect } from 'react';
import Config from 'react-native-config';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/Redux/store';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/Navigations/AppNavigator';
import {
  requestUserPermission,
  getFcmToken,
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

function App() {
  useEffect(() => {
    // Ask for permission, then fetch the token (send this to your backend so
    // the device can be targeted). Listeners are torn down on unmount.
    (async () => {
      await createDefaultChannel();
      const granted = await requestUserPermission();
      if (granted) {
        await getFcmToken();
      }
      // If the app was opened from a killed state by tapping a notification.
      const initial = await getInitialNotification();
      if (initial) {
        console.log('[App] Launched from notification:', initial.data);
      }
    })();

    // Foreground FCM messages arrive silently — render them via Notifee.
    const unsubForeground = onForegroundMessage((remoteMessage) => {
      displayNotification(remoteMessage);
    });
    // Tap on a Notifee notification while the app is in the foreground.
    const unsubNotifeePress = onNotificationPress((data) => {
      console.log('[App] Notification tapped:', data);
      // TODO: navigate based on data (e.g. data.screen / data.ticketId)
    });
    // Tap on a system notification that brought the app back from background.
    const unsubOpened = onNotificationOpenedFromBackground((remoteMessage) => {
      console.log('[App] Opened from background:', remoteMessage?.data);
      // TODO: navigate based on remoteMessage.data
    });
    const unsubTokenRefresh = listenTokenRefresh(() => {});

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
              <NavigationContainer>
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
