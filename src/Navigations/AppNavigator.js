import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, LayoutAnimation, UIManager, Platform, Animated } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors, typography } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Import Auth Screens
import Splash from '../Screens/NRI/Auth/Splash';
import Onboarding from '../Screens/NRI/Auth/Onboarding';
import Login from '../Screens/NRI/Auth/Login';
import ForgotPassword from '../Screens/NRI/Auth/ForgotPassword';
import Register from '../Screens/NRI/Auth/Register';
import VerifyEmail from '../Screens/NRI/Auth/VerifyEmail';
import OnboardingProfile from '../Screens/NRI/Auth/OnboardingProfile';
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
import AddonSubscriptions from '../Screens/NRI/AddonSubscriptions';
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
import Notifications from '../Screens/NRI/Notifications';
import GeneralSupport from '../Screens/NRI/GeneralSupport';
import NewSupportTicket from '../Screens/NRI/NewSupportTicket';
import SupportTicketChat from '../Screens/NRI/SupportTicketChat';
import RequestSupportChat from '../Screens/NRI/RequestSupportChat';

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
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="GeneralSupport" component={GeneralSupport} />
      <Stack.Screen name="NewSupportTicket" component={NewSupportTicket} />
      <Stack.Screen name="SupportTicketChat" component={SupportTicketChat} />
      <Stack.Screen name="RequestSupportChat" component={RequestSupportChat} />
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
      <Stack.Screen name="RequestSupportChat" component={RequestSupportChat} />
      <Stack.Screen name="SupportTicketChat" component={SupportTicketChat} />
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
      <Stack.Screen name="RequestSupportChat" component={RequestSupportChat} />
      <Stack.Screen name="SupportTicketChat" component={SupportTicketChat} />
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
      <Stack.Screen name="AddonSubscriptions" component={AddonSubscriptions} />
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

function CustomTabBar({ state, descriptors, navigation }) {
  const focusedRoute = state.routes[state.index];
  const { options } = descriptors[focusedRoute.key];
  const tabBarStyle = options.tabBarStyle;
  
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
    <View style={styles.floatingTabBar}>
      {isLayoutReady && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 12,
            bottom: Platform.OS === 'ios' ? 24 : 12,
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

// Bottom Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
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
        name="Services"
        component={MainServicesStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'ServicesMain';
          return {
            tabBarIconName: 'grid-view',
            tabBarLabel: 'Services',
            tabBarStyle: focusedRouteName === 'ServicesMain' ? {} : { display: 'none' },
          };
        }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'RequestsMain';
          return {
            tabBarIconName: 'assignment',
            tabBarLabel: 'Requests',
            tabBarStyle: focusedRouteName === 'RequestsMain' ? {} : { display: 'none' },
          };
        }}
      />
      {/* Plans tab hidden from the bottom bar for now.
      <Tab.Screen
        name="My Membership"
        component={MyMembershipStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'MyMembershipMain';
          return {
            tabBarIconName: 'shield',
            tabBarLabel: 'Plans',
            tabBarStyle: focusedRouteName === 'MyMembershipMain' ? {} : { display: 'none' },
          };
        }}
      /> */}
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
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />

      {/* Registration / Onboarding Wizard */}
      <Stack.Screen name="OnboardingProfile" component={OnboardingProfile} />
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
  floatingTabBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
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
