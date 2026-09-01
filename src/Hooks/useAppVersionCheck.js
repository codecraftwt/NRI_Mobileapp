import { useEffect, useState, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import { getVersion } from 'react-native-device-info';
import { getAppVersionCheck } from '../Api/appVersionApi';

const STORE_URLS = {
  android: 'https://play.google.com/store/apps/details?id=com.nricircle',
  ios: 'https://apps.apple.com/us/app/nri-circle/id6795533441',
};

export default function useAppVersionCheck() {
  const [visible, setVisible] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [message, setMessage] = useState('');
  const [storeUrl, setStoreUrl] = useState(STORE_URLS[Platform.OS]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const currentVersion = getVersion();
        const platform = Platform.OS;
        console.log('[AppVersionCheck] platform:', platform, '| currentVersion:', currentVersion);
        const result = await getAppVersionCheck({ platform, currentVersion });
        console.log('[AppVersionCheck] response:', JSON.stringify(result, null, 2));
        if (cancelled) return;

        if (result.updateAvailable || result.forceUpdate) {
          console.log('[AppVersionCheck] -> showing modal | forceUpdate:', result.forceUpdate);
          setForceUpdate(result.forceUpdate);
          setMessage(result.message || '');
          setStoreUrl(result.storeUrl || STORE_URLS[Platform.OS]);
          setVisible(true);
        } else {
          console.log('[AppVersionCheck] -> no update needed');
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

  return { visible, forceUpdate, message, onUpdate, onClose };
}
