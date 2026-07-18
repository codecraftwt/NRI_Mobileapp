import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';

import Dashboard from '../../Screens/Vendor/Dashboard';
import MyJobs from '../../Screens/Vendor/MyJobs';
import Earnings from '../../Screens/Vendor/Earnings';
import Support from '../../Screens/Vendor/Support';
import Profile from '../../Screens/Vendor/Profile';

import JobDetail from '../../Screens/Vendor/JobDetail';
import Documents from '../../Screens/Vendor/Documents';
import ProfilePersonal from '../../Screens/Vendor/ProfilePersonal';
import BankDetails from '../../Screens/Vendor/BankDetails';
import SupportTicketDetail from '../../Screens/Vendor/SupportTicketDetail';
import Availability from '../../Screens/Vendor/Availability';
import ServiceOffered from '../../Screens/Vendor/ServiceOffered';
import CoverageAreas from '../../Screens/Vendor/CoverageAreas';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={Dashboard} />
      <Stack.Screen name="JobDetail" component={JobDetail} />
      <Stack.Screen name="Documents" component={Documents} />
    </Stack.Navigator>
  );
}

function MyJobsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyJobsMain" component={MyJobs} />
      <Stack.Screen name="JobDetail" component={JobDetail} />
    </Stack.Navigator>
  );
}

function EarningsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EarningsMain" component={Earnings} />
    </Stack.Navigator>
  );
}

function SupportStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupportMain" component={Support} />
      <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetail} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="ProfilePersonal" component={ProfilePersonal} />
      <Stack.Screen name="BankDetails" component={BankDetails} />
      <Stack.Screen name="Documents" component={Documents} />
      <Stack.Screen name="Availability" component={Availability} />
      <Stack.Screen name="ServiceOffered" component={ServiceOffered} />
      <Stack.Screen name="CoverageAreas" component={CoverageAreas} />
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

function VendorTabNavigator() {
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
        name="MyJobs"
        component={MyJobsStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'MyJobsMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="work" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="My Jobs" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'MyJobsMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'EarningsMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="account-balance-wallet" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Earnings" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'EarningsMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'SupportMain';
          return {
            tabBarIcon: ({ color, size }) => <Icon name="support-agent" size={size} color={color} />,
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Support" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'SupportMain' ? styles.tabBar : { display: 'none' },
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

export default VendorTabNavigator;
