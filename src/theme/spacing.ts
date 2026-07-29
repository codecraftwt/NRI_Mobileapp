import { Platform, StatusBar } from 'react-native';

export const STATUS_BAR_HEIGHT = (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47) + 22;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

/** Job card inner padding (12–16) */
export const cardPadding = {
  vertical: 12,
  horizontal: 16,
} as const;
