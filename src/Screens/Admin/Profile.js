import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { logoutUser } from '../../Redux/slices/userSlice';
import { typography } from '../../theme/typography';

function initialsFor(name) {
  return (name || 'Admin').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const MENU = [
  { id: 'personal', label: 'Personal Information', icon: 'person-outline', color: '#3B82F6', route: 'ProfilePersonal' },
  { id: 'address', label: 'Address', icon: 'place', color: '#8B5CF6', route: 'ProfileAddress' },
  { id: 'password', label: 'Change Password', icon: 'lock-outline', color: '#0EA5E9', route: 'ProfilePassword' },
  { id: 'notificationPreferences', label: 'Notification Preferences', icon: 'notifications-none', color: '#F59E0B', route: 'NotificationPreferences' },
];

function Profile({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);

  const name = user?.name || 'Admin';
  const email = user?.email || '';

  const handleLogout = () => {
    dispatch(logoutUser()).finally(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.decorCircleSm} pointerEvents="none" />
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.identityRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(name)}</Text>
              </View>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              {!!email && <Text style={styles.email} numberOfLines={1}>{email}</Text>}
              <View style={styles.rolePill}>
                <Icon name="admin-panel-settings" size={13} color="#059669" />
                <Text style={styles.roleText}>Admin</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuBlock}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, idx < MENU.length - 1 && styles.menuBorder]}
              activeOpacity={0.6}
              onPress={() => item.route && navigation.navigate(item.route)}
            >
              <View style={[styles.menuIconBg, { backgroundColor: item.color + '18' }]}>
                <Icon name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-right" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#A64416" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  header: {
    height: 150, paddingHorizontal: 24, paddingTop: 58, backgroundColor: '#20304C',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden',
  },
  headerTitle: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  decorCircleLg: { position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  decorCircleSm: { position: 'absolute', bottom: -30, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(253,230,138,0.08)' },

  scroll: { marginTop: -44 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18,
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontFamily: typography.h2.fontFamily },
  identityText: { flex: 1, gap: 4 },
  name: { fontSize: 19, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  email: { fontSize: 13, color: '#64748B' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  menuBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#A64416',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#A64416' },
});

export default Profile;
