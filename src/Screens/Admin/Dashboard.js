import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useAdminDashboard } from '../../Hooks/Admin/useAdminDashboard';
import { useNotifications } from '../../Hooks/useNotifications';
import { heatColor } from './StateOperations';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// Top 5 states shown here; the full sorted list lives on the States tab.
const TOP_STATES_LIMIT = 5;

const HEADER_STATS = [
  { id: 'totalRegistrations', label: 'Registrations', icon: 'how-to-reg', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'completedMembers', label: 'Completed Members', icon: 'verified', color: '#059669', bg: '#ECFDF5' },
  { id: 'pendingMembers', label: 'Pending Payment', icon: 'hourglass-top', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'noMembershipMembers', label: 'No Membership', icon: 'person-off', color: '#64748B', bg: '#F8FAFC' },
  { id: 'totalRevenue', label: 'Revenue', icon: 'payments', color: '#16A34A', bg: '#F0FDF4', format: 'currency' },
  { id: 'activeTickets', label: 'Active Tickets', icon: 'confirmation-number', color: '#EA580C', bg: '#FFF7ED' },
  { id: 'vendorCount', label: 'Vendors', icon: 'engineering', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'slaCompliance', label: 'SLA Compliance', icon: 'shield', color: '#0EA5E9', bg: '#F0F9FF', format: 'percent' },
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

  // Top 5 states by revenue — same sort/heat logic as the full States tab.
  const topStates = useMemo(
    () => [...(stateBreakdown || [])].sort((a, b) => b.revenue - a.revenue).slice(0, TOP_STATES_LIMIT),
    [stateBreakdown]
  );
  const maxStateRevenue = topStates.length ? Math.max(...topStates.map(s => s.revenue), 1) : 1;

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
          {HEADER_STATS.map(stat => (
            <View key={stat.id} style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: stat.bg }]}>
                <Icon name={stat.icon} size={16} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{loading ? '—' : formatStat(stats?.[stat.id], stat.format)}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>State Operations & Revenue</Text>
          <TouchableOpacity onPress={() => navigation.navigate('StateOperations')}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {!loading && topStates.length === 0 ? (
          <View style={styles.stateEmpty}>
            <Icon name="map" size={28} color="#CBD5E1" />
            <Text style={styles.stateEmptyText}>No state data yet.</Text>
          </View>
        ) : (
          <View style={styles.stateList}>
            {topStates.map((s, idx) => {
              const ratio = maxStateRevenue > 0 ? s.revenue / maxStateRevenue : 0;
              const color = heatColor(ratio);
              return (
                <View key={s.name} style={[styles.stateRow, idx < topStates.length - 1 && styles.stateRowBorder]}>
                  <View style={styles.stateRowTop}>
                    <Text style={styles.stateName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.stateRevenue}>{formatInr(s.revenue)}</Text>
                  </View>
                  <View style={styles.heatTrack}>
                    <View style={[styles.heatFill, { width: `${Math.max(ratio * 100, s.revenue > 0 ? 4 : 0)}%`, backgroundColor: color }]} />
                  </View>
                  <View style={styles.stateMetaRow}>
                    <Text style={styles.stateMetaText}>{s.ticketsCount} tickets</Text>
                    <Text style={styles.stateMetaText}>{s.customersCount} customers</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

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

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '31%', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'flex-start', gap: 1,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statIconBg: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  statLabel: { fontSize: 10.5, color: '#64748B' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  viewAll: { fontSize: 13, fontWeight: '700', color: '#A64416' },

  stateEmpty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  stateEmptyText: { fontSize: 13, color: '#94A3B8' },

  stateList: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1,
  },
  stateRow: { paddingVertical: 14 },
  stateRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  stateRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stateName: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginRight: 10 },
  stateRevenue: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#16A34A' },
  heatTrack: { height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', marginTop: 8, overflow: 'hidden' },
  heatFill: { height: '100%', borderRadius: 3 },
  stateMetaRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  stateMetaText: { fontSize: 11, color: '#94A3B8' },

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
