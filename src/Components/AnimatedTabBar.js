import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';

const TabIcon = ({ isFocused, iconName, label }) => {
  // Animation values
  const scale = useRef(new Animated.Value(isFocused ? 1 : 0.8)).current;
  const translateY = useRef(new Animated.Value(isFocused ? -15 : 0)).current;
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.1 : 1,
        useNativeDriver: true,
        friction: 5,
        tension: 60,
      }),
      Animated.spring(translateY, {
        toValue: isFocused ? -18 : 0, // Jump up out of the pill
        useNativeDriver: true,
        friction: 5,
        tension: 50,
      }),
      Animated.timing(opacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  return (
    <View style={styles.tabItem}>
      <Animated.View style={[styles.iconWrapper, { transform: [{ translateY }, { scale }] }]}>
        <View style={[styles.activeCircle, isFocused && styles.activeCircleVisible]}>
          <Icon name={iconName} size={isFocused ? 24 : 26} color={isFocused ? '#FFFFFF' : '#94A3B8'} />
        </View>
      </Animated.View>
      <Animated.View style={{ opacity, transform: [{ translateY: -10 }], position: 'absolute', bottom: -12 }}>
        <Text style={[styles.tabLabel, { color: colors.primary }]}>{label}</Text>
      </Animated.View>
    </View>
  );
};

export function AnimatedTabBar({ state, descriptors, navigation }) {
  // Check if the current focused screen wants to hide the tab bar
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        // Map icons manually based on the route name
        let iconName = 'circle';
        if (route.name === 'Dashboard') iconName = 'dashboard';
        else if (route.name === 'My Tickets') iconName = 'assignment';
        else if (route.name === 'Family') iconName = 'people';
        else if (route.name === 'My Membership') iconName = 'workspace-premium';
        else if (route.name === 'Profile') iconName = 'person';

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={1} // Disable default opacity flicker to let animations shine
          >
            <TabIcon isFocused={isFocused} iconName={iconName} label={label} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 64, // Sleeker height for a pill
    borderRadius: 32, // Perfect pill
    marginHorizontal: 16,
    marginBottom: 20, // Float above bottom edge
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: 60,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2, // ensure jumping icon is above everything
  },
  activeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircleVisible: {
    backgroundColor: colors.primary, // Pop of brand color
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF', // Creates a cutout illusion against the pill
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    fontWeight: '700',
    textAlign: 'center',
  }
});
