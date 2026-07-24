import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { fetchCurrentUser } from '../../../Redux/slices/userSlice';
import { selectOnboardingRoute } from '../../../Redux/slices/onboardingSlice';
import { store } from '../../../Redux/store';
import { lightColors } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  ...lightColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

function LoadingBar({ color, trackColor }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 4000, // 24 hours (effectively infinite for debugging)
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.trackFill, { backgroundColor: color, width }]} />
    </View>
  );
}

export default function Splash({ navigation }) {
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // Animated values
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Background Parallax shapes
  const slide1 = useRef(new Animated.Value(-40)).current;
  const slide2 = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Parallax background animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(slide1, { toValue: 40, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(slide1, { toValue: -40, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(slide2, { toValue: -40, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(slide2, { toValue: 40, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.sequence([
      Animated.timing(bgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(footerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise(resolve => setTimeout(resolve, 4000)); // 24 hours

    const resolveRoute = async () => {
      if (!isAuthenticated) return 'Onboarding';
      const result = await dispatch(fetchCurrentUser());
      if (fetchCurrentUser.fulfilled.match(result)) {
        return selectOnboardingRoute(store.getState());
      }
      if (result.payload?.status === 401) return 'Onboarding';
      return 'AppHome';
    };

    Promise.all([resolveRoute(), minDelay]).then(([route]) => {
      if (!cancelled) navigation.replace(route);
    });

    return () => { cancelled = true; };
  }, [isAuthenticated, navigation, dispatch]);

  return (
    <Animated.View style={[styles.root, { backgroundColor: C.background, opacity: bgOpacity }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Modern diagonal geometric background layers */}
      <Animated.View style={[styles.bgShape1, { transform: [{ rotate: '-35deg' }, { translateX: slide1 }] }]} />
      <Animated.View style={[styles.bgShape2, { transform: [{ rotate: '-35deg' }, { translateX: slide2 }] }]} />

      <View style={styles.center}>
        <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }], alignItems: 'center', marginBottom: spacing.xl }}>
          <View style={[styles.iconContainer, { backgroundColor: C.surface, shadowColor: C.primary }]}>
            <Icon name="public" size={46} color={C.primary} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentY }],
            },
          ]}
        >
          <Text style={styles.title}>
            NRI <Text style={[styles.titleHighlight, { color: C.primary }]}>Circle</Text>
          </Text>

          <View style={[styles.modernDivider, { backgroundColor: C.accent }]} />

          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            India's Most Trusted{'\n'}Family & Property Care
          </Text>

          <View style={[styles.badgeContainer, { backgroundColor: C.surfaceHighlight, borderColor: C.primary + '30' }]}>
            <Icon name="verified" size={16} color={C.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.badgeText, { color: C.primaryDark }]}>
              Trusted by 50,000+ NRI Families
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { bottom: styles.footer.bottom + insets.bottom, opacity: footerOpacity }]}>
        <LoadingBar color={C.primary} trackColor={C.progressTrack || '#E0E0E0'} />
        <Text style={[styles.footerLabel, { color: C.textPlaceholder }]}>
          Preparing your experience
        </Text>
      </Animated.View>

      {/* Bottom stamp */}
      <Animated.View style={[styles.stamp, { bottom: styles.stamp.bottom + insets.bottom, opacity: footerOpacity }]}>
        <Text style={[styles.stampText, { color: C.textPlaceholder }]}>
          POWERED BY NRI CIRCLE
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Diagonal shapes replacing the circles
  bgShape1: {
    position: 'absolute',
    top: -H * 0.3,
    right: -W * 0.4,
    width: W * 2,
    height: H * 0.8,
    backgroundColor: C.primaryLight + '12',
    borderRadius: 40, // slight softening of the sharp angles
  },
  bgShape2: {
    position: 'absolute',
    bottom: -H * 0.4,
    left: -W * 0.6,
    width: W * 2,
    height: H * 0.6,
    backgroundColor: C.accent + '15',
    borderRadius: 60,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
    marginTop: -H * 0.05,
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  contentContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 42,
    letterSpacing: -1,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  titleHighlight: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 42,
    letterSpacing: -1,
  },
  modernDivider: {
    height: 4,
    width: 40,
    borderRadius: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl + spacing.lg,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl + spacing.lg,
    zIndex: 10,
  },
  track: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  footerLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  stamp: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    zIndex: 10,
  },
  stampText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 9,
    letterSpacing: 2,
  },
});
