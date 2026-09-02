import apiClient, { normalizeApiError } from './client';

// GET /app/version-check?platform=android|ios&current_version=1.2.0 → public,
// unauthenticated. Returns whether an update is available (current_version
// below latest_version), the store URL to send the user to, and the admin
// message.
export async function getAppVersionCheck({ platform, currentVersion }) {
  try {
    const response = await apiClient.get('/app/version-check', {
      params: { platform, current_version: currentVersion },
    });
    const data = response.data?.data || response.data || {};
    return {
      platform: data.platform,
      currentVersion: data.current_version,
      latestVersion: data.latest_version,
      storeUrl: data.store_url,
      updateAvailable: !!data.update_available,
      message: data.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
