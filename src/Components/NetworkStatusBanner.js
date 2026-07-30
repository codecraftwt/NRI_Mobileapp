import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../theme/typography';

// Top-of-screen popup that appears whenever the device loses its network
// (Wi-Fi + mobile data both off / unreachable) and briefly confirms when the
// connection is restored. Mounted once at the app root so it overlays every
// screen. Self-contained: subscribes to NetInfo directly, no props required.
function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  // null = not yet determined (show nothing), true/false = known state.
  const [isOffline, setIsOffline] = useState(null);
  const [showReconnected, setShowReconnected] = useState(false);
  const translateY = useRef(new Animated.Value(-160)).current;
  const reconnectTimer = useRef(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Treat unknown reachability (null) as online to avoid false alarms;
      // offline only when we positively know there's no connection.
      const offline =
        state.isConnected === false || state.isInternetReachable === false;

      setIsOffline((prev) => {
        // Transition online -> offline handled by the offline branch below.
        // Transition offline -> online: flash the "Back online" confirmation.
        if (prev === true && !offline) {
          setShowReconnected(true);
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(() => {
            setShowReconnected(false);
          }, 2000);
        }
        return offline;
      });
    });

    return () => {
      unsubscribe();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  // Slide the banner in when offline (or while flashing "Back online"), out otherwise.
  const visible = isOffline === true || showReconnected;
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -160,
      useNativeDriver: true,
      bounciness: 6,
      speed: 12,
    }).start();
  }, [visible, translateY]);

  if (isOffline === null && !showReconnected) {
    return null;
  }

  const online = !isOffline;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 12) + 10, transform: [{ translateY }] },
        online ? styles.online : styles.offline,
      ]}
    >
      <Icon
        name={online ? 'wifi' : 'wifi-off'}
        size={20}
        color="#FFFFFF"
      />
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {online ? 'Back online' : 'Your network is gone'}
        </Text>
        {!online && (
          <Text style={styles.subtitle}>
            Please check your Wi-Fi or mobile data
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 14,
    zIndex: 99999,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  offline: { backgroundColor: '#DC2626' },
  online: { backgroundColor: '#16A34A' },
  textWrap: { flex: 1 },
  title: {
    ...typography.labelMedium,
    color: '#FFFFFF',
  },
  subtitle: {
    ...typography.small,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
});

export default NetworkStatusBanner;
