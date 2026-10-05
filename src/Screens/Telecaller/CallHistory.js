import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  FlatList,
  Modal,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import {
  getTelecallerCallHistory,
  getTelecallerCallOptions,
  completeTelecallerFollowUp,
} from '../../Api/Telecaller/telecallerCallsApi';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getOutcomeStyle(outcome) {
  const o = String(outcome || '').toLowerCase();
  if (o.includes('connect') || o.includes('resolv')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (o.includes('callback') || o.includes('follow')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  if (o.includes('busy') || o.includes('no_answer') || o.includes('unreach')) return { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
  if (o.includes('not_interest') || o.includes('wrong')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function CallHistory({ route, navigation }) {
  const { customerId: initialCustomerId = null } = route?.params || {};

  const [calls, setCalls] = useState([]);
  const [outcome, setOutcome] = useState('all');
  const [purpose, setPurpose] = useState('all');
  const [partyType, setPartyType] = useState('all');
  const [followUpsOnly, setFollowUpsOnly] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerId, setCustomerId] = useState(initialCustomerId);

  // Available options
  const [options, setOptions] = useState({
    outcomes: [],
    purposes: [],
    partyTypes: [],
  });

  // Filter modal
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempOutcome, setTempOutcome] = useState('all');
  const [tempPurpose, setTempPurpose] = useState('all');
  const [tempPartyType, setTempPartyType] = useState('all');
  const [tempFollowUpsOnly, setTempFollowUpsOnly] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalCalls, setTotalCalls] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [completingId, setCompletingId] = useState(null);

  const activeFilterCount =
    (outcome !== 'all' ? 1 : 0) +
    (purpose !== 'all' ? 1 : 0) +
    (partyType !== 'all' ? 1 : 0) +
    (followUpsOnly ? 1 : 0) +
    (fromDate.trim() ? 1 : 0) +
    (toDate.trim() ? 1 : 0);

  // Load choices
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await getTelecallerCallOptions();
        setOptions(res);
      } catch (err) {
        console.warn('Error loading call options:', err);
      }
    }
    loadOptions();
  }, []);

  const fetchCalls = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      setError(null);

      const res = await getTelecallerCallHistory({
        outcome: outcome !== 'all' ? outcome : undefined,
        purpose: purpose !== 'all' ? purpose : undefined,
        party_type: partyType !== 'all' ? partyType : undefined,
        follow_ups: followUpsOnly ? true : undefined,
        customer_id: customerId || undefined,
        from: fromDate.trim() || undefined,
        to: toDate.trim() || undefined,
        page: pageNum,
      });

      if (pageNum === 1) {
        setCalls(res.calls || []);
      } else {
        setCalls(prev => [...prev, ...(res.calls || [])]);
      }

      setPage(res.meta?.currentPage || 1);
      setLastPage(res.meta?.lastPage || 1);
      setTotalCalls(res.meta?.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load call history');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [outcome, purpose, partyType, followUpsOnly, customerId, fromDate, toDate]);

  useEffect(() => {
    fetchCalls(1);
  }, [fetchCalls]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCalls(1, true);
  };

  const onEndReached = () => {
    if (!loading && !loadingMore && page < lastPage) {
      setLoadingMore(true);
      fetchCalls(page + 1);
    }
  };

  const handleCompleteFollowUp = async (callLogId) => {
    try {
      setCompletingId(callLogId);
      await completeTelecallerFollowUp(callLogId);
      Alert.alert('Follow-Up Completed', 'The scheduled callback has been marked as complete.');
      fetchCalls(1, true);
    } catch (err) {
      Alert.alert('Action Failed', err?.message || 'Could not complete follow up.');
    } finally {
      setCompletingId(null);
    }
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const openFilterModal = () => {
    setTempOutcome(outcome);
    setTempPurpose(purpose);
    setTempPartyType(partyType);
    setTempFollowUpsOnly(followUpsOnly);
    setTempFromDate(fromDate);
    setTempToDate(toDate);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setOutcome(tempOutcome);
    setPurpose(tempPurpose);
    setPartyType(tempPartyType);
    setFollowUpsOnly(tempFollowUpsOnly);
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempOutcome('all');
    setTempPurpose('all');
    setTempPartyType('all');
    setTempFollowUpsOnly(false);
    setTempFromDate('');
    setTempToDate('');
    setOutcome('all');
    setPurpose('all');
    setPartyType('all');
    setFollowUpsOnly(false);
    setFromDate('');
    setToDate('');
    setFilterModalVisible(false);
  };

  const outcomesList = options.outcomes.length > 0 ? options.outcomes : [
    { value: 'connected', label: 'Connected' },
    { value: 'no_answer', label: 'No Answer' },
    { value: 'busy', label: 'Busy' },
    { value: 'callback_requested', label: 'Callback Requested' },
    { value: 'wrong_number', label: 'Wrong Number' },
    { value: 'not_interested', label: 'Not Interested' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const purposesList = options.purposes.length > 0 ? options.purposes : [
    { value: 'general', label: 'General follow-up' },
    { value: 'customer_request', label: 'Customer request' },
    { value: 'onboarding', label: 'New sign-up' },
    { value: 'pending_payment', label: 'Pending payment' },
    { value: 'stuck_ticket', label: 'Stuck with vendor' },
    { value: 'feedback', label: 'Feedback call' },
    { value: 'renewal', label: 'Renewals due' },
  ];

  const renderCallItem = ({ item }) => {
    const outcomeStyle = getOutcomeStyle(item.outcome);
    const initials = (item.partyName || 'P').substring(0, 2).toUpperCase();

    return (
      <View style={styles.callCard}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.partyName} numberOfLines={1}>{item.partyName}</Text>
              <View style={styles.partyTypeBadge}>
                <Text style={styles.partyTypeText}>{item.partyType}</Text>
              </View>
            </View>

            {item.phone ? (
              <TouchableOpacity onPress={() => handleCall(item.phone)} style={styles.phoneRow}>
                <Icon name="phone" size={12} color="#059669" />
                <Text style={styles.phoneText}>{item.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={[styles.outcomeBadge, { backgroundColor: outcomeStyle.bg, borderColor: outcomeStyle.border }]}>
            <Text style={[styles.outcomeText, { color: outcomeStyle.text }]}>{item.outcomeLabel}</Text>
          </View>
        </View>

        {/* Ticket No, Purpose, Duration */}
        <View style={styles.metaChipsRow}>
          {item.ticketNumber ? (
            <TouchableOpacity
              style={styles.metaChip}
              activeOpacity={item.ticketId ? 0.7 : 1}
              onPress={() => item.ticketId && navigation.navigate('TicketDetail', { ticketId: item.ticketId, ticket: item.ticketNumber })}
            >
              <Icon name="confirmation-number" size={11} color="#475569" />
              <Text style={styles.metaChipText}>{item.ticketNumber}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{item.purposeLabel}</Text>
          </View>

          {item.durationMinutes > 0 && (
            <View style={styles.metaChip}>
              <Icon name="timer" size={12} color="#64748B" />
              <Text style={styles.metaChipText}>{item.durationMinutes} min</Text>
            </View>
          )}

          {item.createdAt && (
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          )}
        </View>

        {/* Notes */}
        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}

        {/* Follow-up Banner if scheduled */}
        {item.hasFollowUp && (
          <View style={[styles.followUpBanner, item.isFollowUpCompleted && styles.followUpBannerDone]}>
            <View style={{ flex: 1 }}>
              <View style={styles.followUpTitleRow}>
                <Icon
                  name={item.isFollowUpCompleted ? 'check-circle' : 'alarm'}
                  size={14}
                  color={item.isFollowUpCompleted ? '#059669' : '#D97706'}
                />
                <Text style={[styles.followUpTitle, item.isFollowUpCompleted && { color: '#059669' }]}>
                  {item.isFollowUpCompleted ? 'Callback Done' : 'Callback Scheduled'}
                </Text>
              </View>
              {item.followUpAt ? (
                <Text style={styles.followUpDateText}>Due: {formatDate(item.followUpAt)}</Text>
              ) : null}
              {item.followUpNote ? (
                <Text style={styles.followUpNoteText}>{item.followUpNote}</Text>
              ) : null}
            </View>

            {!item.isFollowUpCompleted && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => handleCompleteFollowUp(item.id)}
                disabled={completingId === item.id}
                activeOpacity={0.8}
              >
                {completingId === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.completeBtnText}>Mark Done</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Call History</Text>
          <TouchableOpacity onPress={openFilterModal} style={styles.filterHeaderBtn}>
            <Icon name="tune" size={20} color="#FFFFFF" />
            {activeFilterCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {totalCalls} logged calls in your history
        </Text>
      </View>

      {/* Active Filter Pills */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersRow}>
            {outcome !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Outcome: {outcome}</Text>
                <TouchableOpacity onPress={() => setOutcome('all')}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {purpose !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Purpose: {purpose}</Text>
                <TouchableOpacity onPress={() => setPurpose('all')}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {partyType !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Party: {partyType}</Text>
                <TouchableOpacity onPress={() => setPartyType('all')}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {followUpsOnly && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Open Follow-ups Only</Text>
                <TouchableOpacity onPress={() => setFollowUpsOnly(false)}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {fromDate.trim() !== '' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>From: {fromDate}</Text>
                <TouchableOpacity onPress={() => setFromDate('')}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {toDate.trim() !== '' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>To: {toDate}</Text>
                <TouchableOpacity onPress={() => setToDate('')}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={resetFilters} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* List */}
      <View style={styles.listContainer}>
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#EA580C" />
            <Text style={styles.loadingText}>Loading call history...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerEmpty}>
            <Icon name="error-outline" size={40} color="#DC2626" />
            <Text style={styles.errorTitle}>Could not load call history</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchCalls(1)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : calls.length === 0 ? (
          <View style={styles.centerEmpty}>
            <Icon name="phone-disabled" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No call logs found</Text>
            <Text style={styles.emptySubtitle}>Calls logged from the Call Centre will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={calls}
            keyExtractor={item => String(item.id)}
            renderItem={renderCallItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EA580C']} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#EA580C" style={{ marginVertical: 16 }} /> : null}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Call History</Text>
              <TouchableOpacity onPress={resetFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Follow-up toggle */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Follow-ups</Text>
                <TouchableOpacity
                  style={[styles.toggleChip, tempFollowUpsOnly && styles.toggleChipActive]}
                  onPress={() => setTempFollowUpsOnly(prev => !prev)}
                >
                  <Icon name="alarm" size={16} color={tempFollowUpsOnly ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.toggleChipText, tempFollowUpsOnly && styles.toggleChipTextActive]}>
                    Open Follow-ups Only
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Outcome */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Outcome</Text>
                <View style={styles.optionsWrap}>
                  <TouchableOpacity
                    style={[styles.optionPill, tempOutcome === 'all' && styles.optionPillActive]}
                    onPress={() => setTempOutcome('all')}
                  >
                    <Text style={[styles.optionPillText, tempOutcome === 'all' && styles.optionPillTextActive]}>
                      All Outcomes
                    </Text>
                  </TouchableOpacity>
                  {outcomesList.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionPill, tempOutcome === opt.value && styles.optionPillActive]}
                      onPress={() => setTempOutcome(opt.value)}
                    >
                      <Text style={[styles.optionPillText, tempOutcome === opt.value && styles.optionPillTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Purpose */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Purpose</Text>
                <View style={styles.optionsWrap}>
                  <TouchableOpacity
                    style={[styles.optionPill, tempPurpose === 'all' && styles.optionPillActive]}
                    onPress={() => setTempPurpose('all')}
                  >
                    <Text style={[styles.optionPillText, tempPurpose === 'all' && styles.optionPillTextActive]}>
                      All Purposes
                    </Text>
                  </TouchableOpacity>
                  {purposesList.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionPill, tempPurpose === opt.value && styles.optionPillActive]}
                      onPress={() => setTempPurpose(opt.value)}
                    >
                      <Text style={[styles.optionPillText, tempPurpose === opt.value && styles.optionPillTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Party Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Party Type</Text>
                <View style={styles.optionsWrap}>
                  {[
                    { id: 'all', label: 'All Types' },
                    { id: 'customer', label: 'Customer' },
                    { id: 'vendor', label: 'Vendor' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionPill, tempPartyType === opt.id && styles.optionPillActive]}
                      onPress={() => setTempPartyType(opt.id)}
                    >
                      <Text style={[styles.optionPillText, tempPartyType === opt.id && styles.optionPillTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range (IST Y-m-d) */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range (IST YYYY-MM-DD)</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    style={[styles.dateInput, { flex: 1 }]}
                    placeholder="From: YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={tempFromDate}
                    onChangeText={setTempFromDate}
                  />
                  <TextInput
                    style={[styles.dateInput, { flex: 1 }]}
                    placeholder="To: YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={tempToDate}
                    onChangeText={setTempToDate}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  filterHeaderBtn: {
    padding: 6,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EA580C',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },

  activeFiltersWrap: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  activeFiltersRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  activeFilterPillText: {
    fontSize: 11,
    color: '#20304C',
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '700',
  },

  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 12,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  centerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#EA580C',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Call Card
  callCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  partyTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  partyTypeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  outcomeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  metaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 'auto',
  },

  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },

  followUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
    marginTop: 2,
  },
  followUpBannerDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  followUpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  followUpTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  followUpDateText: {
    fontSize: 10,
    color: '#78350F',
    marginTop: 2,
  },
  followUpNoteText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  completeBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  resetText: {
    fontSize: 13,
    color: '#EA580C',
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: 14,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    alignSelf: 'flex-start',
  },
  toggleChipActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  toggleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toggleChipTextActive: {
    color: '#FFFFFF',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionPillActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  optionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  optionPillTextActive: {
    color: '#FFFFFF',
  },
  dateInput: {
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#0F172A',
  },
  applyBtn: {
    backgroundColor: '#20304C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CallHistory;
