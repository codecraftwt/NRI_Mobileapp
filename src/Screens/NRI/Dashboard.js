import React, { useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, BackHandler, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import RMWidget from '../../Components/RMWidget';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useDashboard } from '../../Hooks/useDashboard';
import { usePlans } from '../../Hooks/usePlans';
import { lightColors as colors, typography, spacing, radius } from '../../theme';

const { width: W, height: H } = Dimensions.get('window');

// Same rate applied at onboarding checkout — the membership card shows the
// GST-inclusive amount so it matches what the customer actually paid.
const GST_RATE = 0.18;

function Dashboard({ navigation }) {
  const { data, loading, failed, retry } = useDashboard();
  const user = useSelector(s => s.user.user);
  const { plans } = usePlans();
  const { showAlert, alertProps } = useAppAlert();
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: -1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(1000)
      ])
    ).start();
  }, [waveAnim]);

  const waveInterpolate = waveAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const membership = data?.membership;
  const recentTickets = data?.recentTickets || [];

  // Match the active membership to its plan from GET /plans (by id, then slug,
  // then name) so the card can show the plan's real price.
  const membershipPlan = membership
    ? (plans.find(p => p.id === membership.planId)
        || plans.find(p => p.slug === membership.planSlug)
        || plans.find(p => p.name === membership.planName)
        || null)
    : null;

  // Dashboard is the app's home screen (root of the bottom-tab navigator) —
  // hardware back here has nowhere left to go, so it falls through to the
  // OS default of closing the app outright. Intercept it only while this
  // screen is focused so every other screen keeps its normal back behavior.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        showAlert('Exit App', 'Are you sure you want to exit NRI Circle?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [showAlert])
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return { bg: '#EFF6FF', text: '#3B82F6' };
      case 'assigned': return { bg: '#EFF6FF', text: '#3B82F6' };
      case 'in progress': return { bg: '#FEF2F2', text: '#DC2626' };
      case 'completed': return { bg: '#D1FAE5', text: '#059669' };
      case 'overdue': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d.getTime() < Date.now();
  };

  const formatPlanDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const formatPlanPrice = () => {
    let price;
    let currency;
    // 1) The matched plan from GET /plans (prefer USD price the app displays).
    if (membershipPlan) {
      if (membershipPlan.usdPrice != null) { price = membershipPlan.usdPrice; currency = 'USD'; }
      else if (membershipPlan.price != null) { price = membershipPlan.price; currency = membershipPlan.currency || 'USD'; }
    }
    // 2) Fall back to the dashboard membership price, then the price the user
    //    paid at registration (stored on the user during onboarding checkout).
    if (price == null) {
      price = membership?.planPrice ?? user?.planPrice;
      currency = membership?.planCurrency ?? user?.planCurrency ?? 'USD';
    }
    if (price == null) return '';
    // Add GST so the card reflects the GST-inclusive amount actually paid.
    const gross = Math.round(Number(price) * (1 + GST_RATE) * 100) / 100;
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const quickActions = [
    { id: 'sos', name: 'SOS', icon: 'error-outline', color: '#EF4444' },
    { id: 'new', name: 'New Request', icon: 'description', color: '#F97316' },
    { id: 'track', name: 'Track Visit', icon: 'place', color: '#3B82F6' },
    { id: 'chat', name: 'Chat RM', icon: 'chat-bubble-outline', color: '#10B981' },
  ];

  const popularServicesList = [
    { id: 'parent', name: 'Parent', icon: 'favorite-border', color: '#D94625', category: 'Parent Care' },
    { id: 'property', name: 'Property', icon: 'domain', color: '#1E3A8A', category: 'Property Management' },
    { id: 'govt', name: 'Govt.', icon: 'account-balance', color: '#92400E', category: 'Government Documentation' },
    { id: 'legal', name: 'Legal', icon: 'gavel', color: '#047857', category: 'Legal Services' },
    { id: 'travel', name: 'Travel', icon: 'directions-car', color: '#4338CA', category: 'Travel & Transport' },
    { id: 'home', name: 'Home', icon: 'build', color: '#B45309', category: 'Home Repair' },
  ];

  const exploreActions = [
    { id: 'props', name: 'My Properties', icon: 'business', screen: 'Properties', color: '#3B82F6' },
    { id: 'billing', name: 'Billing', icon: 'receipt-long', screen: 'Billing & Payments', color: '#1E3A8A' },
    { id: 'reports', name: 'Reports', icon: 'bar-chart', screen: 'Reports & Media', color: '#10B981' },
    { id: 'wallet', name: 'Wallet', icon: 'account-balance-wallet', screen: 'Wallet & Coupons', color: '#8B5CF6' },
    { id: 'support', name: 'General Support', icon: 'support-agent', screen: 'GeneralSupport', color: '#D94625' },
  ];

  const getServiceIconColor = (serviceName) => {
    const name = serviceName?.toLowerCase() || '';
    if (name.includes('parent') || name.includes('wellness') || name.includes('visit') || name.includes('care')) return '#D1FAE5';
    if (name.includes('property') || name.includes('inspection') || name.includes('tenant') || name.includes('home')) return '#FFEDD5';
    if (name.includes('govt') || name.includes('extract') || name.includes('legal')) return '#E0F2FE';
    return '#F1F5F9';
  };

  const getServiceIconColorText = (serviceName) => {
    const name = serviceName?.toLowerCase() || '';
    if (name.includes('parent') || name.includes('wellness') || name.includes('visit') || name.includes('care')) return '#059669';
    if (name.includes('property') || name.includes('inspection') || name.includes('tenant') || name.includes('home')) return '#F97316';
    if (name.includes('govt') || name.includes('extract') || name.includes('legal')) return '#3B82F6';
    return '#64748B';
  };

  const getServiceIconName = (serviceName) => {
    const name = serviceName?.toLowerCase() || '';
    // Match exact icons from Services.js
    if (name.includes('parent') || name.includes('wellness') || name.includes('visit') || name.includes('care')) return 'favorite-border';
    if (name.includes('property') || name.includes('inspection') || name.includes('tenant') || name.includes('home')) return 'domain';
    if (name.includes('govt') || name.includes('extract') || name.includes('legal')) return 'account-balance';
    return 'assignment';
  };

  return (
    <View style={styles.container}>
      {/* Top Blue Header (Fixed) */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.userName}>Hello {user?.name || 'NRI Circle Member'} </Text>
            <Animated.Text style={[styles.userName, { transform: [{ rotate: waveInterpolate }] }]}>👋</Animated.Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Icon name="notifications-none" size={26} color="#FFFFFF" />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>

        {/* RM Card inside the header */}
        <View style={styles.rmCardWrapper}>
          <RMWidget rm={data?.rm} />
        </View>
      </View>

      {/* Fixed Cream Body */}
      <View style={styles.creamBody}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >

          {loading && !data && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#1E3A8A" />
              <Text style={styles.loadingText}>Fetching your dashboard...</Text>
            </View>
          )}
          {failed && !data && (
            <TouchableOpacity style={styles.retryBox} onPress={retry}>
              <Icon name="refresh" size={20} color={colors.error} />
              <Text style={styles.retryText}>Failed to load. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {/* Quick Actions Unified Card */}
          <View style={styles.quickActionsCard}>
            {quickActions.map(action => (
              <TouchableOpacity key={action.id} style={styles.quickActionItem} onPress={() => {
                if (action.id === 'new') navigation.navigate('Services');
                if (action.id === 'track') navigation.navigate('Requests');
              }}>
                <View style={[styles.qaIconBg, { backgroundColor: action.color + '15' }]}>
                  <Icon name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.qaLabel}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!membership?.renewalAlert && (
            <View style={styles.alertBanner}>
              <View style={styles.alertIcon}>
                <Icon name="error-outline" size={24} color={colors.warning} />
              </View>
              <Text style={styles.alertText}>{membership.renewalAlert}</Text>
            </View>
          )}

          {/* Active Requests List */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Requests</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>

            {recentTickets.length > 0 ? (
              <View style={styles.cardBlock}>
                {recentTickets.slice(0, 3).map((ticket, index) => {
                  // Verified live via GET /customer/tickets/5: a "New" ticket
                  // can already have a past sla_deadline, so overdue applies
                  // from creation, not just once work starts — exclude only
                  // the terminal statuses where a missed SLA no longer matters.
                  const normalizedStatus = ticket.status?.toLowerCase().replace('_', ' ');
                  const overdue = isOverdue(ticket.slaDeadline) && !['completed', 'cancelled'].includes(normalizedStatus);
                  const displayStatus = overdue ? 'Overdue' : ticket.status;
                  const statusStyle = getStatusColor(displayStatus);
                  return (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[styles.ticketItem, index < recentTickets.length - 1 && styles.borderBottom]}
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                      activeOpacity={0.6}
                    >
                      <View style={styles.ticketIconBgWrapper}>
                        <View style={[styles.ticketIconBg, { backgroundColor: getServiceIconColor(ticket.service) }]}>
                          <Icon name={getServiceIconName(ticket.service)} size={22} color={getServiceIconColorText(ticket.service)} />
                        </View>
                      </View>
                      <View style={styles.ticketDetails}>
                        <Text style={styles.ticketName} numberOfLines={1}>{ticket.service}</Text>
                        <Text style={styles.ticketSub} numberOfLines={1}>{ticket.address || 'Location Pending'}</Text>
                        <View style={styles.ticketTimeRow}>
                          <Icon name="schedule" size={14} color="#94A3B8" />
                          <Text style={styles.ticketTimeText} numberOfLines={1}>{ticket.preferredDate || 'Recently'}</Text>
                        </View>
                      </View>
                      <View style={styles.ticketStatusWrap}>
                        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{displayStatus}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight + '15' }]}>
                  <Icon name="receipt" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No active requests</Text>
                <Text style={styles.emptySub}>Book your first service with us today.</Text>
              </View>
            )}
          </View>

          {/* Membership Plan Card */}
          <View style={[styles.sectionContainer, { marginTop: spacing.md }]}>
            <View style={styles.planCard}>
              {/* Pseudo-gradient splash */}
              <View style={{ position: 'absolute', top: -50, bottom: -50, right: -50, width: '57%', backgroundColor: '#A64416', borderRadius: 300, opacity: 0.95 }} />

              <View style={{ flex: 1, zIndex: 1 }}>
                {membership ? (
                  <>
                    <Text style={styles.planSubtitle}>YOUR MEMBERSHIP</Text>
                    <Text style={styles.planTitle}>
                      {membership.planName || 'Membership'}
                      {membership.endDate ? `\n${membership.autoRenew ? 'Renews' : 'Expires'} ${formatPlanDate(membership.endDate)}` : ''}
                    </Text>
                    <Text style={styles.planDesc}>Unlocks every service — billed per request or subscription.</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.planSubtitle}>MEMBERSHIP</Text>
                    <Text style={styles.planTitle}>Unlock every service{'\n'}with NRI Circle</Text>
                    <Text style={styles.planDesc}>One annual membership — then pay per request or subscription.</Text>
                  </>
                )}
              </View>
              {membership ? (
                <View style={[styles.priceTag, { zIndex: 1 }]}>
                  <Text style={styles.priceTagValue}>{formatPlanPrice() || '—'}</Text>
                  <Text style={styles.priceTagLabel}>plan price</Text>
                </View>
              ) : (
                <TouchableOpacity style={[styles.upgradeBtn, { zIndex: 1 }]} onPress={() => navigation.navigate('My Membership')}>
                  <Text style={styles.upgradeBtnText}>Join Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Explore Grid */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Explore</Text>
            </View>
            <View style={styles.actionGrid}>
              {exploreActions.map(action => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionSquare}
                  onPress={() => navigation.navigate(action.screen)}
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
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20304C', // Matches blueHeader for seamless corners
  },

  blueHeader: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#20304C',
    zIndex: 10,
    elevation: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    ...typography.tiny,
    fontFamily: typography.labelMedium.fontFamily,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26, // Matched screenshot
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  premiumText: {
    ...typography.small,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#F59E0B',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },

  creamBody: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  rmCardWrapper: {
    marginTop: 16,
  },

  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 24, // Standard top padding since RM card no longer overlaps
    paddingBottom: 100,
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
  ticketRow: {
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
    marginBottom: 4,
  },
  ticketTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketTimeText: {
    fontSize: 12,
    color: '#94A3B8',
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

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
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

  popularSquare: {
    width: '30%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularLabel: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    textAlign: 'center',
  },

  planCard: {
    backgroundColor: '#202945', // Dark slate blue base
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
    color: '#D1D5DB', // Light grey
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
    backgroundColor: 'rgba(255,255,255,0.2)', // Semi-transparent white/brownish
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priceTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  priceTagValue: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  priceTagLabel: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#E5E7EB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  loadingText: { ...typography.body, color: '#64748B' },
  retryBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 40 },
  retryText: { ...typography.labelMedium, color: colors.error },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: spacing.sm,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertText: { ...typography.body, color: '#92400E', flex: 1 },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptySub: {
    ...typography.small,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default Dashboard;
