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
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import {
  getTelecallerCallQueues,
  getTelecallerCallOptions,
} from '../../Api/Telecaller/telecallerCallsApi';

function getQueueIcon(key) {
  const k = String(key || '').toLowerCase();
  if (k.includes('request')) return 'phone-callback';
  if (k.includes('callback') || k.includes('follow')) return 'access-alarm';
  if (k.includes('signup') || k.includes('onboard')) return 'person-add';
  if (k.includes('payment')) return 'credit-card';
  if (k.includes('stuck') || k.includes('vendor')) return 'hourglass-empty';
  if (k.includes('feedback')) return 'star-outline';
  if (k.includes('renewal')) return 'sync';
  return 'headset-mic';
}

function getBadgeColor(key, count) {
  if (!count) return { bg: '#F1F5F9', text: '#94A3B8' };
  const k = String(key || '').toLowerCase();
  if (k.includes('request')) return { bg: '#D1FAE5', text: '#059669' };
  if (k.includes('stuck')) return { bg: '#FEE2E2', text: '#DC2626' };
  if (k.includes('payment')) return { bg: '#FEF3C7', text: '#D97706' };
  if (k.includes('signup') || k.includes('onboard')) return { bg: '#DBEAFE', text: '#2563EB' };
  if (k.includes('feedback')) return { bg: '#DCFCE7', text: '#16A34A' };
  return { bg: '#EFF6FF', text: '#3B82F6' };
}

function CallCentre({ navigation }) {
  // Main Data
  const [queues, setQueues] = useState([]);
  const [stats, setStats] = useState({ totalCalls: 0, connectedCalls: 0, talkTimeMinutes: 0, callbacksDue: 0 });
  const [totalItems, setTotalItems] = useState(0);
  const [selectedQueueKey, setSelectedQueueKey] = useState(null);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [queuesRes, optionsRes] = await Promise.all([
        getTelecallerCallQueues(),
        getTelecallerCallOptions().catch(() => ({ outcomes: [], purposes: [], partyTypes: [], directions: [] })),
      ]);

      setQueues(queuesRes.queues || []);
      setStats(queuesRes.stats || { totalCalls: 0, connectedCalls: 0, talkTimeMinutes: 0, callbacksDue: 0 });
      setTotalItems(queuesRes.totalItems || 0);
      setCallOptions(optionsRes);

      if (!selectedQueueKey && queuesRes.queues && queuesRes.queues.length > 0) {
        // Pick first queue with items, or first queue
        const firstWithItems = queuesRes.queues.find(q => q.count > 0);
        setSelectedQueueKey(firstWithItems ? firstWithItems.key : queuesRes.queues[0].key);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load call queues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedQueueKey]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const selectedQueue = queues.find(q => q.key === selectedQueueKey) || queues[0];

  const handleOpenLogModal = (item = null) => {
    navigation.navigate('LogCall', {
      initialPartyType: item?.partyType || 'customer',
      initialPartyName: item?.partyName || '',
      initialPhone: item?.phone || '',
      initialPurpose: item?.purpose || 'general',
      initialCustomerId: item?.customerId || null,
      initialVendorId: item?.vendorId || null,
      initialTicketId: item?.ticketId || null,
      initialQueueKey: item?.queueKey || selectedQueueKey || null,
      initialFollowUpOf: item?.followUpOf || null,
    });
  };

  const handleCall = (phoneNumber, item = null) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
    if (item) {
      handleOpenLogModal(item);
    }
  };

  const handleSubmitCallLog = async () => {
    if (!phone && !partyName) {
      Alert.alert('Validation Error', 'Please provide a party name or phone number.');
      return;
    }
    if (outcome === 'callback_requested' && !followUpAt) {
      Alert.alert('Validation Error', 'Please provide a follow-up date and time for callback.');
      return;
    }

    try {
      setSubmittingCall(true);
      await logTelecallerCall({
        party_type: partyType,
        party_name: partyName,
        phone: phone,
        direction: direction,
        purpose: purpose,
        outcome: outcome,
        duration_minutes: Number(durationMinutes || 0),
        notes: callNotes,
        follow_up_at: followUpAt.trim() || null,
        follow_up_note: followUpNote.trim() || '',
        customer_id: customerId,
        vendor_id: vendorId,
        ticket_id: ticketId,
        queue_key: queueKey,
        follow_up_of: followUpOf,
      });

      setLogModalVisible(false);
      Alert.alert('Call Logged', 'Call has been successfully logged and saved to history.');
      fetchData(true);
    } catch (err) {
      Alert.alert('Logging Failed', err?.message || 'Could not log call.');
    } finally {
      setSubmittingCall(false);
    }
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
          <Text style={styles.headerTitle}>Call Centre</Text>
          <TouchableOpacity
            style={styles.historyTopBtn}
            onPress={() => navigation.navigate('CallHistory')}
            activeOpacity={0.8}
          >
            <Icon name="history" size={18} color="#FFFFFF" />
            <Text style={styles.historyTopBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.waitingTitle}>{totalItems} people waiting for a call</Text>
            <Text style={styles.waitingSub}>
              Work through the queues below — every call is recorded in history.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logCallHeaderBtn}
            onPress={() => handleOpenLogModal()}
            activeOpacity={0.85}
          >
            <Icon name="add" size={16} color="#FFFFFF" />
            <Text style={styles.logCallHeaderBtnText}>Log Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading call centre queues...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerEmpty}>
          <Icon name="error-outline" size={44} color="#DC2626" />
          <Text style={styles.errorTitle}>Could not load Call Centre</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EA580C']} />}
        >
          {/* 4 Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="call" size={18} color="#2563EB" />
              </View>
              <Text style={styles.statNum}>{stats.totalCalls}</Text>
              <Text style={styles.statLabel}>Calls Today</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="phone-in-talk" size={18} color="#059669" />
              </View>
              <Text style={[styles.statNum, { color: '#059669' }]}>{stats.connectedCalls}</Text>
              <Text style={styles.statLabel}>Connected</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#F5F3FF' }]}>
                <Icon name="timer" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.statNum}>{stats.talkTimeMinutes} min</Text>
              <Text style={styles.statLabel}>Talk Time</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="alarm" size={18} color="#EA580C" />
              </View>
              <Text style={[styles.statNum, { color: stats.callbacksDue > 0 ? '#EA580C' : '#0F172A' }]}>
                {stats.callbacksDue}
              </Text>
              <Text style={styles.statLabel}>Callbacks Due</Text>
            </View>
          </View>

          {/* Queue Selection Pills (Horizontal Scroll) */}
          <View style={styles.queueHeaderSection}>
            <Text style={styles.sectionHeaderTitle}>CALL QUEUES</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queuesScroll}>
            {queues.map(q => {
              const isSelected = selectedQueueKey === q.key;
              const badge = getBadgeColor(q.key, q.count);
              const iconName = getQueueIcon(q.key);

              return (
                <TouchableOpacity
                  key={q.key}
                  style={[styles.queuePill, isSelected && styles.queuePillActive]}
                  onPress={() => setSelectedQueueKey(q.key)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={iconName}
                    size={16}
                    color={isSelected ? '#059669' : '#64748B'}
                  />
                  <Text style={[styles.queuePillText, isSelected && styles.queuePillTextActive]}>
                    {q.label}
                  </Text>
                  <View style={[styles.queueCountBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.queueCountText, { color: badge.text }]}>
                      {q.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Queue Panel */}
          {selectedQueue && (
            <View style={styles.queueContainer}>
              {/* Queue Header Banner */}
              <View style={styles.queueBanner}>
                <View style={styles.queueBannerIconWrap}>
                  <Icon name={getQueueIcon(selectedQueue.key)} size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueBannerTitle}>{selectedQueue.label}</Text>
                  {selectedQueue.description ? (
                    <Text style={styles.queueBannerDesc}>{selectedQueue.description}</Text>
                  ) : null}
                </View>
                <View style={styles.queueBannerCount}>
                  <Text style={styles.queueBannerCountNum}>{selectedQueue.count}</Text>
                  <Text style={styles.queueBannerCountSub}>to call</Text>
                </View>
              </View>

              {/* Items List */}
              {selectedQueue.items && selectedQueue.items.length > 0 ? (
                <View style={styles.itemsList}>
                  {selectedQueue.items.map((item, idx) => {
                    const initials = (item.partyName || 'C').substring(0, 2).toUpperCase();

                    return (
                      <View key={String(item.id || idx)} style={styles.itemCard}>
                        {/* Top Info Row */}
                        <View style={styles.itemHeader}>
                          <View style={styles.itemAvatar}>
                            <Text style={styles.itemAvatarText}>{initials}</Text>
                          </View>

                          <View style={styles.itemInfo}>
                            <View style={styles.itemTitleRow}>
                              <Text style={styles.itemPartyName} numberOfLines={1}>
                                {item.partyName}
                              </Text>
                              <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>
                                  {item.partyType === 'vendor' ? 'Vendor' : 'Customer'}
                                </Text>
                              </View>
                              {item.isOverdue && (
                                <View style={styles.overdueBadge}>
                                  <Icon name="access-time" size={10} color="#DC2626" />
                                  <Text style={styles.overdueBadgeText}>Overdue</Text>
                                </View>
                              )}
                            </View>

                            {/* Topic / Purpose / Preferred Time */}
                            {item.topicLabel ? (
                              <Text style={styles.itemTopicText} numberOfLines={2}>
                                {item.topicLabel}
                                {item.preferredTime ? ` • prefers ${item.preferredTime}` : ''}
                              </Text>
                            ) : null}

                            {/* Requested Time */}
                            {(item.timeAgo || item.requestedAt) && (
                              <View style={styles.itemTimeRow}>
                                <Icon name="schedule" size={12} color="#DC2626" />
                                <Text style={styles.itemTimeText}>
                                  {item.timeAgo || `Requested on ${item.requestedAt}`}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Bottom Actions Row */}
                        <View style={styles.itemActions}>
                          {item.phone ? (
                            <TouchableOpacity
                              style={styles.itemCallBtn}
                              onPress={() => handleCall(item.phone, item)}
                              activeOpacity={0.8}
                            >
                              <Icon name="call" size={14} color="#059669" />
                              <Text style={styles.itemCallBtnText}>{item.phone}</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ flex: 1 }} />
                          )}

                          <TouchableOpacity
                            style={styles.itemLogBtn}
                            onPress={() => handleOpenLogModal(item)}
                            activeOpacity={0.8}
                          >
                            <Icon name="post-add" size={15} color="#FFFFFF" />
                            <Text style={styles.itemLogBtnText}>Log Call</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyQueueBox}>
                  <Icon name="check-circle" size={40} color="#10B981" />
                  <Text style={styles.emptyQueueTitle}>All caught up!</Text>
                  <Text style={styles.emptyQueueSub}>There are no pending items in this queue.</Text>
                </View>
              )}
            </View>
          )}

          {/* Footnote */}
          <View style={styles.footnoteBox}>
            <Icon name="info-outline" size={15} color="#64748B" />
            <Text style={styles.footnoteText}>
              Items leave a queue for a while once you log a call with them, and for good once the call closes them out (e.g. a connected feedback call, or "not interested").
            </Text>
          </View>
        </ScrollView>
      )}
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
    marginBottom: 12,
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
  historyTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  historyTopBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  waitingSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  logCallHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  logCallHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 14,
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
    marginTop: 6,
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

  // 4 Stats Cards Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },

  // Queues Pills
  queueHeaderSection: {
    marginTop: 6,
    marginBottom: -4,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  queuesScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  queuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  queuePillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  queuePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  queuePillTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  queueCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  queueCountText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Queue Panel
  queueContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    gap: 10,
  },
  queueBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  queueBannerDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  queueBannerCount: {
    alignItems: 'center',
  },
  queueBannerCountNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  queueBannerCountSub: {
    fontSize: 10,
    color: '#047857',
  },

  itemsList: {
    padding: 12,
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemPartyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  itemTopicText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
    lineHeight: 16,
  },
  itemTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemTimeText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
  },

  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  itemCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  itemCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  itemLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  itemLogBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  emptyQueueBox: {
    padding: 30,
    alignItems: 'center',
    gap: 6,
  },
  emptyQueueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  emptyQueueSub: {
    fontSize: 12,
    color: '#64748B',
  },

  footnoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footnoteText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 16,
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
    maxHeight: '85%',
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
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  formSection: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  modalInput: {
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  modalTextArea: {
    height: 70,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  choiceChipActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  choiceChipTextActive: {
    color: '#FFFFFF',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choicePill: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  choicePillActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  choicePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
  },
  followUpBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
    marginBottom: 8,
  },
  followUpBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 8,
  },
  modalSubmitBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CallCentre;
