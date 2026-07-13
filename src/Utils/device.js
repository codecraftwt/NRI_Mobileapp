import { Platform } from 'react-native';

// TODO: swap for react-native-device-info's getDeviceName()/getModel() for a
// more precise, human-readable device name once that native module is added.
export function getDeviceName() {
  if (Platform.OS === 'android') {
    const brand = Platform.constants?.Brand;
    const model = Platform.constants?.Model;
    const parts = [brand, model].filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return `${Platform.OS} ${Platform.Version}`;
}
