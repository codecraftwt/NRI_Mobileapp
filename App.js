import React from 'react';
import Config from 'react-native-config';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/Redux/store';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/Navigations/AppNavigator';

function App() {
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
