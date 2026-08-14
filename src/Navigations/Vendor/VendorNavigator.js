import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Dashboard from '../../Screens/Vendor/Dashboard';
import MyJobs from '../../Screens/Vendor/MyJobs';
import Earnings from '../../Screens/Vendor/Earnings';
import PayoutDetail from '../../Screens/Vendor/PayoutDetail';
import Ratings from '../../Screens/Vendor/Ratings';
import Support from '../../Screens/Vendor/Support';
import Disputes from '../../Screens/Vendor/Disputes';
import Profile from '../../Screens/Vendor/Profile';

import JobDetail from '../../Screens/Vendor/JobDetail';
import JobSupportChat from '../../Screens/Vendor/JobSupportChat';
import Documents from '../../Screens/Vendor/Documents';
import ProfilePersonal from '../../Screens/Vendor/ProfilePersonal';
import ProfilePassword from '../../Screens/NRI/ProfilePassword';
import BankDetails from '../../Screens/Vendor/BankDetails';
import SupportTicketDetail from '../../Screens/Vendor/SupportTicketDetail';
import Availability from '../../Screens/Vendor/Availability';
import ServiceOffered from '../../Screens/Vendor/ServiceOffered';
import CoverageAreas from '../../Screens/Vendor/CoverageAreas';
import Notifications from '../../Screens/NRI/Notifications';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// The root (first) screen of each tab's stack. Tapping a tab always returns to
// its root so a deep screen the stack was left on (e.g. the Notifications list
// under Home, which also hides the tab bar) can't be re-surfaced by the tab.
const TAB_ROOT_SCREENS = {
  Dashboard: 'DashboardMain',
  MyJobs: 'MyJobsMain',
  Earnings: 'EarningsMain',
  Support: 'SupportMain',
  Profile: 'ProfileMain',
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={Dashboard} />
      <Stack.Screen name="JobDetail" component={JobDetail} />
      <Stack.Screen name="JobSupportChat" component={JobSupportChat} />
      <Stack.Screen name="Documents" component={Documents} />
      <Stack.Screen name="Ratings" component={Ratings} />
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
}

function MyJobsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyJobsMain" component={MyJobs} />
      <Stack.Screen name="JobDetail" component={JobDetail} />
      <Stack.Screen name="JobSupportChat" component={JobSupportChat} />
    </Stack.Navigator>
  );
}

function EarningsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EarningsMain" component={Earnings} />
      <Stack.Screen name="PayoutDetail" component={PayoutDetail} />
    </Stack.Navigator>
  );
}

function SupportStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupportMain" component={Support} />
      <Stack.Screen name="Disputes" component={Disputes} />
      <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetail} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="ProfilePersonal" component={ProfilePersonal} />
      <Stack.Screen name="ProfilePassword" component={ProfilePassword} />
      <Stack.Screen name="BankDetails" component={BankDetails} />
      <Stack.Screen name="Documents" component={Documents} />
      <Stack.Screen name="Availability" component={Availability} />
      <Stack.Screen name="ServiceOffered" component={ServiceOffered} />
      <Stack.Screen name="CoverageAreas" component={CoverageAreas} />
    </Stack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const focusedRoute = state.routes[state.index];
  const { options } = descriptors[focusedRoute.key];
  const tabBarStyle = options.tabBarStyle;

  // Edge-to-edge (Android 15/16 SDK 35+) forces the app under the system nav
  // bar — pad the bottom by the safe-area inset so the tab bar isn't clipped.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  const [layouts, setLayouts] = React.useState([]);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const pillWidth = React.useRef(new Animated.Value(0)).current;

  const handleLayout = (e, index) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts(prev => {
      const newLayouts = [...prev];
      if (!newLayouts[index] || newLayouts[index].x !== x || newLayouts[index].width !== width) {
        newLayouts[index] = { x, width };
        return newLayouts;
      }
      return prev;
    });
  };

  const isLayoutReady = layouts.filter(Boolean).length === state.routes.length;

  React.useEffect(() => {
    if (isLayoutReady && layouts[state.index]) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: layouts[state.index].x,
          useNativeDriver: false,
        }),
        Animated.spring(pillWidth, {
          toValue: layouts[state.index].width,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [state.index, layouts, isLayoutReady]);

  if (tabBarStyle && tabBarStyle.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.floatingTabBar, { paddingBottom: bottomInset }]}>
      {isLayoutReady && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 12,
            bottom: bottomInset,
            backgroundColor: '#A64416',
            borderRadius: 30,
            width: pillWidth,
            transform: [{ translateX }],
          }}
        />
      )}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconName = options.tabBarIconName || 'circle';
        const label = options.tabBarLabel || route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (event.defaultPrevented) return;
          const rootScreen = TAB_ROOT_SCREENS[route.name];
          if (rootScreen) {
            // Land on the tab's root screen, popping any deep screen the stack
            // was left on (so the tab bar reappears and re-tapping never
            // reopens e.g. the support chat).
            navigation.navigate(route.name, { screen: rootScreen });
          } else if (!isFocused) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            onLayout={(e) => handleLayout(e, index)}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.8}
            style={styles.tabItem}
          >
            <Icon
              name={iconName}
              size={24}
              color={isFocused ? '#FFFFFF' : '#94A3B8'}
            />
            {isFocused && (
              <Text style={styles.tabLabelFocused} numberOfLines={1}>
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function VendorTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'DashboardMain';
          return {
            tabBarIconName: 'home',
            tabBarLabel: 'Home',
            tabBarStyle: focusedRouteName === 'DashboardMain' ? {} : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="MyJobs"
        component={MyJobsStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'MyJobsMain';
          return {
            tabBarIconName: 'work',
            tabBarLabel: 'My Jobs',
            tabBarStyle: focusedRouteName === 'MyJobsMain' ? {} : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'EarningsMain';
          return {
            tabBarIconName: 'account-balance-wallet',
            tabBarLabel: 'Earnings',
            tabBarStyle: focusedRouteName === 'EarningsMain' ? {} : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'SupportMain';
          return {
            tabBarIconName: 'support-agent',
            tabBarLabel: 'Support',
            tabBarStyle: focusedRouteName === 'SupportMain' ? {} : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'ProfileMain';
          return {
            tabBarIconName: 'person-outline',
            tabBarLabel: 'Profile',
            tabBarStyle: focusedRouteName === 'ProfileMain' ? {} : { display: 'none' },
          };
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingTabBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  tabLabelFocused: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default VendorTabNavigator;
