import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useNotifications } from '../../Hooks/useNotifications';

// Values are static placeholders until a Telecaller dashboard API exists —
// swap for real counts once one is wired up.
const HEADER_STATS = [
  { id: 'requests', label: 'Service Requests', value: 0, icon: 'confirmation-number', bg: '#FEECEC', color: '#EF4444' },
  { id: 'vendors', label: 'Vendors', value: 0, icon: 'storefront', bg: '#EAF1FE', color: '#3B82F6' },
  { id: 'customers', label: 'Customers', value: 0, icon: 'groups', bg: '#E5F6EC', color: '#10B981' },
];

const QUICK_ACTIONS = [
  { id: 'call_centre', name: 'Call Centre', icon: 'headset-mic', color: '#3B82F6', route: 'CallCentre' },
  { id: 'call_history', name: 'Call History', icon: 'access-time', color: '#F97316', route: 'CallHistory' },
  { id: 'general_support', name: 'General Support', icon: 'chat-bubble-outline', color: '#10B981', route: 'GeneralSupport' },
  { id: 'custom_plan', name: 'Custom Plan', icon: 'auto-awesome', color: '#8B5CF6', route: 'CustomPlan' },
  { id: 'my_customers', name: 'My Customers', icon: 'person-outline', color: '#1E3A8A', route: 'MyCustomers' },
];

function Dashboard({ navigation }) {
  const user = useSelector(state => state.user.user);
  const { unreadCount, fetch: fetchNotifications } = useNotifications();
  const telecallerName = user?.name || 'Telecaller';

  useEffect(() => { fetchNotifications(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Waving-hand animation next to the name (mirrors Vendor/StateAdmin dashboards).
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

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      {/* Top Blue Header (Fixed) */}
      <View style={styles.blueHeader}>
        <View style={styles.nameRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.userName} numberOfLines={1}>{telecallerName}</Text>
            <Animated.Text style={[styles.wave, { transform: [{ rotate: waveInterpolate }] }]}>👋</Animated.Text>
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
                <Text style={styles.headerStatValue}>{String(stat.value)}</Text>
                <Text style={styles.headerStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsCard}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionItem}
                onPress={() => navigation.navigate(action.route)}
              >
                <View style={[styles.qaIconBg, { backgroundColor: action.color + '15' }]}>
                  <Icon name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.qaLabel} numberOfLines={1}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Activity */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ServiceRequests')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBlock}>
              <Text style={styles.recentEmptyText}>No recent activity yet.</Text>
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
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: '#20304C',
    zIndex: 10,
    elevation: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    flexShrink: 1,
    fontSize: 26,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  wave: {
    fontSize: 24,
    marginLeft: 6,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },

  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 20,
    marginBottom: 32,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '33.33%',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recentEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

export default Dashboard;
