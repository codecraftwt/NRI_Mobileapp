import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { fetchStateAdminVendors } from '../../Redux/slices/stateAdminVendorsSlice';
import { fetchStateAdminTickets } from '../../Redux/slices/stateAdminTicketsSlice';
import { fetchStateAdminCustomers } from '../../Redux/slices/stateAdminCustomersSlice';

import Dashboard from '../../Screens/StateAdmin/Dashboard';
import AdminRoles from '../../Screens/StateAdmin/AdminRoles';
import Analysis from '../../Screens/StateAdmin/Analysis';
import Revenue from '../../Screens/StateAdmin/Revenue';
import DistrictBreakdown from '../../Screens/StateAdmin/DistrictBreakdown';
import RecentTickets from '../../Screens/StateAdmin/RecentTickets';
import Tickets from '../../Screens/StateAdmin/Tickets';
import TicketDetail from '../../Screens/StateAdmin/TicketDetail';
import Vendors from '../../Screens/StateAdmin/Vendors';
import VendorDetail from '../../Screens/StateAdmin/VendorDetail';
import PendingVendors from '../../Screens/StateAdmin/PendingVendors';
import Users from '../../Screens/StateAdmin/Users';
import CustomerDetail from '../../Screens/StateAdmin/CustomerDetail';
import CustomerPayments from '../../Screens/StateAdmin/CustomerPayments';
import Profile from '../../Screens/StateAdmin/Profile';
import Notifications from '../../Screens/NRI/Notifications';
import NotificationPreferences from '../../Screens/StateAdmin/NotificationPreferences';
import ProfilePersonal from '../../Screens/NRI/ProfilePersonal';
import ProfileAddress from '../../Screens/NRI/ProfileAddress';
import ProfilePassword from '../../Screens/NRI/ProfilePassword';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ROOT_SCREENS = {
  Dashboard: 'DashboardMain',
  Vendors: 'VendorsMain',
  Customers: 'UsersMain',
  Tickets: 'TicketsMain',
  Profile: 'ProfileMain',
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={Dashboard} />
      <Stack.Screen name="AdminRoles" component={AdminRoles} />
      <Stack.Screen name="Analysis" component={Analysis} />
      <Stack.Screen name="Revenue" component={Revenue} />
      <Stack.Screen name="PendingVendors" component={PendingVendors} />
      <Stack.Screen name="VendorDetail" component={VendorDetail} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferences} />
      <Stack.Screen name="DistrictBreakdown" component={DistrictBreakdown} />
      <Stack.Screen name="RecentTickets" component={RecentTickets} />
      <Stack.Screen name="Users" component={Users} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetail} />
      <Stack.Screen name="CustomerPayments" component={CustomerPayments} />
    </Stack.Navigator>
  );
}

function VendorsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VendorsMain" component={Vendors} />
      <Stack.Screen name="VendorDetail" component={VendorDetail} />
      <Stack.Screen name="PendingVendors" component={PendingVendors} />
    </Stack.Navigator>
  );
}

function UsersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UsersMain" component={Users} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetail} />
      <Stack.Screen name="CustomerPayments" component={CustomerPayments} />
    </Stack.Navigator>
  );
}

function TicketsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TicketsMain" component={Tickets} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="ProfilePersonal" component={ProfilePersonal} />
      <Stack.Screen name="ProfileAddress" component={ProfileAddress} />
      <Stack.Screen name="ProfilePassword" component={ProfilePassword} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferences} />
    </Stack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const focusedRoute = state.routes[state.index];
  const { options } = descriptors[focusedRoute.key];
  const tabBarStyle = options.tabBarStyle;

  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  const [layouts, setLayouts] = React.useState([]);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const pillWidth = React.useRef(new Animated.Value(0)).current;

  // Tab count can shrink after mount (a module tab hides once its 403 probe
  // resolves) — stale per-index measurements from the larger route set would
  // otherwise permanently block isLayoutReady below (its length check could
  // never match again), leaving the focused pill — and the white focused
  // icon riding on it — stuck un-rendered. Re-measure from scratch whenever
  // the route count changes.
  React.useEffect(() => {
    setLayouts([]);
  }, [state.routes.length]);

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
        }),
      ]).start();
    }
  }, [state.index, layouts, isLayoutReady, pillWidth, translateX]);

  if (tabBarStyle && tabBarStyle.display === 'none') {
    return null;
  }

  // With all 5 tabs visible, items size to their own content (icon-only vs.
  // icon+label) and space-between spreads them out — an equal 1/5 slot per
  // tab is too narrow for a label like "Customers" and truncates it. But
  // once a module's hidden by the 403 check and only 2-3 tabs remain, each
  // slot is wide enough to go fully equal-width, which is what actually
  // reads as "full" rather than two items anchored to the bar's outer edges
  // with a dead gap between them.
  const isCompact = state.routes.length <= 3;

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
        const { options: routeOptions } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconName = routeOptions.tabBarIconName || 'circle';
        const label = routeOptions.tabBarLabel || route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (event.defaultPrevented) return;
          const rootScreen = TAB_ROOT_SCREENS[route.name];
          if (rootScreen) {
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
            accessibilityLabel={routeOptions.tabBarAccessibilityLabel}
            testID={routeOptions.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.8}
            style={[styles.tabItem, isCompact && styles.tabItemCompact]}
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

// A tab is hidden ONLY when its list endpoint has confirmed a 403 "This
// action is unauthorized" response for this admin (district/taluka-admins
// don't all get the same module access as a state-admin). Any other state —
// not yet fetched, loading, succeeded with an empty list, or a non-403
// failure (network error etc.) — must keep the tab visible, so this only
// ever flips to `true` on a confirmed permission denial, never on "no data
// yet".
const isForbidden = (error) => error?.status === 403;

function StateAdminTabNavigator() {
  const dispatch = useDispatch();
  const vendorsStatus = useSelector(s => s.stateAdminVendors?.status || 'idle');
  const vendorsError = useSelector(s => s.stateAdminVendors?.error);
  const ticketsStatus = useSelector(s => s.stateAdminTickets?.status || 'idle');
  const ticketsError = useSelector(s => s.stateAdminTickets?.error);
  const customersStatus = useSelector(s => s.stateAdminCustomers?.status || 'idle');
  const customersError = useSelector(s => s.stateAdminCustomers?.error);

  // Probe each module once up front so a tab this admin can't access is
  // hidden from the very first render, instead of only after they tap into
  // it and hit a 403 screen.
  useEffect(() => {
    if (vendorsStatus === 'idle') dispatch(fetchStateAdminVendors());
    if (ticketsStatus === 'idle') dispatch(fetchStateAdminTickets());
    if (customersStatus === 'idle') dispatch(fetchStateAdminCustomers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showVendors = !isForbidden(vendorsError);
  const showTickets = !isForbidden(ticketsError);
  const showCustomers = !isForbidden(customersError);

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
      {showVendors && (
        <Tab.Screen
          name="Vendors"
          component={VendorsStack}
          options={({ route }) => {
            const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'VendorsMain';
            return {
              tabBarIconName: 'engineering',
              tabBarLabel: 'Vendors',
              tabBarStyle: focusedRouteName === 'VendorsMain' ? {} : { display: 'none' },
            };
          }}
        />
      )}
      {showCustomers && (
        <Tab.Screen
          name="Customers"
          component={UsersStack}
          options={({ route }) => {
            const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'UsersMain';
            return {
              tabBarIconName: 'people',
              tabBarLabel: 'Customers',
              tabBarStyle: focusedRouteName === 'UsersMain' ? {} : { display: 'none' },
            };
          }}
        />
      )}
      {showTickets && (
        <Tab.Screen
          name="Tickets"
          component={TicketsStack}
          options={({ route }) => {
            const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'TicketsMain';
            return {
              tabBarIconName: 'confirmation-number',
              tabBarLabel: 'Tickets',
              tabBarStyle: focusedRouteName === 'TicketsMain' ? {} : { display: 'none' },
            };
          }}
        />
      )}
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
    paddingHorizontal: 14,
    borderRadius: 30,
  },
  tabItemCompact: {
    flex: 1,
  },
  tabLabelFocused: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default StateAdminTabNavigator;
