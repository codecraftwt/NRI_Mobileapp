import apiClient, { normalizeApiError } from './client';

// GET /app/version-check?platform=android|ios&current_version=1.2.0 → public,
// unauthenticated. Returns whether an update is available (current_version
// below latest_version), the store URL to send the user to, and the admin
// message.
export async function getAppVersionCheck({ platform, currentVersion }) {
  try {
    const params = { platform };
    if (currentVersion) {
      params.current_version = currentVersion;
    }

    const response = await apiClient.get('/app/version-check', { params });
    const data = response.data?.data || response.data || {};
    return {
      platform: data.platform,
      currentVersion: data.current_version,
      latestVersion: data.latest_version,
      latestBuild: data.latest_build,
      storeUrl: data.store_url,
      updateAvailable: data.update_available,
      message: data.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}


