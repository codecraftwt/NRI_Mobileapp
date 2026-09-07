import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMyTickets } from '../../Hooks/useMyTickets';
import { useDashboard } from '../../Hooks/useDashboard';
import { selectPendingTicketFinalizes, selectPendingBundleFinishes } from '../../Redux/slices/pendingRequestsSlice';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';

function fmtAmount(amount, currency) {
  if (amount == null) return '';
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount).toFixed(2)}`;
}

function joinNames(names) {
  if (!names) return 'your service request';
  return Array.isArray(names) ? names.join(', ') : String(names);
}

const TABS = ['All', 'New', 'Assigned', 'Completed'];

// Each tab maps to a backend `status` value so tickets are fetched
// server-side (across all pages), not client-filtered on the loaded page.
const STATUS_BY_TAB = {
  All: undefined,
  New: 'new',
  Assigned: 'assigned',
  Completed: 'completed',
};

function getStatusPill(statusLabel) {
  switch (statusLabel) {
    case 'Completed': return { bg: '#D1FAE5', text: '#059669', label: 'Completed' };
    case 'In Progress': return { bg: '#FFEDD5', text: '#C2410C', label: 'In Progress' };
    case 'Assigned': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Assigned' };
    case 'Cancelled': return { bg: '#FEE2E2', text: '#B91C1C', label: 'Cancelled' };
    case 'Overdue': return { bg: '#FEE2E2', text: '#DC2626', label: 'Overdue' };
    default: return { bg: '#F3F4F6', text: '#4B5563', label: statusLabel || 'Requested' };
  }
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function HorizontalProgressBar({ statusLabel }) {
  const steps = ['Requested', 'Assigned', 'In Progress', 'Completed'];
  let currentIndex = 0;
  if (statusLabel === 'Completed') currentIndex = 3;
  else if (statusLabel === 'In Progress') currentIndex = 2;
  else if (statusLabel === 'Assigned') currentIndex = 1;

  return (
    <View style={styles.progressBarContainer}>
      {steps.map((step, idx) => {
        const isActive = idx <= currentIndex;
        const isLast = idx === steps.length - 1;
        return (
          <View key={step} style={[styles.progressStep, isLast ? { flex: 0, width: 50 } : {}]}>
            <View style={styles.progressNodeRow}>
              <View style={[styles.progressNode, isActive && styles.progressNodeActive]}>
                {isActive && <Icon name="check" size={14} color="#FFF" />}
              </View>
              {!isLast && <View style={[styles.progressLine, idx < currentIndex && styles.progressLineActive]} />}
            </View>
            <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]} numberOfLines={1}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Requests({ navigation }) {
  const { tickets, meta, loading, loadingMore, failed, retry, fetchPage } = useMyTickets();
  const [activeTab, setActiveTab] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  // Every request that's been paid for but not yet finalized (who/where +
  // documents not yet submitted) has no ticket row server-side yet, so none
  // of them show up in `tickets` above — surface them here instead, and let
  // the customer jump straight back into finishing whichever one they pick.
  // A customer can have more than one at once (e.g. paid for a cart request,
  // then separately paid for a single-service request, without finishing
  // either), so this is a list, not a single item.
  const ticketFinalizes = useSelector(selectPendingTicketFinalizes);
  const bundleFinishes = useSelector(selectPendingBundleFinishes);
  // Refreshing the dashboard re-reconciles the pending lists above (see
  // useDashboard) — this is what surfaces a request paid for from another
  // device/session (e.g. the web app) that this device never saw locally.
  const { retry: retryDashboard } = useDashboard();
  const pendingFinishes = [
    ...ticketFinalizes.map(t => ({ type: 'ticket', key: `ticket-${t.paymentId}`, paymentId: t.paymentId, serviceNames: t.serviceNames, amount: t.amount, currency: t.currency })),
    ...bundleFinishes.map(b => ({ type: 'bundle', key: `bundle-${b.bundleId}`, bundleId: b.bundleId, serviceNames: b.serviceNames, amount: null, currency: null })),
  ];
  const handleFinishRequest = (item) => {
    navigation.navigate('FinishRequest', item.type === 'bundle'
      ? { mode: 'bundle', bundleId: item.bundleId }
      : { mode: 'ticket', paymentId: item.paymentId });
  };

  // Infinite scroll: pull the next page (appended by the slice) only when there
  // is one and nothing is already in flight — one API call per page, as needed.
  const loadMore = () => {
    if (loading || loadingMore || refreshing) return;
    if (meta.currentPage >= meta.lastPage) return;
    fetchPage(meta.currentPage + 1, STATUS_BY_TAB[activeTab]);
  };

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 240) loadMore();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retry(STATUS_BY_TAB[activeTab]), retryDashboard()]);
    setRefreshing(false);
  };

  // Refetch whenever the screen regains focus or the active tab changes, always
  // with the current tab's status filter. `retry` is a fresh reference each
  // render (not memoized by the hook), so it's intentionally kept out of deps
  // to avoid an infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry(STATUS_BY_TAB[activeTab]);
      retryDashboard();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])
  );

  // Server already filters by status; this is a defensive fallback in case the
  // backend ignores the param for a given tab.
  const filteredTickets = activeTab === 'All'
    ? tickets
    : tickets.filter(t => t.status === STATUS_BY_TAB[activeTab]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Requests</Text>
      </View>

      {(tickets.length > 0 || activeTab !== 'All') && (
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {TABS.map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, tickets.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D94625']} tintColor="#D94625" />}
      >
        {pendingFinishes.map(item => (
          <TouchableOpacity key={item.key} style={styles.finishBanner} activeOpacity={0.8} onPress={() => handleFinishRequest(item)}>
            <Icon name="error-outline" size={18} color="#B45309" />
            <Text style={styles.finishBannerText} numberOfLines={2}>
              <Text style={styles.finishBannerBold}>Finish your service request</Text> — {joinNames(item.serviceNames)}
              {item.amount != null ? ` (paid ${fmtAmount(item.amount, item.currency)})` : ''}.
              {' '}A few more details are needed before it's sent to our team.
            </Text>
            <Text style={styles.finishBannerAction}>Finish Request</Text>
          </TouchableOpacity>
        ))}

        {loading && tickets.length === 0 && (
          <View style={[styles.loadingBox, { flex: 1, justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color="#D94625" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        )}

        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Failed to load. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!loading && !failed && filteredTickets.length === 0 && (
          <View style={[styles.emptyState, tickets.length === 0 && { flex: 1, justifyContent: 'center' }]}>
            <Icon name="receipt" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Requests Found</Text>
            <Text style={styles.emptyText}>You do not have any requests here.</Text>
          </View>
        )}

        {filteredTickets.map((ticket) => {
          // Verified live via GET /customer/tickets/5: a "New" ticket can
          // already have a past sla_deadline, so overdue applies from
          // creation, not just once work starts — exclude only the terminal
          // statuses where a missed SLA is no longer relevant.
          const overdue = isOverdue(ticket.slaDeadline) && !['Completed', 'Cancelled'].includes(ticket.statusLabel);
          const statusPill = getStatusPill(overdue ? 'Overdue' : ticket.statusLabel);

          return (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.ticketService} numberOfLines={1}>{ticket.serviceName}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusPill.text }]}>{statusPill.label}</Text>
                </View>
              </View>

              <Text style={styles.ticketSub}>{ticket.ticketNumber} · {ticket.location?.city || 'India'}</Text>

              <HorizontalProgressBar statusLabel={ticket.statusLabel} />

              <View style={styles.cardFooter}>
                <View style={styles.vendorRow}>
                  <View style={styles.vendorInitial}>
                    <Text style={styles.vendorInitialText}>{ticket.vendorName ? ticket.vendorName.substring(0, 2).toUpperCase() : 'NA'}</Text>
                  </View>
                  <Text style={styles.vendorName}>{ticket.vendorName || 'Pending Assignment'}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Icon name="schedule" size={14} color="#94A3B8" />
                  <Text style={styles.timeText}>Recently</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {loadingMore && (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color="#D94625" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: STATUS_BAR_HEIGHT, paddingBottom: 15, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  finishBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 16, paddingVertical: 14 },
  finishBannerText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: '#92400E' },
  finishBannerBold: { fontFamily: typography.h4.fontFamily },
  finishBannerAction: { fontSize: 12.5, fontFamily: typography.h4.fontFamily, color: '#B45309', textDecorationLine: 'underline' },
  tabsContainer: { paddingTop: 20, paddingBottom: 12 },
  tabsScroll: { paddingHorizontal: 20, gap: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 12, gap: 16 },
  
  ticketCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 12 },
  ticketService: { fontSize: 17, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  ticketSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  
  progressBarContainer: { flexDirection: 'row', marginBottom: 24, marginHorizontal: 12 },
  progressStep: { flex: 1 },
  progressNodeRow: { flexDirection: 'row', alignItems: 'center' },
  progressNode: { 
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', 
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', zIndex: 2 
  },
  progressNodeActive: { borderColor: '#D94625', backgroundColor: '#D94625' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginLeft: -2, marginRight: -2, zIndex: 1 },
  progressLineActive: { backgroundColor: '#D94625' },
  progressLabel: { fontSize: 10, color: '#94A3B8', marginTop: 8, position: 'absolute', top: 24, left: -16, width: 60, textAlign: 'center' },
  progressLabelActive: { color: '#0F172A', fontWeight: '600' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vendorInitial: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center' },
  vendorInitialText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  vendorName: { fontSize: 14, color: '#475569' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: '#94A3B8' },

  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#94A3B8' },
  retryBox: { paddingVertical: 40, alignItems: 'center' },
  retryText: { fontSize: 14, color: '#EF4444' },
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B' },
  
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});

export default Requests;
