import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';

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
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyCustomersMain" component={MyCustomers} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetail} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
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

function PlannerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlannerMain" component={Planner} />
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

function CustomTabLabel({ label, focused, color }) {
  return (
    <View style={{ alignItems: 'center', paddingBottom: 4 }}>
      <Text style={[styles.tabLabel, { color, paddingBottom: 0 }]}>{label}</Text>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: focused ? color : 'transparent', marginTop: 2 }} />
    </View>
  );
}

function RMTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#A64416',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'DashboardMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="dashboard" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Dashboard" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'DashboardMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'MyCustomersMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="groups" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Customers" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'MyCustomersMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="TicketsTab"
        component={TicketsStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'TicketsMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="confirmation-number" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Tickets" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'TicketsMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="PlannerTab"
        component={PlannerStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'PlannerMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="event" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Planner" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'PlannerMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'ProfileMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="person-outline" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Profile" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'ProfileMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabLabel: {
    ...typography.tiny,
    fontFamily: typography.labelMedium.fontFamily,
    paddingBottom: 4,
  },
});

export default RMTabNavigator;
