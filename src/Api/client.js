import axios from 'axios';
import Config from 'react-native-config';

// NOTE: this points at an ngrok free-tier tunnel — it rotates whenever the
// tunnel restarts. Update API_BASE_URL in .env whenever the backend gives
// you a new ngrok URL (falls back to the last-known URL if .env is missing it).
export const API_BASE_URL = Config.API_BASE_URL || 'https://09f4-103-226-142-125.ngrok-free.app/api/v1';

let storeRef = null;

// Called once from store.js after the Redux store is created, so this client
// can read the auth token without creating a circular import with the store.
export function injectStore(store) {
  storeRef = store;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    // Skips ngrok's free-tier HTML interstitial warning page, which would
    // otherwise be returned instead of JSON for non-browser clients.
    'ngrok-skip-browser-warning': 'true',
  },
});

apiClient.interceptors.request.use(config => {
  const token = storeRef?.getState()?.user?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalizes axios errors into a consistent shape the UI can rely on:
// { status, message, errors, retryAfter } where `errors` is a Laravel-style
// { field: string[] } validation map (or null when not a validation error),
// and `retryAfter` is the seconds to wait before retrying (only ever set on
// a 429, e.g. the OTP resend throttle — null otherwise).
export function normalizeApiError(error) {
  if (error?.response) {
    const { status, data } = error.response;
    return {
      status,
      message: data?.message || 'Something went wrong. Please try again.',
      errors: data?.errors || null,
      retryAfter: data?.retry_after ?? null,
    };
  }
  if (error?.request) {
    return { status: null, message: 'Network error. Please check your connection and try again.', errors: null, retryAfter: null };
  }
  return { status: null, message: error?.message || 'Something went wrong. Please try again.', errors: null, retryAfter: null };
}

export default apiClient;
