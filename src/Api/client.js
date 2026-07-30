import axios from 'axios';
import Config from 'react-native-config';
import RNBlobUtil from 'react-native-blob-util';

// NOTE: this points at an ngrok free-tier tunnel — it rotates whenever the
// tunnel restarts. Update API_BASE_URL in .env whenever the backend gives
// you a new ngrok URL (falls back to the last-known URL if .env is missing it).
export const API_BASE_URL = Config.API_BASE_URL || 'https://arpeggioed-anaya-nonostensively.ngrok-free.dev/api/v1';

let storeRef = null;

// Called once from store.js after the Redux store is created, so this client
// can read the auth token without creating a circular import with the store.
export function injectStore(store) {
  storeRef = store;
}

// Config for React Native multipart/form-data uploads. Do NOT hard-set
// 'Content-Type': 'multipart/form-data' — that omits the `; boundary=...`
// parameter, so the server can't parse the body and the request stalls until
// it times out (observed as a 15s ERR_NETWORK on file uploads). Stripping the
// header lets RN's networking set it *with* the boundary. Spread into the
// axios request config of any FormData post: apiClient.post(url, form, MULTIPART).
export const MULTIPART = {
  transformRequest: (data, headers) => {
    if (headers) { delete headers['Content-Type']; delete headers['content-type']; }
    return data;
  },
};

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

// Uploads multipart/form-data via react-native-blob-util instead of axios.
// RN 0.86's built-in XHR uploader (what axios drives) stalls on multipart
// bodies to this backend — the body never finishes streaming, so the request
// hangs until the timeout fires and surfaces as a ~15s ERR_NETWORK "Network
// Error" (observed on POST /customer/tickets with a PDF). blob-util uploads
// through OkHttp with a real Content-Length and a well-formed body, which the
// server accepts.
//
// `fields` is a flat map of scalar values (array values are sent as repeated
// `key` parts — pass the key already suffixed with `[]` for Laravel). `files`
// is an array of { field, uri, name, type }. Returns an axios-like
// { data, status } and throws an axios-like error ({ response } for HTTP
// errors, { request } for network failures) so callers keep using
// normalizeApiError unchanged.
export async function postMultipart(path, fields = {}, files = []) {
  const token = storeRef?.getState()?.user?.token;
  const url = `${API_BASE_URL}${path}`;

  const parts = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(v => { if (v !== undefined && v !== null) parts.push({ name: key, data: String(v) }); });
    } else {
      parts.push({ name: key, data: String(value) });
    }
  });
  (files || []).forEach(f => {
    if (!f || !f.uri) return;
    // wrap() takes a plain filesystem path, not a file:// uri.
    const filePath = decodeURIComponent(f.uri.replace(/^file:\/\//, ''));
    parts.push({
      name: f.field,
      filename: f.name || 'upload',
      type: f.type || 'application/octet-stream',
      data: RNBlobUtil.wrap(filePath),
    });
  });

  const headers = {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    // Generous ceiling: file uploads over mobile links can legitimately take
    // longer than the 15s used for plain JSON calls.
    res = await RNBlobUtil.config({ timeout: 60000 }).fetch('POST', url, headers, parts);
  } catch (err) {
    throw { request: true, message: err?.message || 'Network error' };
  }

  const status = res.info().status;
  let data;
  try { data = res.json(); } catch (e) { data = res.text(); }

  if (status >= 200 && status < 300) return { data, status };
  throw { response: { status, data } };
}

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
