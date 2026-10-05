import React, { useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useNotifications } from '../../Hooks/useNotifications';
import { useTelecallerDashboard } from '../../Hooks/Telecaller/useTelecallerDashboard';

const QUICK_ACTIONS = [
  { id: 'call_centre', name: 'Call Centre', icon: 'headset-mic', color: '#3B82F6', route: 'CallCentre' },
  { id: 'call_history', name: 'Call History', icon: 'access-time', color: '#F97316', route: 'CallHistory' },
  { id: 'general_support', name: 'Chat Support', icon: 'chat-bubble-outline', color: '#10B981', route: 'GeneralSupport' },
  { id: 'custom_plan', name: 'Custom Plan', icon: 'auto-awesome', color: '#8B5CF6', route: 'CustomPlan' },
  { id: 'my_customers', name: 'My Customers', icon: 'person-outline', color: '#0EA5E9', route: 'MyCustomers' },
  { id: 'requests', name: 'Requests', icon: 'confirmation-number', color: '#EA580C', route: 'ServiceRequests' },
];

function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getRequestStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolv') || s.includes('complet')) return { bg: '#ECFDF5', text: '#059669' };
  if (s.includes('progress') || s.includes('active') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB' };
  if (s.includes('pend') || s.includes('hold')) return { bg: '#FFFBEB', text: '#D97706' };
  if (s.includes('cancel') || s.includes('breach') || s.includes('reject')) return { bg: '#FEF2F2', text: '#DC2626' };
  return { bg: '#F8FAFC', text: '#475569' };
}

function formatStatus(status) {
  return String(status || 'Open').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function Dashboard({ navigation }) {
  const user = useSelector(state => state.user.user);
  const { unreadCount, fetch: fetchNotifications } = useNotifications();
  const {
    stats,
    calls,
    unreadChats,
    area,
    awaitingChats = [],
    linkedRequests = [],
    loading,
    failed,
    error,
    refresh,
  } = useTelecallerDashboard();

  const telecallerName = user?.name || 'Telecaller';

  useEffect(() => {
    fetchNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), fetchNotifications()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, fetchNotifications]);

  // Waving-hand animation next to the name
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

  const chatsAwaitingReply = stats?.chatsAwaitingReply ?? 0;
  const chatsAwaitingCustomer = stats?.chatsAwaitingCustomer ?? 0;
  const totalCalls = calls?.total ?? 0;
  const connectedCalls = calls?.connected ?? 0;
  const pendingCalls = calls?.pending ?? 0;
  const missedCalls = calls?.missed ?? 0;

  const areaLabel = area?.unrestricted
    ? 'All Areas (Unrestricted)'
    : (area?.name || area?.city || area?.district || 'Assigned Area');

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Top Dark Header (Fixed) */}
      <View style={styles.blueHeader}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.decorDot} pointerEvents="none" />

        <View style={styles.headerTop}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Hello,</Text>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{telecallerName}</Text>
              <Animated.Text style={[styles.wave, { transform: [{ rotate: waveInterpolate }] }]}>👋</Animated.Text>
            </View>

            {/* Scope / Area Pill */}
            <View style={styles.areaPill}>
              <Icon name={area?.unrestricted ? 'public' : 'location-on'} size={14} color="#FDE68A" />
              <Text style={styles.areaPillText} numberOfLines={1}>{areaLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
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
        {loading && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A64416" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
          >
            {failed && (
              <View style={styles.errorBanner}>
                <Icon name="error-outline" size={20} color="#DC2626" />
                <Text style={styles.errorBannerText}>{error?.message || 'Could not load latest data'}</Text>
                <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Main Chat & Attention Stat Cards */}
            <View style={styles.statGrid}>
              {/* Awaiting My Reply (Needs Attention) */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('GeneralSupport')}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                    <Icon name="chat-bubble" size={18} color="#D97706" />
                  </View>
                  {chatsAwaitingReply > 0 && (
                    <View style={styles.attentionPill}>
                      <Text style={styles.attentionPillText}>Action</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.statValue, { color: '#B45309' }]}>{chatsAwaitingReply}</Text>
                <Text style={styles.statLabel}>Awaiting Reply</Text>
                <Text style={styles.statSubLabel}>Customer wrote last</Text>
              </TouchableOpacity>

              {/* Unread Chats */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('GeneralSupport')}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBg, { backgroundColor: '#DBEAFE' }]}>
                    <Icon name="mark-chat-unread" size={18} color="#2563EB" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: '#1D4ED8' }]}>{unreadChats}</Text>
                <Text style={styles.statLabel}>Unread Chats</Text>
                <Text style={styles.statSubLabel}>New messages</Text>
              </TouchableOpacity>

              {/* Awaiting Customer */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('GeneralSupport')}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
                    <Icon name="done-all" size={18} color="#059669" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: '#047857' }]}>{chatsAwaitingCustomer}</Text>
                <Text style={styles.statLabel}>Awaiting Customer</Text>
                <Text style={styles.statSubLabel}>You replied last</Text>
              </TouchableOpacity>

              {/* Requests / Tickets */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ServiceRequests')}
              >
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBg, { backgroundColor: '#FFEDD5' }]}>
                    <Icon name="confirmation-number" size={18} color="#EA580C" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: '#C2410C' }]}>{stats?.totalRequests ?? stats?.openRequests ?? 0}</Text>
                <Text style={styles.statLabel}>Service Requests</Text>
                <Text style={styles.statSubLabel}>Assigned & open</Text>
              </TouchableOpacity>
            </View>

            {/* Today's Call Centre Stats */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="phone-in-talk" size={20} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Today's Calls</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('CallCentre')} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>Call Centre →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.callsCard}>
                <View style={styles.callStatCol}>
                  <Text style={[styles.callStatNumber, { color: '#1E293B' }]}>{totalCalls}</Text>
                  <Text style={styles.callStatLabel}>Total Calls</Text>
                </View>
                <View style={styles.callDivider} />
                <View style={styles.callStatCol}>
                  <Text style={[styles.callStatNumber, { color: '#16A34A' }]}>{connectedCalls}</Text>
                  <Text style={styles.callStatLabel}>Connected</Text>
                </View>
                <View style={styles.callDivider} />
                <View style={styles.callStatCol}>
                  <Text style={[styles.callStatNumber, { color: '#F59E0B' }]}>{pendingCalls}</Text>
                  <Text style={styles.callStatLabel}>Pending</Text>
                </View>
                <View style={styles.callDivider} />
                <View style={styles.callStatCol}>
                  <Text style={[styles.callStatNumber, { color: '#DC2626' }]}>{missedCalls}</Text>
                  <Text style={styles.callStatLabel}>Missed</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsCard}>
                {QUICK_ACTIONS.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.quickActionItem}
                    onPress={() => navigation.navigate(action.route)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.qaIconBg, { backgroundColor: action.color + '15' }]}>
                      <Icon name={action.icon} size={24} color={action.color} />
                    </View>
                    <Text style={styles.qaLabel} numberOfLines={1}>{action.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Awaiting Reply / Needs Attention Chats */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="announcement" size={18} color="#D97706" />
                  <Text style={styles.sectionTitle}>Chats Awaiting Reply</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('GeneralSupport')} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View all →</Text>
                </TouchableOpacity>
              </View>

              {awaitingChats.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="check-circle" size={32} color="#10B981" />
                  <Text style={styles.emptyTitle}>All caught up!</Text>
                  <Text style={styles.emptySubtitle}>No customer chats are waiting for your reply right now.</Text>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {awaitingChats.slice(0, 4).map((chat) => (
                    <TouchableOpacity
                      key={chat.id}
                      style={styles.chatCard}
                      onPress={() => navigation.navigate('GeneralSupport', { chatId: chat.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.chatAvatar}>
                        <Icon name="person" size={20} color="#6366F1" />
                      </View>
                      <View style={styles.chatInfo}>
                        <View style={styles.chatHeaderRow}>
                          <Text style={styles.chatCustomerName} numberOfLines={1}>{chat.customerName}</Text>
                          <Text style={styles.chatTime}>{relativeTime(chat.lastMessageAt)}</Text>
                        </View>
                        <Text style={styles.chatSnippet} numberOfLines={1}>{chat.lastMessage}</Text>
                      </View>
                      {chat.unread && (
                        <View style={styles.chatUnreadDot} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Linked Service Requests */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="receipt-long" size={18} color="#EA580C" />
                  <Text style={styles.sectionTitle}>Linked Requests</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('ServiceRequests')} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View all →</Text>
                </TouchableOpacity>
              </View>

              {linkedRequests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="inbox" size={32} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No linked requests</Text>
                  <Text style={styles.emptySubtitle}>Requests assigned to your queue will appear here.</Text>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {linkedRequests.slice(0, 4).map((req) => {
                    const statusStyle = getRequestStatusStyle(req.status);
                    return (
                      <TouchableOpacity
                        key={req.id}
                        style={styles.requestCard}
                        onPress={() => navigation.navigate('ServiceRequests')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.requestIconBg}>
                          <Icon name="assignment" size={20} color="#EA580C" />
                        </View>
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestService} numberOfLines={1}>{req.serviceName}</Text>
                          <Text style={styles.requestMeta} numberOfLines={1}>
                            {req.ticketNumber} • {req.customerName}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                            {formatStatus(req.status)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        )}
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
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: '#20304C',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  decorDot: {
    position: 'absolute',
    bottom: 20,
    right: 90,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: typography.body.fontFamily,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  userName: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  wave: {
    fontSize: 22,
    marginLeft: 6,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  areaPillText: {
    fontSize: 12,
    color: '#FDE68A',
    fontWeight: '600',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
  bellBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  creamBody: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attentionPill: {
    backgroundColor: '#D97706',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attentionPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  statSubLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
  },
  viewAllText: {
    ...typography.labelMedium,
    color: '#A64416',
  },

  callsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  callStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  callStatNumber: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
  },
  callStatLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },

  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '33.33%',
    gap: 6,
  },
  qaIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaLabel: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#334155',
    textAlign: 'center',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  cardList: {
    gap: 10,
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatCustomerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  chatSnippet: {
    fontSize: 12,
    color: '#64748B',
  },
  chatUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },

  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  requestIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
    marginRight: 8,
  },
  requestService: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  requestMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default Dashboard;
