import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useVendorRatings } from '../../Hooks/useVendorRatings';
import { useVendorProfile } from '../../Hooks/useVendorProfile';
import { useVendorDashboard } from '../../Hooks/useVendorDashboard';
import { useNotifications } from '../../Hooks/useNotifications';

const QUICK_ACTIONS = [
  { id: 'jobs', name: 'My Jobs', icon: 'work', color: '#3B82F6' },
  { id: 'ratings', name: 'Ratings', icon: 'star', color: '#F97316' },
  { id: 'support', name: 'Support', icon: 'support-agent', color: '#10B981' },
  { id: 'documents', name: 'Documents', icon: 'folder-shared', color: '#1E3A8A' },
];

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// Pill colours for a recent-job's status, matching the My Jobs list.
function jobStatusColors(status) {
  switch (status) {
    case 'Completed': return { bg: '#D1FAE5', text: '#059669' };
    case 'In Progress': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'New': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'Assigned': return { bg: '#FEF9C3', text: '#CA8A04' };
    default: return { bg: '#F1F5F9', text: '#64748B' };
  }
}

function Dashboard({ navigation }) {
  const [available, setAvailable] = useState(true);
  const user = useSelector(state => state.user.user);
  const { summary } = useVendorRatings();
  const { profile, actionLoading, updateAvailability } = useVendorProfile();
  const { counts, pendingPayout, recentJobs, vendorStatus, loading: dashboardLoading } = useVendorDashboard();
  const { unreadCount, fetch: fetchNotifications } = useNotifications();
  const { showAlert, alertProps } = useAppAlert();

  // Load the unread count for the header bell badge.
  useEffect(() => { fetchNotifications(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const vendorName = profile?.businessName || user?.name || 'Vendor';
  // Prefer the customer-facing average; fall back to the overall/composite score,
  // then the dashboard payload's own rating.
  const ratingValue = summary?.avgCustomerRating ?? summary?.overallScore ?? vendorStatus?.rating ?? null;
  const standing = summary?.standing || vendorStatus?.standing || 'Account in good standing';

  const headerStats = [
    { id: 'to_accept', label: 'To Accept', value: counts?.toAccept ?? 0, icon: 'work-outline', bg: '#FEECEC', color: '#EF4444' },
    { id: 'in_progress', label: 'In Progress', value: counts?.inProgress ?? 0, icon: 'timelapse', bg: '#EAF1FE', color: '#3B82F6' },
    { id: 'done', label: 'Completed', value: counts?.completed ?? 0, icon: 'check-circle-outline', bg: '#E5F6EC', color: '#10B981' },
  ];

  // Reflect the saved availability from the profile.
  useEffect(() => {
    if (profile?.availability) setAvailable(profile.availability.isAvailable !== false);
  }, [profile?.availability?.isAvailable]);

  // Toggle posts to /vendor/profile/availability; revert on failure.
  const handleToggleAvailable = async (next) => {
    setAvailable(next); // optimistic
    try {
      await updateAvailability({ isAvailable: next }).unwrap();
    } catch (e) {
      setAvailable(!next);
      showAlert('Update Failed', e?.message || 'Could not update your availability.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Blue Header (Fixed) */}
      <View style={styles.blueHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>{vendorName}</Text>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <Icon name="notifications-none" size={24} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.goldBadge}>
            <Icon name="star" size={12} color="#F5B301" />
            <Text style={styles.goldBadgeText}>Gold Vendor</Text>
          </View>
          <Text style={styles.metaText}>{ratingValue != null ? `${Number(ratingValue).toFixed(1)} Rating` : 'No ratings yet'}</Text>
        </View>

        {/* Availability Toggle */}
        <View style={styles.availCard}>
          <View style={styles.availLeft}>
            <View style={[styles.availDot, { backgroundColor: available ? '#22C55E' : '#F59E0B' }]} />
            <View>
              <Text style={styles.availTitle}>{available ? 'Available for Jobs' : 'Unavailable'}</Text>
            </View>
          </View>
          <View style={styles.availRight}>
            <Text style={styles.availHint}>{available ? 'Toggle off to go offline' : 'Toggle on to go online'}</Text>
            <Switch
              value={available}
              onValueChange={handleToggleAvailable}
              disabled={actionLoading}
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
            {headerStats.map((stat, index) => (
              <View
                key={stat.id}
                style={[styles.headerStatCard, { backgroundColor: stat.bg }, index < headerStats.length - 1 && { marginRight: 12 }]}
              >
                <Icon name={stat.icon} size={20} color={stat.color} />
                <Text style={styles.headerStatValue}>{String(stat.value)}</Text>
                <Text style={styles.headerStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Pending Payout */}
          <TouchableOpacity style={styles.payoutCard} onPress={() => navigation.navigate('Earnings')} activeOpacity={0.85}>
            <View style={styles.payoutIconBg}>
              <Icon name="account-balance-wallet" size={22} color="#D94625" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payoutLabel}>Pending Payout</Text>
              <Text style={styles.payoutValue}>{formatInr(pendingPayout)}</Text>
            </View>
            <Icon name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>

          {/* Quick Actions Unified Card */}
          <View style={styles.quickActionsCard}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionItem}
                onPress={() => {
                  if (action.id === 'jobs') navigation.navigate('MyJobs');
                  if (action.id === 'ratings') navigation.navigate('Ratings');
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
              {dashboardLoading && recentJobs.length === 0 ? (
                <Text style={styles.recentEmptyText}>Loading recent jobs...</Text>
              ) : recentJobs.length === 0 ? (
                <Text style={styles.recentEmptyText}>No recent jobs yet.</Text>
              ) : (
                recentJobs.slice(0, 3).map((job) => {
                  const sc = jobStatusColors(job.status);
                  return (
                    <TouchableOpacity
                      key={job.id}
                      style={styles.ticketItem}
                      onPress={() => navigation.navigate('JobDetail', { ticketId: job.id, status: job.status })}
                      activeOpacity={0.6}
                    >
                      <View style={styles.ticketIconBgWrapper}>
                        <View style={[styles.ticketIconBg, { backgroundColor: sc.bg }]}>
                          <Icon name="assignment-turned-in" size={22} color={sc.text} />
                        </View>
                      </View>
                      <View style={styles.ticketDetails}>
                        <Text style={styles.ticketName} numberOfLines={1}>{job.service}</Text>
                        <Text style={styles.ticketSub} numberOfLines={1}>{job.ticket} · {job.location}</Text>
                      </View>
                      <View style={styles.ticketStatusWrap}>
                        <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.statusPillText, { color: sc.text }]}>{job.status}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          {/* My Status Card */}
          <View style={[styles.sectionContainer, { marginTop: 0 }]}>
            <View style={styles.planCard}>
              <View style={{ position: 'absolute', top: -50, bottom: -50, right: -50, width: '65%', backgroundColor: '#A64416', borderRadius: 300, opacity: 0.95 }} />
              <View style={{ flex: 1, zIndex: 1 }}>
                <Text style={styles.planSubtitle}>MY STATUS</Text>
                <Text style={styles.planTitle}>Active · {available ? 'Available' : 'Unavailable'}</Text>
                <Text style={styles.planDesc}>
                  {ratingValue != null ? `★ ${Number(ratingValue).toFixed(2)} rating · ` : ''}{standing}
                </Text>
              </View>
              <TouchableOpacity style={[styles.upgradeBtn, { zIndex: 1 }]} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.upgradeBtnText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>
      <AppAlert {...alertProps} />
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
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  userName: {
    flex: 1,
    fontSize: 26,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#20304C',
  },
  bellBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
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

  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  payoutIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(217, 70, 37, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  payoutValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  recentEmptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 },

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
