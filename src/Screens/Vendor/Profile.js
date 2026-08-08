import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useVendorProfile } from '../../Hooks/useVendorProfile';
import { logoutUser } from '../../Redux/slices/userSlice';

const initialsFor = (name) => (name || 'V').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const MENU_ITEMS = [
  { key: 'personal', label: 'Personal Info', subtitle: 'View and edit your details', icon: 'person-outline', route: 'ProfilePersonal' },
  { key: 'bank', label: 'Bank & Payout Details', subtitle: 'Manage payout account', icon: 'account-balance', route: 'BankDetails' },
  { key: 'documents', label: 'Documents / KYC', subtitle: 'Manage verification documents', icon: 'folder-shared', route: 'Documents' },
  { key: 'availability', label: 'Availability', subtitle: 'Manage your job availability', icon: 'event-available', route: 'Availability' },
  { key: 'services', label: 'Services Offered', subtitle: 'View your offered services', icon: 'miscellaneous-services', route: 'ServiceOffered' },
];

const { height: H } = Dimensions.get('window');
// Clear the (translucent) status bar, plus a little breathing room above the
// "My Profile" title.
const STATUS_BAR_HEIGHT = (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47) + 22;

function Profile({ navigation }) {
  const dispatch = useDispatch();
  const { profile, loading } = useVendorProfile();
  const { showAlert, alertProps } = useAppAlert();

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser()); // POST /auth/logout + clear local session
          let root = navigation;
          while (root.getParent()) root = root.getParent();
          root.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const name = profile?.businessName || 'Vendor';
  const vendorType = titleCase(profile?.vendorType);
  const coverageCity = profile?.geoCoverage?.[0]?.city?.name || '';
  const subtitle = [vendorType, coverageCity].filter(Boolean).join(' · ');
  const ratingScore = profile?.rating?.score;
  const isActive = (profile?.status || '').toLowerCase() === 'active';
  const isAvailable = profile?.availability?.isAvailable !== false;

  return (
    <View style={styles.container}>
      {/* Assert the translucent status bar this screen expects — without it,
          returning from a subscreen (whose Header sets translucent) reverts to
          the OS default for a frame and the header visibly grows then shrinks. */}
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      {/* Top Blue Header */}
      <View style={styles.topBlueBg}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(name)}</Text>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
            {!!profile?.id && <Text style={styles.profileEmail}>Vendor ID: VEN-{profile.id}</Text>}
            {!!subtitle && <Text style={styles.profilePhone}>{subtitle}</Text>}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* My Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>My Status</Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{ratingScore != null ? Number(ratingScore).toFixed(2) : '—'}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Account</Text>
            {loading && !profile ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <View style={[styles.chip, { backgroundColor: isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.chipText, { color: isActive ? '#059669' : '#DC2626' }]}>
                  {titleCase(profile?.status) || 'Unknown'}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusRow, { marginBottom: 0 }]}>
            <Text style={styles.statusRowLabel}>Availability</Text>
            <View style={[styles.chip, { backgroundColor: isAvailable ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.chipText, { color: isAvailable ? '#059669' : '#D97706' }]}>
                {isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name={item.icon} size={20} color="#1E3A8A" />
                </View>
                <View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  topBlueBg: {
    backgroundColor: '#20304C',
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#93C5FD', marginBottom: 2 },
  profilePhone: { fontSize: 13, color: '#93C5FD' },

  scrollContent: {
    backgroundColor: '#FDFBF7',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: H * 0.7,
  },

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusRowLabel: { fontSize: 14, color: '#64748B' },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 12, fontWeight: '600' },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  menuSubtitle: { fontSize: 13, color: '#64748B' },

  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F97316',
    backgroundColor: '#FFFFFF',
  },
  logoutBtnText: { fontSize: 16, fontWeight: '700', color: '#F97316' },
});

export default Profile;
