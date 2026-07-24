import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';

const EXPLORE_ACTIONS = [
  { id: 'support', name: 'Support', icon: 'support-agent', color: '#10B981' },
  { id: 'renewals', name: 'Renewals', icon: 'autorenew', color: '#0EA5E9' },
  { id: 'upsell', name: 'Upsell', icon: 'trending-up', color: '#16A34A' },
  { id: 'escalations', name: 'Escalations', icon: 'priority-high', color: '#EF4444' },
  { id: 'reports', name: 'Reports', icon: 'fact-check', color: '#6366F1' },
];

const STAT_CARDS = [
  { id: 'customers', label: 'My Customers', value: '12', icon: 'groups', bg: '#EFF6FF', color: '#3B82F6' },
  { id: 'open', label: 'Open Requests', value: '2', icon: 'hourglass-empty', bg: '#FFEDD5', color: '#C2410C' },
  { id: 'overdue', label: 'Overdue SLA', value: '2', icon: 'error-outline', bg: '#FEE2E2', color: '#DC2626' },
  { id: 'reports', label: 'Reports to Review', value: '1', icon: 'fact-check', bg: '#EEF2FF', color: '#6366F1' },
];

const PENDING_REQUESTS = [
  { id: '1', ticket: 'NRI-2026-00011', customer: 'akanksha', service: 'Scheduled Home Visits by Care Executive', status: 'In Progress', statusBg: '#FFEDD5', statusColor: '#C2410C', sla: 'Overdue 6 days' },
  { id: '2', ticket: 'NRI-2026-00012', customer: 'akanksha', service: 'Scheduled Home Visits by Care Executive', status: 'Assigned', statusBg: '#DBEAFE', statusColor: '#2563EB', sla: 'Overdue 6 days' },
];

const RECENT_CUSTOMERS = [
  { id: '1', name: 'Test', email: 'veratol241@jobraux.com', location: 'Acalanes Ridge, United States', plan: 'Membership' },
  { id: '2', name: 'Pradnya', email: 'pradnyab@walstargroup.org', location: 'California City, United States', plan: 'Membership' },
];

function Dashboard({ navigation }) {
  const goTo = (id) => {
    switch (id) {
      case 'customers': navigation.navigate('MyCustomers'); break;
      case 'tickets': navigation.navigate('Tickets'); break;
      case 'support': navigation.navigate('GeneralSupport'); break;
      case 'planner': navigation.navigate('Planner'); break;
      case 'renewals': navigation.navigate('Renewals'); break;
      case 'upsell': navigation.navigate('Upsell'); break;
      case 'escalations': navigation.navigate('Escalations'); break;
      case 'reports': navigation.navigate('Tickets'); break;
      default: break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Dark Header (Fixed) */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, Relationship Manager 👋</Text>
            <Text style={styles.userName}>My Customers Dashboard</Text>
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
          {/* Stat Cards */}
          <View style={styles.sectionContainer}>
            <View style={styles.statGrid}>
              {STAT_CARDS.map(card => (
                <View key={card.id} style={styles.statCard}>
                  <View style={[styles.statIconBg, { backgroundColor: card.bg }]}>
                    <Icon name={card.icon} size={22} color={card.color} />
                  </View>
                  <Text style={styles.statLabel}>{card.label}</Text>
                  <Text style={styles.statValue}>{card.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pending Requests — SLA Countdown */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tickets')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBlock}>
              {PENDING_REQUESTS.map((req) => (
                <TouchableOpacity
                  key={req.id}
                  style={styles.ticketItem}
                  onPress={() => navigation.navigate('TicketDetail', { ticketId: req.id })}
                  activeOpacity={0.6}
                >
                  <View style={styles.ticketIconBgWrapper}>
                    <View style={[styles.ticketIconBg, { backgroundColor: '#FEE2E2' }]}>
                      <Icon name="schedule" size={22} color="#DC2626" />
                    </View>
                  </View>
                  <View style={styles.ticketDetails}>
                    <Text style={styles.ticketName} numberOfLines={1}>{req.service}</Text>
                    <Text style={styles.ticketSub} numberOfLines={1}>{req.ticket} · {req.customer}</Text>
                    <View style={styles.ticketMetaRow}>
                      <View style={[styles.statusPill, { backgroundColor: req.statusBg }]}>
                        <Text style={[styles.statusPillText, { color: req.statusColor }]}>{req.status}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.statusPillText, { color: '#DC2626' }]}>{req.sla}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Upcoming Birthdays */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Upcoming Birthdays (30 days)</Text>
            <View style={styles.emptyCard}>
              <Icon name="cake" size={28} color="#94A3B8" />
              <Text style={styles.emptyText}>No birthdays in the next 30 days.</Text>
            </View>
          </View>

          {/* Recently Assigned Customers */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Assigned</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyCustomers')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBlock}>
              {RECENT_CUSTOMERS.map((cust) => (
                <TouchableOpacity
                  key={cust.id}
                  style={styles.ticketItem}
                  onPress={() => navigation.navigate('CustomerDetail', { customerId: cust.id })}
                  activeOpacity={0.6}
                >
                  <View style={styles.ticketIconBgWrapper}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{cust.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.ticketDetails}>
                    <Text style={styles.ticketName} numberOfLines={1}>{cust.name}</Text>
                    <Text style={styles.ticketSub} numberOfLines={1}>{cust.email}</Text>
                    <Text style={styles.ticketSub} numberOfLines={1}>{cust.location}</Text>
                  </View>
                  <View style={styles.ticketStatusWrap}>
                    <View style={[styles.statusPill, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.statusPillText, { color: '#6366F1' }]}>{cust.plan}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Explore Grid */}
          <View style={[styles.sectionContainer, { marginBottom: 0 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Explore</Text>
            </View>
            <View style={styles.actionGrid}>
              {EXPLORE_ACTIONS.map((action, index) => {
                // The trailing two cards sit alone on the last row — widen them
                // (and trim their height a touch) so the pair fills the row
                // instead of leaving a gap.
                const isLastPair = index >= EXPLORE_ACTIONS.length - 2;
                return (
                  <TouchableOpacity
                    key={action.id}
                    style={[styles.actionSquare, isLastPair && styles.actionSquareWide]}
                    onPress={() => goTo(action.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: action.color + '10' }]}>
                      <Icon name={action.icon} size={28} color={action.color} />
                    </View>
                    <Text style={styles.actionLabel} numberOfLines={2}>{action.name}</Text>
                  </TouchableOpacity>
                );
              })}
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
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#20304C',
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, fontFamily: typography.body.fontFamily, color: '#94A3B8', marginBottom: 4 },
  userName: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#1A1A1A', marginBottom: 10 },
  viewAllText: { ...typography.labelMedium, color: '#D94625' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  statCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  cardBlock: { gap: 16 },
  ticketItem: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    flexDirection: 'row', alignItems: 'center',
  },
  ticketIconBgWrapper: { marginRight: 16 },
  ticketIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontFamily: typography.h2.fontFamily },
  ticketDetails: { flex: 1, paddingRight: 8, justifyContent: 'center' },
  ticketName: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginBottom: 4 },
  ticketSub: { ...typography.small, color: '#64748B' },
  ticketMetaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ticketStatusWrap: { justifyContent: 'center' },
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
  actionSquareWide: {
    width: '35%',
    paddingVertical: 14,
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
