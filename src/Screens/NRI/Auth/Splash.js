import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { fetchCurrentUser } from '../../../Redux/slices/userSlice';
import { store } from '../../../Redux/store';

function Splash({ navigation }) {
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise(resolve => setTimeout(resolve, 2000));

    const resolveRoute = async () => {
      if (!isAuthenticated) return 'Onboarding';

      // Validate the persisted token against the backend and refresh the
      // profile (membership, RM contact, etc.) before entering the app.
      const result = await dispatch(fetchCurrentUser());
      if (fetchCurrentUser.fulfilled.match(result)) {
        // Read the resolved state, not `result.payload` directly — the slice's
        // reducer preserves the locally-tracked `onboarded` flag when the
        // backend doesn't report one, and that resolution only happens once
        // the reducer runs (i.e. in the store, not on the raw thunk payload).
        const onboarded = store.getState().user.user?.onboarded;
        return onboarded ? 'AppHome' : 'OnboardingProfile';
      }
      if (result.payload?.status === 401) {
        // Token is no longer valid — the slice already cleared the session.
        return 'Onboarding';
      }
      // Network hiccup or server error: don't sign the user out over a
      // temporary connectivity issue, just enter the app with cached data.
      return 'AppHome';
    };

    Promise.all([resolveRoute(), minDelay]).then(([route]) => {
      if (!cancelled) navigation.replace(route);
    });

    return () => { cancelled = true; };
  }, [isAuthenticated, navigation, dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Icon name="radio-button-checked" size={50} color="#007AFF" />
      </View>
      <Text style={styles.title}>NRI Circle</Text>
      <Text style={styles.subtitle}>India's Most Trusted Family & Property Care</Text>
      
      <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark Slate Blue matching our premium design system
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Outfit',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  loader: {
    marginTop: 50,
  },
});

export default Splash;
