import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Dashboard from '../../Screens/Telecaller/Dashboard';
import ServiceRequests from '../../Screens/Telecaller/ServiceRequests';
import Vendors from '../../Screens/Telecaller/Vendors';
import Customers from '../../Screens/Telecaller/Customers';
import Profile from '../../Screens/Telecaller/Profile';

import CallCentre from '../../Screens/Telecaller/CallCentre';
import CallHistory from '../../Screens/Telecaller/CallHistory';
import GeneralSupport from '../../Screens/Telecaller/GeneralSupport';
import CustomPlan from '../../Screens/Telecaller/CustomPlan';
import MyCustomers from '../../Screens/Telecaller/MyCustomers';
import TicketDetail from '../../Screens/Telecaller/TicketDetail';
import NewServiceRequest from '../../Screens/Telecaller/NewServiceRequest';
import VendorDetail from '../../Screens/Telecaller/VendorDetail';
import Notifications from '../../Screens/NRI/Notifications';
import ProfilePersonal from '../../Screens/NRI/ProfilePersonal';
import ProfilePassword from '../../Screens/NRI/ProfilePassword';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// The root (first) screen of each tab's stack. Tapping a tab always returns to
// its root so a deep screen the stack was left on can't be re-surfaced by the tab.
const TAB_ROOT_SCREENS = {
  Dashboard: 'DashboardMain',
  ServiceRequests: 'ServiceRequestsMain',
  Vendors: 'VendorsMain',
  Customers: 'CustomersMain',
  Profile: 'ProfileMain',
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={Dashboard} />
      <Stack.Screen name="CallCentre" component={CallCentre} />
      <Stack.Screen name="CallHistory" component={CallHistory} />
      <Stack.Screen name="GeneralSupport" component={GeneralSupport} />
      <Stack.Screen name="CustomPlan" component={CustomPlan} />
      <Stack.Screen name="MyCustomers" component={MyCustomers} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
      <Stack.Screen name="NewServiceRequest" component={NewServiceRequest} />
      <Stack.Screen name="VendorDetail" component={VendorDetail} />
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
}

function ServiceRequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServiceRequestsMain" component={ServiceRequests} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
      <Stack.Screen name="NewServiceRequest" component={NewServiceRequest} />
      <Stack.Screen name="VendorDetail" component={VendorDetail} />
    </Stack.Navigator>
  );
}

function VendorsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VendorsMain" component={Vendors} />
      <Stack.Screen name="VendorDetail" component={VendorDetail} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomersMain" component={Customers} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="ProfilePersonal" component={ProfilePersonal} />
      <Stack.Screen name="ProfilePassword" component={ProfilePassword} />
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

function TelecallerTabNavigator() {
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
        name="ServiceRequests"
        component={ServiceRequestsStack}
        options={{
          tabBarIconName: 'confirmation-number',
          tabBarLabel: 'Requests',
        }}
      />
      <Tab.Screen
        name="Vendors"
        component={VendorsStack}
        options={{
          tabBarIconName: 'storefront',
          tabBarLabel: 'Vendors',
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersStack}
        options={{
          tabBarIconName: 'groups',
          tabBarLabel: 'Customers',
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
    paddingHorizontal: 14,
    borderRadius: 30,
  },
  tabLabelFocused: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default TelecallerTabNavigator;
