import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useAdminDashboard } from '../../Hooks/Admin/useAdminDashboard';
import { useNotifications } from '../../Hooks/useNotifications';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const HEADER_STATS = [
  { id: 'totalRegistrations', label: 'Registrations', icon: 'how-to-reg', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'activeTickets', label: 'Active Tickets', icon: 'confirmation-number', color: '#EA580C', bg: '#FFF7ED' },
  { id: 'totalRevenue', label: 'Money Received', icon: 'payments', color: '#16A34A', bg: '#F0FDF4', format: 'currency' },
];

function formatStat(value, format) {
  if (value == null) return '—';
  if (format === 'currency') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (format === 'percent') return `${value}%`;
  return value;
}

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ROLE_ICONS = {
  'super-admin': 'admin-panel-settings',
  'admin': 'admin-panel-settings',
  'relationship-manager': 'support-agent',
  'rm': 'support-agent',
  'vendor': 'engineering',
  'vendor-manager': 'engineering',
  'customer': 'person-outline',
};
function roleIcon(name) {
  return ROLE_ICONS[String(name || '').toLowerCase()] || 'badge';
}
const ROLE_COLORS = ['#3B82F6', '#8B5CF6', '#059669', '#EA580C', '#0EA5E9', '#DC2626'];

function Dashboard({ navigation }) {
  const { stats, stateBreakdown, rolesSummary, loading } = useAdminDashboard();
  const { unreadCount, fetch: fetchNotifications } = useNotifications();
  const user = useSelector(state => state.user.user);
  const adminName = user?.name || 'Admin';

  // Load the unread count for the header bell badge.
  useEffect(() => { fetchNotifications(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalStateRevenue = (stateBreakdown || []).reduce((sum, s) => sum + (Number(s.revenue) || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Top Dark Header (Fixed) — matches the RM/Vendor dashboard header */}
      <View style={styles.blueHeader}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.decorDot} pointerEvents="none" />
        <View style={styles.headerTop}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName} numberOfLines={1}>{adminName} 👋</Text>
            <View style={styles.headerTagPill}>
              <Icon name="admin-panel-settings" size={13} color="#FDE68A" />
              <Text style={styles.headerTagText} numberOfLines={1}>Control Centre Overview</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <Icon name="notifications-none" size={24} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Cream Body */}
      <View style={styles.creamBody}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            {HEADER_STATS.map(stat => {
              const handleStatPress = () => {
                if (stat.id === 'totalRegistrations') navigation.navigate('Customers');
                else if (stat.id === 'totalRevenue' || stat.id === 'activeTickets') navigation.navigate('StateOperations');
              };
              return (
                <TouchableOpacity
                  key={stat.id}
                  style={styles.statCard}
                  onPress={handleStatPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconBg, { backgroundColor: stat.bg }]}>
                    <Icon name={stat.icon} size={16} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{loading ? '—' : formatStat(stats?.[stat.id], stat.format)}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>State Operations & Revenue</Text>
            <TouchableOpacity onPress={() => navigation.navigate('StateOperations')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.stateOperationsCard}
            onPress={() => navigation.navigate('StateOperations')}
            activeOpacity={0.8}
          >
            <View style={styles.stateOperationsLeft}>
              <View style={styles.stateOperationsIconBg}>
                <Icon name="map" size={22} color="#A64416" />
              </View>
              <View style={styles.stateOperationsTextWrap}>
                <Text style={styles.stateOperationsCardTitle}>State Performance & Revenue</Text>
                <Text style={styles.stateOperationsCardSub}>
                  {loading
                    ? 'Loading state breakdown...'
                    : stateBreakdown?.length
                    ? `${stateBreakdown.length} active states · ${formatInr(totalStateRevenue)} total revenue`
                    : 'View revenue and activity across states'}
                </Text>
              </View>
            </View>
            <View style={styles.stateOperationsArrow}>
              <Icon name="chevron-right" size={20} color="#A64416" />
            </View>
          </TouchableOpacity>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Internal Roles Summary</Text>
          </View>

          {!loading && (rolesSummary || []).length === 0 ? (
            <View style={styles.stateEmpty}>
              <Icon name="badge" size={28} color="#CBD5E1" />
              <Text style={styles.stateEmptyText}>No role data yet.</Text>
            </View>
          ) : (
            <View style={styles.rolesList}>
              {(rolesSummary || []).map((role, idx) => {
                const color = ROLE_COLORS[idx % ROLE_COLORS.length];
                return (
                  <View key={role.name || idx} style={[styles.roleRow, idx < rolesSummary.length - 1 && styles.roleRowBorder]}>
                    <View style={[styles.roleIconBg, { backgroundColor: color + '18' }]}>
                      <Icon name={roleIcon(role.name)} size={20} color={color} />
                    </View>
                    <Text style={styles.roleLabel} numberOfLines={1}>{titleCase(role.label)}</Text>
                    <Text style={styles.roleCount}>{role.usersCount}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#20304C',
    overflow: 'hidden',
    zIndex: 10,
  },
  decorCircleLg: {
    position: 'absolute', top: -70, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decorDot: {
    position: 'absolute', top: STATUS_BAR_HEIGHT + 14, right: 70,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
  headerTextWrap: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 14, fontFamily: typography.body.fontFamily, color: '#E2E8F0', marginBottom: 2 },
  userName: { fontSize: 26, fontFamily: typography.h2.fontFamily, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerTagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 10,
  },
  headerTagText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },

  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  bellBadge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#20304C',
  },
  bellBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },

  creamBody: {
    flex: 1, backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },

  statsGrid: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'flex-start', gap: 2,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 15.5, fontFamily: typography.h2.fontFamily, color: '#0F172A', includeFontPadding: false },
  statLabel: { fontSize: 10.5, color: '#64748B', marginTop: 2 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#A64416' },

  stateOperationsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  stateOperationsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 10,
  },
  stateOperationsIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateOperationsTextWrap: {
    flex: 1,
  },
  stateOperationsCardTitle: {
    fontSize: 14.5,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    marginBottom: 3,
  },
  stateOperationsCardSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  stateOperationsArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stateEmpty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  stateEmptyText: { fontSize: 13, color: '#94A3B8' },

  rolesList: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1,
  },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  roleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  roleIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  roleLabel: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  roleCount: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
});

export default Dashboard;

