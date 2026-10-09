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
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors, typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useNotifications } from '../../Hooks/useNotifications';
import { useTelecallerDashboard } from '../../Hooks/Telecaller/useTelecallerDashboard';

const exploreActions = [
  { id: 'call_centre', name: 'Call Centre', icon: 'headset-mic', screen: 'CallCentre', color: '#3B82F6' },
  { id: 'call_history', name: 'Call History', icon: 'access-time', screen: 'CallHistory', color: '#F97316' },
  { id: 'support', name: 'Support', icon: 'support-agent', screen: 'GeneralSupport', color: '#10B981' },
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
  if (s.includes('resolv') || s.includes('complet')) return { bg: '#D1FAE5', text: '#059669' };
  if (s.includes('progress') || s.includes('active') || s.includes('assign')) return { bg: '#EFF6FF', text: '#3B82F6' };
  if (s.includes('pend') || s.includes('hold')) return { bg: '#FEF3C7', text: '#D97706' };
  if (s.includes('cancel') || s.includes('breach') || s.includes('reject') || s.includes('overdue')) return { bg: '#FEE2E2', text: '#DC2626' };
  return { bg: '#F1F5F9', text: '#64748B' };
}

function formatStatus(status) {
  return String(status || 'Open').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getServiceIconColor(serviceName) {
  const name = serviceName?.toLowerCase() || '';
  if (name.includes('parent') || name.includes('wellness') || name.includes('visit') || name.includes('care')) return '#D1FAE5';
  if (name.includes('property') || name.includes('inspection') || name.includes('tenant') || name.includes('home')) return '#FFEDD5';
  if (name.includes('govt') || name.includes('extract') || name.includes('legal')) return '#E0F2FE';
  return '#F1F5F9';
}

function getServiceIconColorText(serviceName) {
  const name = serviceName?.toLowerCase() || '';
  if (name.includes('parent') || name.includes('wellness') || name.includes('visit') || name.includes('care')) return '#059669';
  if (name.includes('property') || name.includes('inspection') || name.includes('tenant') || name.includes('home')) return '#F97316';
  if (name.includes('govt') || name.includes('extract') || name.includes('legal')) return '#3B82F6';
  return '#64748B';
}

function getServiceIconName(serviceName) {
  const name = serviceName?.toLowerCase() || '';
  if (name.includes('parent') || name.includes('wellness') || name.includes('visit') || name.includes('care')) return 'favorite-border';
  if (name.includes('property') || name.includes('inspection') || name.includes('tenant') || name.includes('home')) return 'domain';
  if (name.includes('govt') || name.includes('extract') || name.includes('legal')) return 'account-balance';
  return 'assignment';
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
  const { showAlert, alertProps } = useAppAlert();

  useEffect(() => {
    fetchNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const areaLabel = area?.unrestricted
    ? 'All Areas (Unrestricted)'
    : (area?.name || area?.city || area?.district || 'Assigned Area');

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Top Blue Header (Fixed) */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <View style={styles.helloRow}>
              <Text style={styles.helloText}>Hello</Text>
              <Animated.Text style={[styles.helloText, { marginLeft: 4, transform: [{ rotate: waveInterpolate }] }]}>👋</Animated.Text>
            </View>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {telecallerName}
            </Text>
            <View style={styles.areaRow}>
              <Icon name={area?.unrestricted ? 'public' : 'location-on'} size={12} color="#FDE68A" />
              <Text style={styles.areaText} numberOfLines={1}>{areaLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Icon name="notifications-none" size={22} color="#FFFFFF" />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* Fixed Cream Body */}
      <View style={styles.creamBody}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
        >
          {loading && !stats && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#1E3A8A" />
              <Text style={styles.loadingText}>Fetching your dashboard...</Text>
            </View>
          )}

          {failed && !stats && (
            <TouchableOpacity style={styles.retryBox} onPress={refresh}>
              <Icon name="refresh" size={18} color={colors.error || '#DC2626'} />
              <Text style={styles.retryText}>{error?.message || 'Failed to load. Tap to retry.'}</Text>
            </TouchableOpacity>
          )}

          {/* Chats Awaiting Reply Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Chats Awaiting Reply</Text>
                {awaitingChats.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{awaitingChats.length}</Text>
                  </View>
                )}
              </View>
            </View>

            {awaitingChats.length > 0 ? (
              <View style={styles.cardBlock}>
                {awaitingChats.slice(0, 4).map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.ticketItem}
                    onPress={() => navigation.navigate('SupportTicketDetail', { ticketId: chat.id, ticketNumber: chat.ticketNumber })}
                    activeOpacity={0.6}
                  >
                    <View style={styles.ticketIconBgWrapper}>
                      <View style={[styles.ticketIconBg, { backgroundColor: '#EEF2FF' }]}>
                        <Icon name="chat-bubble-outline" size={18} color="#4F46E5" />
                      </View>
                    </View>
                    <View style={styles.ticketDetails}>
                      <Text style={styles.ticketName} numberOfLines={1}>{chat.customerName || 'Customer'}</Text>
                      <Text style={styles.ticketSub} numberOfLines={1}>{chat.lastMessage || 'No recent message'}</Text>
                      <View style={styles.ticketTimeRow}>
                        <Icon name="schedule" size={12} color="#94A3B8" />
                        <Text style={styles.ticketTimeText} numberOfLines={1}>{relativeTime(chat.lastMessageAt) || 'Recently'}</Text>
                      </View>
                    </View>
                    {chat.unread && (
                      <View style={styles.chatUnreadDot} />
                    )}
                    <Icon name="chevron-right" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#10B98115' }]}>
                  <Icon name="check-circle" size={24} color="#10B981" />
                </View>
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySub}>No customer chats are waiting for your reply right now.</Text>
              </View>
            )}
          </View>

          {/* Linked Requests Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Linked Requests</Text>
                {linkedRequests.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{linkedRequests.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate('ServiceRequests')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.viewAllText}>View all</Text>
                <Icon name="chevron-right" size={14} color="#D94625" />
              </TouchableOpacity>
            </View>

            {linkedRequests.length > 0 ? (
              <View style={styles.cardBlock}>
                {linkedRequests.slice(0, 4).map((req) => {
                  const statusStyle = getRequestStatusStyle(req.status);
                  return (
                    <TouchableOpacity
                      key={req.id}
                      style={styles.ticketItem}
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: req.id, ticket: req.ticketNumber })}
                      activeOpacity={0.6}
                    >
                      <View style={styles.ticketIconBgWrapper}>
                        <View style={[styles.ticketIconBg, { backgroundColor: getServiceIconColor(req.serviceName) }]}>
                          <Icon name={getServiceIconName(req.serviceName)} size={18} color={getServiceIconColorText(req.serviceName)} />
                        </View>
                      </View>
                      <View style={styles.ticketDetails}>
                        <Text style={styles.ticketName} numberOfLines={1}>{req.serviceName || 'Service Request'}</Text>
                        {req.ticketNumber && (
                          <Text style={styles.ticketSub} numberOfLines={1}>{req.ticketNumber}</Text>
                        )}
                      </View>
                      <View style={styles.ticketStatusWrap}>
                        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                          <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
                          <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                            {formatStatus(req.status)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#F9731615' }]}>
                  <Icon name="receipt" size={24} color="#F97316" />
                </View>
                <Text style={styles.emptyTitle}>No linked requests</Text>
                <Text style={styles.emptySub}>Requests assigned to your queue will appear here.</Text>
              </View>
            )}
          </View>

          {/* Explore Grid */}
          <View style={[styles.sectionContainer, { marginBottom: 0 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Explore</Text>
            </View>
            <View style={styles.actionGrid}>
              {exploreActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionSquare}
                  onPress={() => navigation.navigate(action.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBg, { backgroundColor: action.color + '10' }]}>
                    <Icon name={action.icon} size={22} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel} numberOfLines={1}>{action.name}</Text>
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
    backgroundColor: '#20304C',
  },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#20304C',
    zIndex: 10,
    elevation: 0,
  },
  headerTop: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flex: 1,
    paddingRight: 48,
  },
  helloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  helloText: {
    fontSize: 14,
    fontFamily: typography.labelMedium.fontFamily,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  userName: {
    fontSize: 26,
    fontFamily: typography.h2.fontFamily,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  areaText: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#FDE68A',
  },
  bellBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  creamBody: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.h2.fontFamily,
    color: '#1E293B',
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#64748B',
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FDEAE3',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  viewAllText: {
    fontSize: 11.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#D94625',
    fontWeight: '700',
  },

  cardBlock: {
    gap: 10,
  },
  ticketItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketIconBgWrapper: {
    marginRight: 12,
  },
  ticketIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketDetails: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  ticketName: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 2,
  },
  ticketSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  ticketTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ticketTimeText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  ticketStatusWrap: {
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chatUnreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#3B82F6',
    marginLeft: 6,
  },

  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionSquare: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  retryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 30,
  },
  retryText: {
    fontSize: 12,
    color: colors.error || '#DC2626',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: typography.h2.fontFamily,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 2,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default Dashboard;
