import React, { useState } from 'react';
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

const HEADER_STATS = [
  { id: 'customers', key: 'myCustomers', label: 'Customers', icon: 'groups', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'open', key: 'openRequests', label: 'Open', icon: 'hourglass-empty', color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'overdue', key: 'overdue', label: 'Overdue SLA', icon: 'error-outline', color: '#EF4444', bg: '#FEE2E2' },
];

function requestStatusColors(status) {
  switch (String(status || '').toLowerCase()) {
    case 'in progress': case 'in_progress': return { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5' };
    case 'assigned': return { bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE' };
    case 'new': return { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7' };
    case 'resolved': case 'completed': return { bg: '#ECFDF5', text: '#059669', border: '#D1FAE5' };
    default: return { bg: '#F8FAFC', text: '#475569', border: '#F1F5F9' };
  }
}

function titleCaseStatus(status) {
  return String(status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function slaLabel(deadline, overdue) {
  if (!deadline) return overdue ? 'Overdue' : null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  const days = Math.round(Math.abs(diffMs) / 86400000);
  const isOverdue = overdue || diffMs < 0;
  if (isOverdue) return days <= 0 ? 'Overdue' : `Overdue ${days}d`;
  return days <= 0 ? 'Due today' : `Due in ${days}d`;
}

function Dashboard({ navigation }) {
  const { stats, pendingRequests, upcomingBirthdays = [] } = useRmDashboard();
  const [showAllBirthdays, setShowAllBirthdays] = useState(false);

  const visibleBirthdays = showAllBirthdays ? upcomingBirthdays : upcomingBirthdays.slice(0, 3);

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
        <View style={styles.decorCircleLg} pointerEvents="none" />
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
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Quick Stats */}
          <View style={styles.statsStrip}>
            {HEADER_STATS.map((stat) => (
              <TouchableOpacity key={stat.id} style={styles.statCard} activeOpacity={0.7} onPress={() => goTo(stat.id === 'customers' ? 'customers' : 'tickets')}>
                <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                  <Icon name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={styles.statValue} numberOfLines={1}>{String(stats?.[stat.key] ?? 0)}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pending Requests */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <TouchableOpacity onPress={() => goTo('tickets')}>
                <Text style={styles.viewAll}>View all →</Text>
              </TouchableOpacity>
            </View>

            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}><Icon name="check-circle-outline" size={24} color="#10B981" /></View>
                <Text style={styles.emptyText}>No pending requests right now.</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {pendingRequests.slice(0, 3).map((req) => {
                  const sc = requestStatusColors(req.status);
                  return (
                    <TouchableOpacity key={req.id} style={styles.ticketCard} onPress={() => navigation.navigate('TicketDetail', { ticketId: req.id })} activeOpacity={0.7}>
                      <View style={styles.ticketIconBgWrapper}>
                        <View style={[styles.ticketIconBg, { backgroundColor: '#FEF3E7' }]}>
                          <Icon name="schedule" size={22} color="#C2410C" />
                        </View>
                      </View>
                      <View style={styles.ticketDetails}>
                        <Text style={styles.ticketService} numberOfLines={1}>{req.service}</Text>
                        <Text style={styles.ticketCustomer} numberOfLines={1}>{req.ticket} • {req.customer}</Text>
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

          {/* Explore */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Explore</Text>
            </View>
            <View style={styles.exploreGrid}>
              {EXPLORE_ACTIONS.map((action) => (
                <TouchableOpacity key={action.id} style={styles.exploreCard} onPress={() => goTo(action.id)} activeOpacity={0.7}>
                  <View style={[styles.exploreIconBg, { backgroundColor: action.color + '15' }]}>
                    <Icon name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={styles.exploreLabel} numberOfLines={1}>{action.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Upcoming Birthdays */}
          <View style={[styles.section, { marginBottom: 0 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Birthdays (30 days)</Text>
            </View>
            {upcomingBirthdays.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconBg, { backgroundColor: '#F1F5F9' }]}><Icon name="cake" size={24} color="#94A3B8" /></View>
                <Text style={styles.emptyText}>No birthdays in the next 30 days.</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {visibleBirthdays.map((b) => (
                  <View key={b.id} style={styles.ticketCard}>
                    <View style={styles.ticketIconBgWrapper}>
                      <View style={[styles.ticketIconBg, { backgroundColor: '#FCE7F3' }]}>
                        <Icon name="cake" size={22} color="#DB2777" />
                      </View>
                    </View>
                    <View style={styles.ticketDetails}>
                      <Text style={styles.ticketService} numberOfLines={1}>{b.name}</Text>
                      {(!!b.relation || !!b.date) && (
                        <Text style={styles.ticketCustomer} numberOfLines={1}>
                          {[b.relation, b.date].filter(Boolean).join(' • ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                {upcomingBirthdays.length > 3 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllBirthdays(!showAllBirthdays)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllBirthdays ? 'Show Less' : `Show ${upcomingBirthdays.length - 3} More`}
                    </Text>
                  </TouchableOpacity>
                )}
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
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },

  statsStrip: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statTextWrap: { alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginTop: 0 },
  statLabel: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', marginTop: 2, textAlign: 'center' },

  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#1A1A1A' },
  viewAll: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#D94625', paddingBottom: 2 },

  cardList: { gap: 16 },
  
  ticketCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    flexDirection: 'row', alignItems: 'center',
  },
  ticketIconBgWrapper: { marginRight: 16 },
  ticketIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  ticketDetails: { flex: 1, paddingRight: 8, justifyContent: 'center' },
  ticketService: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginBottom: 4 },
  ticketCustomer: { ...typography.small, color: '#64748B' },
  ticketMetaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily },

  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  exploreCard: {
    width: '31%', backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    alignItems: 'center', gap: 10,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  exploreIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  exploreLabel: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#334155', textAlign: 'center' },

  emptyState: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#F1F5F9',
    alignItems: 'center', gap: 12,
  },
  emptyIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: typography.body.fontFamily, color: '#64748B' },
  showMoreBtn: { alignItems: 'center', paddingVertical: 12, marginTop: -4 },
  showMoreText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#3B82F6' },
});

export default Dashboard;
