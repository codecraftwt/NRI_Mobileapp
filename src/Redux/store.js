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
import walletAccountReducer from './slices/walletAccountSlice';
import referralReducer from './slices/referralSlice';
import supportTicketsReducer from './slices/supportTicketsSlice';
import vendorSupportReducer from './slices/vendorSupportSlice';
import vendorRatingsReducer from './slices/vendorRatingsSlice';
import vendorJobsReducer from './slices/vendorJobsSlice';
import vendorProfileReducer from './slices/vendorProfileSlice';
import vendorEarningsReducer from './slices/vendorEarningsSlice';
import vendorDashboardReducer from './slices/vendorDashboardSlice';
import serviceSubscriptionReducer from './slices/serviceSubscriptionSlice';
import serviceLocationReducer from './slices/serviceLocationSlice';
import cartReducer from './slices/cartSlice';
import notificationsReducer from './slices/notificationsSlice';
import onboardingReducer from './slices/onboardingSlice';
import { loginUser, registerUser, logoutUser, login, logout } from './slices/userSlice';

const persistConfig = {
  key: 'root',
  version: 2,
  storage: AsyncStorage,
  // `onboarding` must persist AND survive the auth reset below so mid-onboarding
  // sign-outs resume the wizard rather than landing on the dashboard.
  // `serviceLocation` persists so a returning user keeps their chosen city and
  // sees correct city-priced services (GET /services?...&state_id&city_id)
  // instead of no-location base prices.
  // `cart` persists so a guest who added services and then registered keeps the
  // cart+register (combined checkout) flow even if the app is reloaded/refreshed
  // mid-onboarding — without persistence the cart rehydrates empty and Step 2
  // falls back to a plain membership registration. It's still cleared on logout
  // (the auth-identity reset drops it — see CART_KEEP_TYPES) and after a
  // successful checkout (clearCart), so the next fresh guest starts empty.
  whitelist: ['user', 'tickets', 'wallet', 'onboarding', 'serviceLocation', 'cart'],
  migrate: (state) => {
    if (state && state._persist && state._persist.version !== 2) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(state);
  },
};

// Every domain slice (dashboard, family, properties, catalog, membership,
// billing, etc.) caches itself as 'succeeded' after its first fetch and,
// per the app-wide fetch-if-idle hook pattern, never refetches while that
// status stands — including across a logout/login within the same running
// app. Without a reset, a second user signing in on the same session sees
// the previous user's cached dashboard/tickets/etc. until the whole JS
// process restarts. So on any auth-identity change we wipe the entire store
// back to its initial state before letting the triggering action itself
// (e.g. loginUser.fulfilled) populate the fresh `user` slice as normal.
const RESET_ACTION_TYPES = new Set([
  loginUser.fulfilled.type,
  registerUser.fulfilled.type,
  logoutUser.fulfilled.type,
  login.type,
  logout.type,
]);

// The cart is kept across a sign-in / register (a guest's selections survive
// into their new session — "your cart is saved"), but cleared on logout so the
// next guest who reaches the "Let's Explore" screen starts with an empty cart.
const CART_KEEP_TYPES = new Set([
  loginUser.fulfilled.type,
  registerUser.fulfilled.type,
  login.type,
]);

const appReducer = combineReducers({
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
  walletAccount: walletAccountReducer,
  referral: referralReducer,
  supportTickets: supportTicketsReducer,
  vendorSupport: vendorSupportReducer,
  vendorRatings: vendorRatingsReducer,
  vendorJobs: vendorJobsReducer,
  vendorProfile: vendorProfileReducer,
  vendorEarnings: vendorEarningsReducer,
  vendorDashboard: vendorDashboardReducer,
  serviceSubscription: serviceSubscriptionReducer,
  serviceLocation: serviceLocationReducer,
  cart: cartReducer,
  notifications: notificationsReducer,
  onboarding: onboardingReducer,
});

const rootReducer = (state, action) => {
  if (RESET_ACTION_TYPES.has(action.type)) {
    // Wipe every slice on an auth-identity change EXCEPT `onboarding` — that
    // record must outlive logout so a user who signed out mid-onboarding
    // resumes the wizard on their next sign-in. The triggering action
    // (loginUser/registerUser.fulfilled) then repopulates the fresh `user`
    // slice as normal. Don't carry `_persist` here — the outer persistReducer
    // owns that key; passing it into combineReducers triggers an
    // "unexpected key" warning.
    // `cart` is preserved on sign-in / register (see CART_KEEP_TYPES) so a
    // guest keeps their selections, but dropped on logout so the next guest
    // starts fresh.
    const keepCart = CART_KEEP_TYPES.has(action.type);
    state = { onboarding: state?.onboarding, cart: keepCart ? state?.cart : undefined };
  }
  return appReducer(state, action);
};

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
