import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Dashboard from '../../Screens/RM/Dashboard';
import MyCustomers from '../../Screens/RM/MyCustomers';
import CustomerDetail from '../../Screens/RM/CustomerDetail';
import Tickets from '../../Screens/RM/Tickets';
import TicketDetail from '../../Screens/RM/TicketDetail';
import GeneralSupport from '../../Screens/RM/GeneralSupport';
import Planner from '../../Screens/RM/Planner';
import Renewals from '../../Screens/RM/Renewals';
import Upsell from '../../Screens/RM/Upsell';
import Escalations from '../../Screens/RM/Escalations';
import Reports from '../../Screens/RM/Reports';
import SupportChat from '../../Screens/RM/SupportChat';
import Profile from '../../Screens/RM/Profile';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={Dashboard} />
      <Stack.Screen name="MyCustomers" component={MyCustomers} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetail} />
      <Stack.Screen name="Tickets" component={Tickets} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
      <Stack.Screen name="GeneralSupport" component={GeneralSupport} />
      <Stack.Screen name="Planner" component={Planner} />
      <Stack.Screen name="Renewals" component={Renewals} />
      <Stack.Screen name="Upsell" component={Upsell} />
      <Stack.Screen name="Escalations" component={Escalations} />
      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="RMSupportChat" component={SupportChat} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyCustomersMain" component={MyCustomers} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetail} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
      <Stack.Screen name="RMSupportChat" component={SupportChat} />
    </Stack.Navigator>
  );
}

function TicketsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TicketsMain" component={Tickets} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
      <Stack.Screen name="RMSupportChat" component={SupportChat} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="MyCustomers" component={MyCustomers} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetail} />
      <Stack.Screen name="Escalations" component={Escalations} />
      <Stack.Screen name="GeneralSupport" component={GeneralSupport} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
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

          if (!isFocused && !event.defaultPrevented) {
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

function RMTabNavigator() {
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
        name="Customers"
        component={CustomersStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'MyCustomersMain';
          return {
            tabBarIconName: 'groups',
            tabBarLabel: 'Customers',
            tabBarStyle: focusedRouteName === 'MyCustomersMain' ? {} : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="TicketsTab"
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

export default RMTabNavigator;
