import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useStateAdminDashboard } from '../../Hooks/StateAdmin/useStateAdminDashboard';
import { useNotifications } from '../../Hooks/useNotifications';
import { getUserAssignableRoles } from '../../Api/StateAdmin/stateAdminUsersApi';

// Not every card applies to every role — confirmed live, state-admin's
// GET /admin/dashboard (scope: "state") and district/taluka-admin's
// (scope: "coverage") return entirely different `stats` shapes:
//   state:    { revenue, vendors, tickets, open, customers, escalated, pending_vendors }
//   coverage: { vendors, open_tickets, total_tickets, overdue, unassigned, available_vendors }
// Dashboard only renders a card once real data has loaded AND that stat key
// is actually present in the response (see stats?.[stat.id] check below) —
// a card is never shown for a field the API didn't send.
const STAT_ITEMS = [
  // State-scope only.
  { id: 'totalRevenue', label: 'Total Revenue', icon: 'payments', color: '#16A34A', bg: '#F0FDF4', format: 'currency' },
  { id: 'customerCount', label: 'Customers', icon: 'people', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'pendingVendors', label: 'Pending Vendors', icon: 'hourglass-top', color: '#F59E0B', bg: '#FFFBEB' },
  // Coverage-scope (district/taluka-admin) only.
  { id: 'overdueTickets', label: 'Overdue', icon: 'error-outline', color: '#DC2626', bg: '#FEF2F2' },
  { id: 'unassignedTickets', label: 'Pending Assignment', icon: 'assignment-late', color: '#D97706', bg: '#FFFBEB' },
  { id: 'availableVendors', label: 'Available Vendors', icon: 'how-to-reg', color: '#0891B2', bg: '#ECFEFF' },
  // Shared — present in both scopes, under different keys.
  { id: 'vendorCount', label: 'Vendors', icon: 'engineering', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'totalTickets', label: 'Total Tickets', icon: 'confirmation-number', color: '#EA580C', bg: '#FFF7ED' },
];

function formatStat(value, format) {
  if (value == null) return '—';
  if (format === 'currency') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (format === 'percent') return `${value}%`;
  return String(value);
}

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolv') || s.includes('complet')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('progress') || s.includes('active') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s.includes('pend') || s.includes('hold')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  if (s.includes('cancel') || s.includes('breach') || s.includes('reject')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function getPriorityStyle(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent' || p === 'high') return { bg: '#FEE2E2', text: '#EF4444' };
  if (p === 'medium') return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#F1F5F9', text: '#64748B' };
}

function Dashboard({ navigation }) {
  const {
    scope,
    stats,
    recentTickets,
    loading,
    refresh,
  } = useStateAdminDashboard();

  const { unreadCount, fetch: fetchNotifications } = useNotifications();
  const user = useSelector(state => state.user.user);
  const adminName = user?.name || 'State Admin';
  const stateName = user?.homeState || user?.state || 'State';

  const [refreshing, setRefreshing] = useState(false);

  // Waving-hand animation
  const waveAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: -1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(1000),
      ])
    ).start();
  }, [waveAnim]);
  const waveInterpolate = waveAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  // Team-by-role tabs — the roles this admin may manage. Tapping one opens
  // the Users screen pre-filtered to that role, which fetches its own data.
  const [roleTabs, setRoleTabs] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getUserAssignableRoles()
      .then(roles => setRoleTabs((roles || []).filter(r => String(r.name).toLowerCase() !== 'field-executive')))
      .catch(() => {});
  }, []);

  const openRoleTeam = (role) => {
    navigation.navigate('Users', { role: role.name, roleLabel: role.label });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchNotifications()]);
    setRefreshing(false);
  };

  const scopeLabel = useMemo(() => {
    if (scope === 'state') return `State Scope (${stateName})`;
    if (scope === 'coverage') return 'Coverage Scope (Assigned Districts)';
    return 'Admin Scope';
  }, [scope, stateName]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.blueHeader}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.decorDot} pointerEvents="none" />
        <View style={styles.headerTop}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Hello,</Text>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{adminName}</Text>
              <Animated.Text style={[styles.wave, { transform: [{ rotate: waveInterpolate }] }]}>👋</Animated.Text>
            </View>
            <View style={styles.headerTagRow}>
              <View style={styles.headerTagPill}>
                <Icon name="location-city" size={13} color="#FDE68A" />
                <Text style={styles.headerTagText} numberOfLines={1}>{scopeLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.analysisBtn}
                onPress={() => navigation.navigate('Analysis')}
                activeOpacity={0.8}
              >
                <Icon name="insights" size={13} color="#FFFFFF" />
                <Text style={styles.analysisBtnText}>Analysis</Text>
                <Icon name="chevron-right" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Icon name="notifications-none" size={26} color="#FFFFFF" />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : (
              <View style={styles.badgeDot} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Cream Body */}
      <View style={styles.creamBody}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
        >
          {/* Quick Metrics Grid — while loading, show every card as a
              placeholder for layout stability; once `stats` has arrived,
              only render cards for fields that role's response actually sent. */}
          <View style={styles.statsGrid}>
            {(loading && !stats ? STAT_ITEMS : STAT_ITEMS.filter(stat => stats?.[stat.id] !== undefined)).map(stat => {
              const handleStatPress = () => {
                if (stat.id === 'pendingVendors') {
                  navigation.navigate('PendingVendors');
                } else if (['vendorCount', 'availableVendors'].includes(stat.id)) {
                  navigation.navigate('Vendors');
                } else if (['totalTickets', 'overdueTickets', 'unassignedTickets', 'activeTickets', 'escalatedTickets'].includes(stat.id)) {
                  navigation.navigate('Tickets');
                } else if (stat.id === 'customerCount') {
                  navigation.navigate('Customers');
                } else if (stat.id === 'totalRevenue') {
                  navigation.navigate('Revenue');
                }
              };
              return (
                <TouchableOpacity
                  key={stat.id}
                  style={styles.statCard}
                  activeOpacity={0.7}
                  onPress={handleStatPress}
                >
                  <View style={[styles.statIconBg, { backgroundColor: stat.bg }]}>
                    <Icon name={stat.icon} size={16} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>
                    {loading && !stats ? '—' : formatStat(stats?.[stat.id], stat.format)}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Team by Role */}
          {roleTabs.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="badge" size={18} color="#7C3AED" />
                  <Text style={styles.sectionTitle}>Admin Management</Text>
                </View>
                <TouchableOpacity
                  style={[styles.viewAllChip, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED30' }]}
                  onPress={() => navigation.navigate('AdminRoles')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.viewAllChipText, { color: '#7C3AED' }]}>All</Text>
                  <Icon name="chevron-right" size={14} color="#7C3AED" />
                </TouchableOpacity>
              </View>

              <View style={styles.roleTabsRow}>
                {roleTabs.map(r => (
                  <TouchableOpacity
                    key={r.name}
                    style={styles.roleTabChip}
                    onPress={() => openRoleTeam(r)}
                    activeOpacity={0.7}
                  >
                    <Icon name="chevron-right" size={14} color="#7C3AED" style={{ marginRight: 2 }} />
                    <Text style={styles.roleTabText} numberOfLines={1}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Recent Tickets Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Icon name="confirmation-number" size={18} color="#EA580C" />
                <Text style={styles.sectionTitle}>Recent Tickets</Text>
              </View>
              {recentTickets.length > 0 && (
                <TouchableOpacity
                  style={[styles.viewAllChip, { backgroundColor: '#EA580C15', borderColor: '#EA580C30' }]}
                  onPress={() => navigation.navigate('Tickets')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.viewAllChipText, { color: '#EA580C' }]}>View all</Text>
                  <Icon name="chevron-right" size={14} color="#EA580C" />
                </TouchableOpacity>
              )}
            </View>

            {loading && !recentTickets.length ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator size="small" color="#A64416" />
                <Text style={styles.emptyText}>Loading recent tickets...</Text>
              </View>
            ) : recentTickets.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Icon name="inbox" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>No recent tickets in your jurisdiction</Text>
              </View>
            ) : (
              <View style={styles.ticketsList}>
                {recentTickets.slice(0, 3).map((t, idx) => {
                  const statusStyle = getStatusStyle(t.status);
                  const priorityStyle = getPriorityStyle(t.priority);
                  return (
                    <View
                      key={t.id || t.ticketNumber || idx}
                      style={[styles.ticketCard, idx < Math.min(recentTickets.length, 3) - 1 && styles.ticketCardBorder]}
                    >
                      <View style={styles.ticketCardTop}>
                        <View style={styles.ticketIdWrap}>
                          <Text style={styles.ticketNumber}>{t.ticketNumber}</Text>
                          {!!t.priority && (
                            <View style={[styles.priorityPill, { backgroundColor: priorityStyle.bg }]}>
                              <Text style={[styles.priorityText, { color: priorityStyle.text }]}>{t.priority.toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                          <Text style={[styles.statusText, { color: statusStyle.text }]}>{t.status.toUpperCase()}</Text>
                        </View>
                      </View>

                      <Text style={styles.ticketTitle} numberOfLines={1}>{t.serviceName || t.title}</Text>

                      <View style={styles.ticketMetaRow}>
                        <View style={styles.ticketMetaItem}>
                          <Icon name="person" size={13} color="#94A3B8" />
                          <Text style={styles.ticketMetaVal} numberOfLines={1}>{t.customerName}</Text>
                        </View>
                        {t.districtName && (
                          <View style={styles.ticketMetaItem}>
                            <Icon name="place" size={13} color="#94A3B8" />
                            <Text style={styles.ticketMetaVal} numberOfLines={1}>{t.districtName}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT - 12,
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
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 26, fontFamily: typography.h2.fontFamily, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  wave: { fontSize: 24, marginLeft: 6 },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  headerTagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  headerTagText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  analysisBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#A64416', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  analysisBtnText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },

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
  badgeDot: {
    position: 'absolute', top: 10, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#20304C',
  },

  creamBody: {
    flex: 1, backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 110 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '31%', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10,
    alignItems: 'flex-start', gap: 1,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  statIconBg: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A', fontWeight: '700' },
  statLabel: { fontSize: 10.5, color: '#64748B', marginTop: 1 },

  sectionContainer: { marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A', fontWeight: '700' },
  viewAllChip: {
    flexDirection: 'row', alignItems: 'center', gap: 1,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1,
  },
  viewAllChipText: { fontSize: 12, fontWeight: '700' },

  roleTabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleTabChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  roleTabText: { fontSize: 13, color: '#334155', fontWeight: '600' },

  ticketsList: {
    backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  ticketCard: { paddingVertical: 14 },
  ticketCardBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  ticketCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketIdWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketNumber: { fontSize: 12, fontWeight: '700', color: '#20304C' },
  priorityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 9, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  ticketTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ticketMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ticketMetaVal: { fontSize: 12, color: '#64748B' },

  emptyWrap: {
    backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 36, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  emptyText: { fontSize: 13, color: '#94A3B8' },
});

export default Dashboard;
