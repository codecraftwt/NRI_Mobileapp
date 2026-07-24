import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const MENU = [
  { id: 'personal', label: 'Personal Information', icon: 'person-outline', color: '#3B82F6' },
  { id: 'customers', label: 'My Customers', icon: 'groups', color: '#8B5CF6', route: 'MyCustomers' },
  { id: 'escalations', label: 'Escalations', icon: 'priority-high', color: '#EF4444', route: 'Escalations' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-none', color: '#F97316' },
  { id: 'settings', label: 'Settings', icon: 'settings', color: '#64748B' },
  { id: 'help', label: 'Help & Support', icon: 'help-outline', color: '#10B981', route: 'GeneralSupport' },
];

function Profile({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>RE</Text>
          </View>
          <Text style={styles.name}>Relationship Manager</Text>
          <Text style={styles.email}>rm@nricircle.com</Text>
          <View style={styles.rolePill}>
            <Icon name="verified-user" size={14} color="#059669" />
            <Text style={styles.roleText}>Relationship Manager</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuBlock}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, idx < MENU.length - 1 && styles.menuBorder]}
              activeOpacity={0.6}
              onPress={() => item.route && navigation.navigate(item.route)}
            >
              <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
                <Icon name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-right" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}>
          <Icon name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 20 },
  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontFamily: typography.h2.fontFamily },
  name: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 18, marginTop: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#F1F5F9' },

  menuBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 20, marginTop: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16, marginTop: 20,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
});

export default Profile;
