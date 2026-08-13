import { createNavigationContainerRef } from '@react-navigation/native';

// Shared navigation ref so non-React code (FCM notification taps) can navigate
// without a component's `navigation` prop.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function dispatch(action) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(action);
  }
}
