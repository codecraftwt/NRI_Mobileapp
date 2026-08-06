import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useRmDashboard } from '../../Hooks/RM/useRmDashboard';

const EXPLORE_ACTIONS = [
  { id: 'support', name: 'Support', icon: 'support-agent', color: '#10B981' },
  { id: 'renewals', name: 'Renewals', icon: 'autorenew', color: '#0EA5E9' },
  { id: 'upsell', name: 'Upsell', icon: 'trending-up', color: '#16A34A' },
  { id: 'escalations', name: 'Escalations', icon: 'priority-high', color: '#EF4444' },
  { id: 'reports', name: 'Reports', icon: 'fact-check', color: '#6366F1' },
  { id: 'planner', name: 'Planner', icon: 'event', color: '#8B5CF6' },
];

// `key` maps each card to its count in the /rm/dashboard `stats` payload.
const HEADER_STATS = [
  { id: 'customers', key: 'myCustomers', label: 'Customers', icon: 'groups', color: '#3B82F6' },
  { id: 'open', key: 'openRequests', label: 'Open', icon: 'hourglass-empty', color: '#F59E0B' },
  { id: 'overdue', key: 'overdue', label: 'Overdue SLA', icon: 'error-outline', color: '#EF4444' },
];

// Pill colours per request status (matches the RM Tickets list).
function requestStatusColors(status) {
  switch (String(status || '').toLowerCase()) {
    case 'in progress': case 'in_progress': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'assigned': return { bg: '#DBEAFE', text: '#2563EB' };
    case 'new': return { bg: '#DCFCE7', text: '#16A34A' };
    case 'resolved': case 'completed': return { bg: '#D1FAE5', text: '#059669' };
    default: return { bg: '#F1F5F9', text: '#64748B' };
  }
}

// "New" → "New", "in_progress" → "In Progress".
function titleCaseStatus(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Turns an SLA deadline + overdue flag into a human label ("Overdue 6d",
// "Due today", "Due in 3d").
function slaLabel(deadline, overdue) {
  if (!deadline) return overdue ? 'Overdue' : null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  const days = Math.round(Math.abs(diffMs) / 86400000);
  const isOverdue = overdue || diffMs < 0;
  if (isOverdue) return days <= 0 ? 'Overdue' : `Overdue ${days}d`;
  return days <= 0 ? 'Due today' : `Due in ${days}d`;
}

function Dashboard({ navigation }) {
  const { stats, pendingRequests, upcomingBirthdays } = useRmDashboard();

  const goTo = (id) => {
    switch (id) {
      case 'customers': navigation.navigate('Customers'); break;
      case 'tickets': navigation.navigate('TicketsTab'); break;
      case 'support': navigation.navigate('GeneralSupport'); break;
      case 'planner': navigation.navigate('Planner'); break;
      case 'renewals': navigation.navigate('Renewals'); break;
      case 'upsell': navigation.navigate('Upsell'); break;
      case 'escalations': navigation.navigate('Escalations'); break;
      case 'reports': navigation.navigate('Reports'); break;
      default: break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Dark Header (Fixed) */}
      <View style={styles.blueHeader}>
        {/* Decorative accent circles — layered behind the header content to
            give the flat blue a bit of depth. */}
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.decorCircleSm} pointerEvents="none" />
        <View style={styles.decorDot} pointerEvents="none" />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>Relationship Manager 👋</Text>
            <View style={styles.headerTagPill}>
              <Icon name="insights" size={13} color="#FDE68A" />
              <Text style={styles.headerTagText}>Manage your customers with care</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Icon name="notifications-none" size={26} color="#FFFFFF" />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cream Body */}
      <View style={styles.creamBody}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Stat Strip */}
          <View style={styles.headerStatStrip}>
            {HEADER_STATS.map((stat, index) => (
              <View
                key={stat.id}
                style={[styles.headerStatCard, index < HEADER_STATS.length - 1 && { marginRight: 12 }]}
              >
                <View style={[styles.headerStatIconWrap, { backgroundColor: stat.color + '15' }]}>
                  <Icon name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={[styles.headerStatValue, { color: stat.color }]}>{String(stats?.[stat.key] ?? 0)}</Text>
                <Text style={styles.headerStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Pending Requests — SLA Countdown */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TicketsTab')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>

            {pendingRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icon name="check-circle-outline" size={28} color="#94A3B8" />
                <Text style={styles.emptyText}>No pending requests right now.</Text>
              </View>
            ) : (
              <View style={styles.cardBlock}>
                {pendingRequests.slice(0, 3).map((req) => {
                  const sc = requestStatusColors(req.status);
                  const sla = slaLabel(req.slaDeadline, req.overdue);
                  const isOverdue = req.overdue || (req.slaDeadline && new Date(req.slaDeadline).getTime() < Date.now());
                  return (
                    <TouchableOpacity
                      key={req.id}
                      style={styles.ticketItem}
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: req.id })}
                      activeOpacity={0.6}
                    >
                      <View style={styles.ticketIconBgWrapper}>
                        <View style={[styles.ticketIconBg, { backgroundColor: '#FEF3E7' }]}>
                          <Icon name="schedule" size={22} color="#C2410C" />
                        </View>
                      </View>
                      <View style={styles.ticketDetails}>
                        <Text style={styles.ticketName} numberOfLines={1}>{req.service}</Text>
                        <Text style={styles.ticketSub} numberOfLines={1}>{req.ticket} · {req.customer}</Text>
                        <View style={styles.ticketMetaRow}>
                          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.statusPillText, { color: sc.text }]}>{titleCaseStatus(req.status)}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Upcoming Birthdays */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Upcoming Birthdays (30 days)</Text>
            {upcomingBirthdays.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icon name="cake" size={28} color="#94A3B8" />
                <Text style={styles.emptyText}>No birthdays in the next 30 days.</Text>
              </View>
            ) : (
              <View style={styles.cardBlock}>
                {upcomingBirthdays.map((b) => (
                  <View key={b.id} style={styles.ticketItem}>
                    <View style={styles.ticketIconBgWrapper}>
                      <View style={[styles.ticketIconBg, { backgroundColor: '#FCE7F3' }]}>
                        <Icon name="cake" size={22} color="#DB2777" />
                      </View>
                    </View>
                    <View style={styles.ticketDetails}>
                      <Text style={styles.ticketName} numberOfLines={1}>{b.name}</Text>
                      {(!!b.relation || !!b.date) && (
                        <Text style={styles.ticketSub} numberOfLines={1}>
                          {[b.relation, b.date].filter(Boolean).join(' · ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Explore Grid */}
          <View style={[styles.sectionContainer, { marginBottom: 0 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Explore</Text>
            </View>
            <View style={styles.actionGrid}>
              {EXPLORE_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionSquare}
                  onPress={() => goTo(action.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBg, { backgroundColor: action.color + '10' }]}>
                    <Icon name={action.icon} size={28} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel} numberOfLines={2}>{action.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  // Soft accent rings + dot that bleed off the top-right edge of the header.
  decorCircleLg: {
    position: 'absolute', top: -70, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decorCircleSm: {
    position: 'absolute', top: -20, right: 40,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(217,70,37,0.15)',
  },
  decorDot: {
    position: 'absolute', top: STATUS_BAR_HEIGHT + 14, right: 70,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
  greeting: { fontSize: 14, fontFamily: typography.body.fontFamily, color: '#94A3B8', marginBottom: 2 },
  userName: { fontSize: 26, fontFamily: typography.h2.fontFamily, fontWeight: '800', color: '#d38e7e', letterSpacing: -0.3 },
  headerTagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
  },
  headerTagText: { fontSize: 11, fontFamily: typography.small.fontFamily, color: '#E2E8F0' },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute', top: 10, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#20304C',
  },

  creamBody: {
    flex: 1, backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
  },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },

  sectionContainer: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#1A1A1A' },
  viewAllText: { ...typography.labelMedium, color: '#D94625' },

  headerStatStrip: { flexDirection: 'row', marginBottom: 32 },
  headerStatCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  headerStatIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  headerStatValue: { fontSize: 24, fontFamily: typography.h2.fontFamily, marginTop: 0 },
  headerStatLabel: { fontSize: 11, fontFamily: typography.small.fontFamily, color: '#64748B', marginTop: 2 },

  cardBlock: { gap: 16 },
  ticketItem: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    flexDirection: 'row', alignItems: 'center',
  },
  ticketIconBgWrapper: { marginRight: 16 },
  ticketIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  ticketDetails: { flex: 1, paddingRight: 8, justifyContent: 'center' },
  ticketName: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginBottom: 4 },
  ticketSub: { ...typography.small, color: '#64748B' },
  ticketMetaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 32, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  emptyText: { ...typography.body, color: '#94A3B8' },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  actionSquare: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#334155',
    textAlign: 'center',
  },
});

export default Dashboard;
