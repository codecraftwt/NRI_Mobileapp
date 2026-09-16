import { useEffect, useState, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import { getVersion, getBuildNumber } from 'react-native-device-info';
import { getAppVersionCheck } from '../Api/appVersionApi';

const STORE_URLS = {
  android: 'https://play.google.com/store/apps/details?id=com.nricircle',
  ios: 'https://apps.apple.com/us/app/nri-circle/id6795533441',
};

// Compare versions (e.g., "1.0.3" vs "1.0.2") and build numbers (e.g., "3" vs "2")
function isUpdateAvailable(currentVer, currentBld, latestVer, latestBld) {
  if (!latestVer) return false;

  const curParts = (currentVer || '0').split('.').map(p => parseInt(p, 10) || 0);
  const latParts = (latestVer || '0').split('.').map(p => parseInt(p, 10) || 0);
  const maxLen = Math.max(curParts.length, latParts.length);

  for (let i = 0; i < maxLen; i++) {
    const c = curParts[i] || 0;
    const l = latParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  // If marketing versions are identical, check build number
  if (latestBld != null && currentBld != null) {
    const cBuild = parseInt(currentBld, 10) || 0;
    const lBuild = parseInt(latestBld, 10) || 0;
    return lBuild > cBuild;
  }

  return false;
}

export default function useAppVersionCheck() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [storeUrl, setStoreUrl] = useState(STORE_URLS[Platform.OS]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const platform = Platform.OS; // 'android' | 'ios'

        if (platform === 'android') {
          // -------------------------------------------------------------
          // ANDROID LOGIC:
          // versionName (e.g. "1.0.4")
          // -------------------------------------------------------------
          const currentVersion = getVersion();
          console.log(`[AppVersionCheck:Android] currentVersion: ${currentVersion}`);

          const result = await getAppVersionCheck({ platform: 'android', currentVersion });
          console.log('[AppVersionCheck:Android] response:', JSON.stringify(result, null, 2));
          if (cancelled) return;

          const isUpdate = result.updateAvailable !== undefined
            ? !!result.updateAvailable
            : isUpdateAvailable(currentVersion, null, result.latestVersion, null);

          if (isUpdate) {
            console.log('[AppVersionCheck:Android] -> showing update modal');
            setMessage(result.message || '');
            const validUrl = result.storeUrl && result.storeUrl.startsWith('http') ? result.storeUrl : STORE_URLS.android;
            setStoreUrl(validUrl);
            setVisible(true);
          } else {
            console.log('[AppVersionCheck:Android] -> app is up to date');
          }

        } else if (platform === 'ios') {
          // -------------------------------------------------------------
          // IOS LOGIC:
          // MARKETING_VERSION (e.g. "1.0.2") + CURRENT_PROJECT_VERSION (e.g. "2")
          // -------------------------------------------------------------
          const currentVersion = getVersion();       // "1.0.2"
          const currentBuild = getBuildNumber();     // "2"
          console.log(`[AppVersionCheck:iOS] currentVersion: ${currentVersion} | currentBuild: ${currentBuild}`);

          const result = await getAppVersionCheck({ platform: 'ios', currentVersion });
          console.log('[AppVersionCheck:iOS] response:', JSON.stringify(result, null, 2));
          if (cancelled) return;

          // Check update: use backend update_available OR compare version & build
          const isUpdate = result.updateAvailable !== undefined
            ? !!result.updateAvailable
            : isUpdateAvailable(currentVersion, currentBuild, result.latestVersion, result.latestBuild);

          if (isUpdate) {
            console.log(`[AppVersionCheck:iOS] -> showing update modal. Installed: ${currentVersion}(${currentBuild}) vs Latest: ${result.latestVersion}(${result.latestBuild})`);
            setMessage(result.message || '');
            const validUrl = result.storeUrl && result.storeUrl.startsWith('http') ? result.storeUrl : STORE_URLS.ios;
            setStoreUrl(validUrl);
            setVisible(true);
          } else {
            console.log('[AppVersionCheck:iOS] -> app is up to date');
          }
        }
      } catch (error) {
        console.log('[AppVersionCheck] error:', error?.message || error);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const onUpdate = useCallback(() => {
    Linking.openURL(storeUrl);
  }, [storeUrl]);

  const onClose = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, message, onUpdate, onClose };
}
