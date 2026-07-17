import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors, typography } from '../theme';

// Import Auth Screens
import Splash from '../Screens/NRI/Auth/Splash';
import Onboarding from '../Screens/NRI/Auth/Onboarding';
import Login from '../Screens/NRI/Auth/Login';
import ForgotPassword from '../Screens/NRI/Auth/ForgotPassword';
import Register from '../Screens/NRI/Auth/Register';
import OnboardingProfile from '../Screens/NRI/Auth/OnboardingProfile';
import OnboardingPlan from '../Screens/NRI/Auth/OnboardingPlan';
import OnboardingAddons from '../Screens/NRI/Auth/OnboardingAddons';
import OnboardingPayment from '../Screens/NRI/Auth/OnboardingPayment';
import OnboardingWelcome from '../Screens/NRI/Auth/OnboardingWelcome';

// Import Core Dashboard Screens
import Dashboard from '../Screens/NRI/Dashboard';
import MyAccount from '../Screens/NRI/MyAccount';
import Services from '../Screens/NRI/Services';
import MyMembership from '../Screens/NRI/MyMembership';
import MembershipCheckout from '../Screens/NRI/MembershipCheckout';
import MembershipFeatures from '../Screens/NRI/MembershipFeatures';
import Family from '../Screens/NRI/Family';
import Properties from '../Screens/NRI/Properties';
import DocumentVault from '../Screens/NRI/DocumentVault';
import BillingPayments from '../Screens/NRI/BillingPayments';
import AddonPackages from '../Screens/NRI/AddonPackages';
import ReportsMedia from '../Screens/NRI/ReportsMedia';
import AnnualSummary from '../Screens/NRI/AnnualSummary';
import WalletCoupons from '../Screens/NRI/WalletCoupons';
import ReferEarn from '../Screens/NRI/ReferEarn';
import Profile from '../Screens/NRI/Profile';
import ProfilePersonal from '../Screens/NRI/ProfilePersonal';
import ProfileAddress from '../Screens/NRI/ProfileAddress';
import ProfileNri from '../Screens/NRI/ProfileNri';
import ProfilePassword from '../Screens/NRI/ProfilePassword';
import Customer from '../Screens/NRI/Customer';

// Import Service Booking Sub-Screens
import ServicesCatalog from '../Screens/NRI/ServicesCatalog';
import ServiceDetail from '../Screens/NRI/ServiceDetail';
import BookingSummary from '../Screens/NRI/BookingSummary';

// Import Ticket Screens
import CreateTicket from '../Screens/NRI/CreateTicket';
import TicketDetail from '../Screens/NRI/TicketDetail';

// Import Family Screens
import AddFamilyMember from '../Screens/NRI/AddFamilyMember';

// Import Property Screens
import AddProperty from '../Screens/NRI/AddProperty';
import UploadDocument from '../Screens/NRI/UploadDocument';

// Import Requests Screen
import Requests from '../Screens/NRI/Requests';

// Import Vendor Screens
import VendorNavigator from './Vendor/VendorNavigator';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack for Services Booking Flow
function ServicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServicesCatalog" component={ServicesCatalog} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetail} />
      <Stack.Screen name="BookingSummary" component={BookingSummary} />
    </Stack.Navigator>
  );
}

// Stack for Dashboard (includes quick action screens)
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={Dashboard} />
      <Stack.Screen name="My Account" component={MyAccount} />
      <Stack.Screen name="Properties" component={Properties} />
      <Stack.Screen name="AddProperty" component={AddProperty} />
      <Stack.Screen name="Document Vault" component={DocumentVault} />
      <Stack.Screen name="UploadDocument" component={UploadDocument} />
      <Stack.Screen name="Billing & Payments" component={BillingPayments} />
      <Stack.Screen name="Add-on Packages" component={AddonPackages} />
      <Stack.Screen name="Reports & Media" component={ReportsMedia} />
      <Stack.Screen name="Annual Summary" component={AnnualSummary} />
      <Stack.Screen name="Wallet & Coupons" component={WalletCoupons} />
      <Stack.Screen name="Refer & Earn" component={ReferEarn} />
      <Stack.Screen name="ServicesCatalog" component={ServicesStack} options={{ unmountOnBlur: true }} />
      <Stack.Screen name="CreateTicket" component={CreateTicket} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
      <Stack.Screen name="Customer" component={Customer} />
    </Stack.Navigator>
  );
}

// Stack for Services Tab
function MainServicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServicesMain" component={Services} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetail} />
      <Stack.Screen name="CreateTicket" component={CreateTicket} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
    </Stack.Navigator>
  );
}

// Stack for Requests
function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RequestsMain" component={Requests} />
      <Stack.Screen name="CreateTicket" component={CreateTicket} />
      <Stack.Screen name="TicketDetail" component={TicketDetail} />
    </Stack.Navigator>
  );
}

// Stack for My Membership
function MyMembershipStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyMembershipMain" component={MyMembership} />
      <Stack.Screen name="MembershipFeatures" component={MembershipFeatures} />
      <Stack.Screen name="MembershipCheckout" component={MembershipCheckout} />
      <Stack.Screen name="Add-on Packages" component={AddonPackages} />
    </Stack.Navigator>
  );
}

import ProfileSettings from '../Screens/NRI/ProfileSettings';

// Stack for Profile
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettings} />
      <Stack.Screen name="ProfilePersonal" component={ProfilePersonal} />
      <Stack.Screen name="ProfileAddress" component={ProfileAddress} />
      <Stack.Screen name="ProfileNri" component={ProfileNri} />
      <Stack.Screen name="ProfilePassword" component={ProfilePassword} />
      <Stack.Screen name="FamilyMain" component={Family} />
      <Stack.Screen name="AddFamilyMember" component={AddFamilyMember} />
      <Stack.Screen name="Customer" component={Customer} />
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

// Bottom Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#A64416', // Chocolate color
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={({ route }) => {
          // Bottom tabs are only meaningful on the Dashboard's own landing
          // screen — every sub-screen reached from it (Properties, Document
          // Vault, Billing, CreateTicket, TicketDetail, etc.) hides the tab
          // bar so it doesn't compete with each screen's own back navigation,
          // and it reappears automatically once the user backs out to
          // DashboardMain.
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'DashboardMain';
          return {
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" size={size} color={color} />
            ),
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Home" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'DashboardMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Services"
        component={MainServicesStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'ServicesMain';
          return {
            tabBarIcon: ({ color, size }) => (
              <Icon name="grid-view" size={size} color={color} />
            ),
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Services" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'ServicesMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'RequestsMain';
          return {
            tabBarIcon: ({ color, size }) => (
              <Icon name="assignment" size={size} color={color} />
            ),
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Requests" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'RequestsMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="My Membership"
        component={MyMembershipStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'MyMembershipMain';
          return {
            tabBarIcon: ({ color, size }) => (
              <Icon name="shield" size={size} color={color} />
            ),
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Plans" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'MyMembershipMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'ProfileMain';
          return {
            tabBarIcon: ({ color, size }) => (
              <Icon name="person-outline" size={size} color={color} />
            ),
            tabBarLabel: ({ focused, color }) => <CustomTabLabel label="Profile" focused={focused} color={color} />,
            tabBarStyle: focusedRouteName === 'ProfileMain' ? styles.tabBar : { display: 'none' },
          };
        }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Selector
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
      {/* Splash & Onboarding */}
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Onboarding" component={Onboarding} />

      {/* Authentication */}
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="Register" component={Register} />

      {/* Registration / Onboarding Wizard */}
      <Stack.Screen name="OnboardingProfile" component={OnboardingProfile} />
      <Stack.Screen name="OnboardingPlan" component={OnboardingPlan} />
      <Stack.Screen name="OnboardingAddons" component={OnboardingAddons} />
      <Stack.Screen name="OnboardingPayment" component={OnboardingPayment} />
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcome} />

      {/* Authenticated Application */}
      <Stack.Screen name="AppHome" component={MainTabNavigator} />

      {/* Vendor Flow — reached from the same Login screen based on account role */}
      <Stack.Screen name="VendorHome" component={VendorNavigator} />
    </Stack.Navigator>
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
