import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { injectStore } from '../Api/client';
import counterReducer from './slices/counterSlice';
import userReducer from './slices/userSlice';
import ticketsReducer from './slices/ticketsSlice';
import familyReducer from './slices/familySlice';
import propertiesReducer from './slices/propertiesSlice';
import walletReducer from './slices/walletSlice';
import geoReducer from './slices/geoSlice';
import catalogReducer from './slices/catalogSlice';
import planReducer from './slices/planSlice';
import dashboardReducer from './slices/dashboardSlice';
import documentsReducer from './slices/documentsSlice';
import ticketBookingReducer from './slices/ticketBookingSlice';
import reportsReducer from './slices/reportsSlice';
import membershipReducer from './slices/membershipSlice';
import addonSubscriptionReducer from './slices/addonSubscriptionSlice';
import billingReducer from './slices/billingSlice';
import myTicketsReducer from './slices/myTicketsSlice';

const persistConfig = {
  key: 'root',
  version: 2,
  storage: AsyncStorage,
  whitelist: ['user', 'tickets', 'wallet'],
  migrate: (state) => {
    if (state && state._persist && state._persist.version !== 2) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(state);
  },
};

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
  tickets: ticketsReducer,
  family: familyReducer,
  properties: propertiesReducer,
  wallet: walletReducer,
  geo: geoReducer,
  catalog: catalogReducer,
  plan: planReducer,
  dashboard: dashboardReducer,
  documents: documentsReducer,
  ticketBooking: ticketBookingReducer,
  reports: reportsReducer,
  membership: membershipReducer,
  addonSubscription: addonSubscriptionReducer,
  billing: billingReducer,
  myTickets: myTicketsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

injectStore(store);

export const persistor = persistStore(store);
