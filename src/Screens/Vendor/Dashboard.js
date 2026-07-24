import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';

const HEADER_STATS = [
  { id: 'new', label: 'New Jobs', value: '2', icon: 'work-outline', bg: '#FEECEC', color: '#EF4444' },
  { id: 'today', label: 'Today', value: '2', icon: 'event', bg: '#EAF1FE', color: '#3B82F6' },
  { id: 'done', label: 'Done (Dec)', value: '2', icon: 'check-circle-outline', bg: '#E5F6EC', color: '#10B981' },
];

const QUICK_ACTIONS = [
  { id: 'jobs', name: 'My Jobs', icon: 'work', color: '#3B82F6' },
  { id: 'earnings', name: 'Earnings', icon: 'account-balance-wallet', color: '#F97316' },
  { id: 'support', name: 'Support', icon: 'support-agent', color: '#10B981' },
  { id: 'documents', name: 'Documents', icon: 'folder-shared', color: '#1E3A8A' },
];

const RECENT_JOBS = [
  { id: '1', ticket: 'NRI-2026-00009', service: 'Scheduled Home Visits by Care Executive', location: 'Kolhapur, Maharashtra', status: 'Completed' },
  { id: '2', ticket: 'NRI-2026-00008', service: 'Medicine Reminder Coordination', location: 'Kolhapur, Maharashtra', status: 'Completed' },
];

function Dashboard({ navigation }) {
  const [available, setAvailable] = useState(true);

  return (
    <View style={styles.container}>
      {/* Top Blue Header (Fixed) */}
      <View style={styles.blueHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>Suresh Kambli</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.goldBadge}>
            <Icon name="star" size={12} color="#F5B301" />
            <Text style={styles.goldBadgeText}>Gold Vendor</Text>
          </View>
          <Text style={styles.metaText}>Pune · 4.8 Rating</Text>
        </View>

        {/* Availability Toggle */}
        <View style={styles.availCard}>
          <View style={styles.availLeft}>
            <View style={styles.availDot} />
            <View>
              <Text style={styles.availTitle}>Available for Jobs</Text>
            </View>
          </View>
          <View style={styles.availRight}>
            <Text style={styles.availHint}>Toggle off to go offline</Text>
            <Switch
              value={available}
              onValueChange={setAvailable}
              trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#CBD5E1"
            />
          </View>
        </View>
      </View>

      {/* Fixed Cream Body */}
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
                style={[styles.headerStatCard, { backgroundColor: stat.bg }, index < HEADER_STATS.length - 1 && { marginRight: 12 }]}
              >
                <Icon name={stat.icon} size={20} color={stat.color} />
                <Text style={styles.headerStatValue}>{stat.value}</Text>
                <Text style={styles.headerStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions Unified Card */}
          <View style={styles.quickActionsCard}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionItem}
                onPress={() => {
                  if (action.id === 'jobs') navigation.navigate('MyJobs');
                  if (action.id === 'earnings') navigation.navigate('Earnings');
                  if (action.id === 'support') navigation.navigate('Support');
                  if (action.id === 'documents') navigation.navigate('Documents');
                }}
              >
                <View style={[styles.qaIconBg, { backgroundColor: action.color + '15' }]}>
                  <Icon name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.qaLabel}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Jobs List */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Jobs</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyJobs')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBlock}>
              {RECENT_JOBS.map((job, index) => (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.ticketItem, index < RECENT_JOBS.length - 1 && styles.borderBottom]}
                  onPress={() => navigation.navigate('JobDetail', { ticketId: job.id })}
                  activeOpacity={0.6}
                >
                  <View style={styles.ticketIconBgWrapper}>
                    <View style={[styles.ticketIconBg, { backgroundColor: '#D1FAE5' }]}>
                      <Icon name="assignment-turned-in" size={22} color="#059669" />
                    </View>
                  </View>
                  <View style={styles.ticketDetails}>
                    <Text style={styles.ticketName} numberOfLines={1}>{job.service}</Text>
                    <Text style={styles.ticketSub} numberOfLines={1}>{job.ticket} · {job.location}</Text>
                  </View>
                  <View style={styles.ticketStatusWrap}>
                    <View style={[styles.statusPill, { backgroundColor: '#D1FAE5' }]}>
                      <Text style={[styles.statusPillText, { color: '#059669' }]}>{job.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* My Status Card */}
          <View style={[styles.sectionContainer, { marginTop: 0 }]}>
            <View style={styles.planCard}>
              <View style={{ position: 'absolute', top: -50, bottom: -50, right: -50, width: '65%', backgroundColor: '#A64416', borderRadius: 300, opacity: 0.95 }} />
              <View style={{ flex: 1, zIndex: 1 }}>
                <Text style={styles.planSubtitle}>MY STATUS</Text>
                <Text style={styles.planTitle}>Active · Available</Text>
                <Text style={styles.planDesc}>★ 4.00 rating · Account in good standing</Text>
              </View>
              <TouchableOpacity style={[styles.upgradeBtn, { zIndex: 1 }]} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.upgradeBtnText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20304C',
  },

  blueHeader: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: '#20304C',
    zIndex: 10,
    elevation: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portalLabel: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#E9A23B',
    letterSpacing: 1.2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  userName: {
    fontSize: 26,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  rmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E7A46',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  rmPillText: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,179,1,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  goldBadgeText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#F5B301',
  },
  metaText: {
    fontSize: 12,
    fontFamily: typography.small.fontFamily,
    color: '#9FB0C9',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 11,
    right: 13,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#20304C',
  },

  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  availLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  availDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  availTitle: {
    fontSize: 14,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#FFFFFF',
  },
  availRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  availHint: {
    fontSize: 11,
    fontFamily: typography.small.fontFamily,
    color: '#9FB0C9',
  },

  creamBody: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },

  headerStatStrip: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  headerStatCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
    marginTop: 6,
  },
  headerStatLabel: {
    fontSize: 11,
    fontFamily: typography.small.fontFamily,
    color: '#64748B',
    marginTop: 2,
  },

  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '24%',
    gap: 8,
  },
  qaIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaLabel: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#334155',
    textAlign: 'center',
  },

  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
  },
  viewAllText: {
    ...typography.labelMedium,
    color: '#D94625',
  },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  cardBlock: {
    gap: 16,
  },
  ticketItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketIconBgWrapper: {
    marginRight: 16,
  },
  ticketIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketDetails: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  ticketName: {
    fontSize: 16,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    marginBottom: 4,
  },
  ticketSub: {
    ...typography.small,
    color: '#64748B',
  },
  ticketStatusWrap: {
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPillText: {
    ...typography.tiny,
    fontFamily: typography.labelMedium.fontFamily,
  },
  borderBottom: {},

  planCard: {
    backgroundColor: '#202945',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planSubtitle: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#D1D5DB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  planTitle: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  planDesc: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  upgradeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#FFFFFF',
  },
});

export default Dashboard;
