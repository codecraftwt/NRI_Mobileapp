import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { getTelecallerCustomerDetail } from '../../Api/Telecaller/telecallerCustomersApi';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getMembershipBadge(status, hasActive) {
  if (hasActive || status === 'active') {
    return { label: 'Active Member', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  }
  if (status === 'pending') {
    return { label: 'Pending', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  }
  if (status === 'expired') {
    return { label: 'Expired', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  }
  if (status === 'cancelled') {
    return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  }
  return { label: 'No Membership', bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
}

const TABS = [
  { id: 'calls', label: 'Call History', icon: 'phone-in-talk' },
  { id: 'requests', label: 'Requests', icon: 'confirmation-number' },
  { id: 'properties', label: 'Properties', icon: 'home-work' },
  { id: 'family', label: 'Family', icon: 'family-restroom' },
];

function CustomerDetail({ route, navigation }) {
  const { customerId, customer: initialCustomer } = route.params || {};

  const [customer, setCustomer] = useState(initialCustomer || null);
  const [activeTab, setActiveTab] = useState('calls');
  const [loading, setLoading] = useState(!initialCustomer);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    const id = customerId || initialCustomer?.id;
    if (!id) return;

    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      setErrorStatus(null);

      const res = await getTelecallerCustomerDetail(id);
      setCustomer(res);
    } catch (err) {
      setError(err?.message || 'Could not load customer profile');
      if (err?.status === 403 || err?.response?.status === 403) {
        setErrorStatus(403);
      } else if (err?.status === 404 || err?.response?.status === 404) {
        setErrorStatus(404);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, initialCustomer?.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail(true);
  };

  const handleCall = () => {
    if (!customer?.phone) return;
    Linking.openURL(`tel:${customer.phone}`).catch(() => {});
  };

  const handleEmail = () => {
    if (!customer?.email) return;
    Linking.openURL(`mailto:${customer.email}`).catch(() => {});
  };

  const handleWhatsApp = () => {
    if (!customer?.phone) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {});
  };

  const initials = ((customer?.name || 'C').substring(0, 2)).toUpperCase();
  const membershipBadge = getMembershipBadge(customer?.membershipStatus, customer?.hasActiveMembership);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20304C" barStyle="light-content" translucent />

      {/* Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {customer?.name || 'Customer Details'}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loadingText}>Loading customer details...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerEmpty}>
          <Icon
            name={errorStatus === 403 ? 'lock-outline' : 'error-outline'}
            size={48}
            color={errorStatus === 403 ? '#D97706' : '#DC2626'}
          />
          <Text style={styles.errorTitle}>
            {errorStatus === 403 ? 'Outside Assigned Area' : 'Could not load customer'}
          </Text>
          <Text style={styles.errorSubtitle}>
            {errorStatus === 403
              ? 'This customer is outside your assigned telecaller area.'
              : error}
          </Text>
          {errorStatus !== 403 && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetail()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : customer ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
        >
          {/* Profile Overview Card */}
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  {customer.isMine && (
                    <View style={styles.mineBadge}>
                      <Icon name="verified-user" size={12} color="#2563EB" />
                      <Text style={styles.mineBadgeText}>My Customer</Text>
                    </View>
                  )}
                </View>

                {customer.email ? (
                  <View style={styles.metaRow}>
                    <Icon name="email" size={13} color="#64748B" />
                    <Text style={styles.metaText}>{customer.email}</Text>
                  </View>
                ) : null}

                {customer.phone ? (
                  <View style={styles.metaRow}>
                    <Icon name="phone" size={13} color="#64748B" />
                    <Text style={styles.metaText}>{customer.phone}</Text>
                  </View>
                ) : null}

                {/* Location & NRI Status */}
                <View style={styles.metaRow}>
                  <Icon name="location-on" size={13} color="#64748B" />
                  <Text style={styles.metaText}>
                    {[customer.city, customer.state, customer.nriCountry || customer.country].filter(Boolean).join(', ') || 'India'}
                  </Text>
                </View>

                {/* Membership Badge */}
                <View style={styles.badgeRow}>
                  <View style={[styles.membershipBadge, { backgroundColor: membershipBadge.bg, borderColor: membershipBadge.border }]}>
                    <Text style={[styles.membershipBadgeText, { color: membershipBadge.text }]}>
                      {membershipBadge.label}
                    </Text>
                  </View>
                  {customer.membershipPlan && (
                    <Text style={styles.planNameText}>• {customer.membershipPlan}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#2563EB' }]}>{customer.requestsCount}</Text>
              <Text style={styles.metricLabel}>Requests</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#059669' }]}>{customer.propertiesCount}</Text>
              <Text style={styles.metricLabel}>Properties</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#D97706' }]}>{customer.familyCount}</Text>
              <Text style={styles.metricLabel}>Family</Text>
            </View>
          </View>

          {/* Section Selector Tabs */}
          <View style={styles.sectionTabsWrap}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              let count = null;
              if (tab.id === 'calls') count = customer.callLogs?.length || 0;
              if (tab.id === 'requests') count = customer.requests?.length || customer.requestsCount;
              if (tab.id === 'properties') count = customer.properties?.length || customer.propertiesCount;
              if (tab.id === 'family') count = customer.familyMembers?.length || customer.familyCount;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.sectionTabPill, isActive && styles.sectionTabPillActive]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={tab.icon}
                    size={14}
                    color={isActive ? '#FFFFFF' : '#64748B'}
                  />
                  <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>
                    {tab.label}
                  </Text>
                  {count != null && count > 0 && (
                    <View style={[styles.tabCountBadge, isActive && styles.tabCountBadgeActive]}>
                      <Text style={[styles.tabCountBadgeText, isActive && styles.tabCountBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TAB 1: CALL HISTORY / LOGS */}
          {activeTab === 'calls' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Latest Call Logs (Staff Timeline)</Text>

              {customer.callLogs && customer.callLogs.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {customer.callLogs.map((call, idx) => (
                    <View key={String(call.id || idx)} style={styles.timelineItem}>
                      <View style={styles.timelineIcon}>
                        <Icon
                          name={call.direction === 'incoming' ? 'call-received' : 'call-made'}
                          size={15}
                          color={call.direction === 'incoming' ? '#059669' : '#2563EB'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.timelineTopRow}>
                          <Text style={styles.timelineCallerText}>{call.telecallerName}</Text>
                          {call.duration && (
                            <Text style={styles.timelineDurationText}>{call.duration}</Text>
                          )}
                        </View>
                        {call.title ? <Text style={styles.timelineTitleText}>{call.title}</Text> : null}
                        {call.note ? <Text style={styles.timelineNoteText}>{call.note}</Text> : null}
                        {call.createdAt && (
                          <Text style={styles.timelineDateText}>{formatDate(call.createdAt)}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.tabEmptyState}>
                  <Icon name="phone-disabled" size={32} color="#CBD5E1" />
                  <Text style={styles.tabEmptyText}>No recorded calls with this customer yet</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: SERVICE REQUESTS */}
          {activeTab === 'requests' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Service Requests History</Text>

              {customer.requests && customer.requests.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {customer.requests.map(req => (
                    <TouchableOpacity
                      key={String(req.id)}
                      style={styles.requestItem}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: req.id, ticket: req.ticketNumber })}
                    >
                      <View style={styles.reqTopRow}>
                        <Text style={styles.reqTicketText}>{req.ticketNumber}</Text>
                        <View style={styles.reqStatusPill}>
                          <Text style={styles.reqStatusText}>{req.statusLabel}</Text>
                        </View>
                      </View>

                      <Text style={styles.reqServiceName}>{req.serviceName}</Text>

                      <View style={styles.reqFooterRow}>
                        {req.customerPrice > 0 && (
                          <Text style={styles.reqPriceText}>₹{req.customerPrice.toLocaleString('en-IN')}</Text>
                        )}
                        {req.createdAt && (
                          <Text style={styles.reqDateText}>{formatDate(req.createdAt)}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.tabEmptyState}>
                  <Icon name="confirmation-number" size={32} color="#CBD5E1" />
                  <Text style={styles.tabEmptyText}>No service requests found for this customer</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: PROPERTIES */}
          {activeTab === 'properties' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Customer Properties</Text>

              {customer.properties && customer.properties.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {customer.properties.map((prop, idx) => (
                    <View key={String(prop.id || idx)} style={styles.propertyItem}>
                      <View style={styles.propIconWrap}>
                        <Icon name="apartment" size={18} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.propTitleText}>{prop.title}</Text>
                        <Text style={styles.propTypeText}>{prop.type}</Text>
                        {prop.address ? <Text style={styles.propAddressText}>{prop.address}</Text> : null}
                        {(prop.city || prop.state) && (
                          <Text style={styles.propLocText}>
                            {[prop.city, prop.state, prop.pincode].filter(Boolean).join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.tabEmptyState}>
                  <Icon name="home" size={32} color="#CBD5E1" />
                  <Text style={styles.tabEmptyText}>No properties added by this customer</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 4: FAMILY MEMBERS */}
          {activeTab === 'family' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Family Members</Text>

              {customer.familyMembers && customer.familyMembers.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {customer.familyMembers.map((fam, idx) => (
                    <View key={String(fam.id || idx)} style={styles.familyItem}>
                      <View style={styles.famIconWrap}>
                        <Icon name="person" size={18} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.famNameRow}>
                          <Text style={styles.famNameText}>{fam.name}</Text>
                          <View style={styles.famRelBadge}>
                            <Text style={styles.famRelText}>{fam.relation}</Text>
                          </View>
                        </View>
                        {fam.phone ? (
                          <TouchableOpacity onPress={() => Linking.openURL(`tel:${fam.phone}`)}>
                            <Text style={styles.famPhoneText}>📞 {fam.phone}</Text>
                          </TouchableOpacity>
                        ) : null}
                        {fam.email ? <Text style={styles.famEmailText}>✉️ {fam.email}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.tabEmptyState}>
                  <Icon name="group" size={32} color="#CBD5E1" />
                  <Text style={styles.tabEmptyText}>No family members linked</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 14,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightPlaceholder: {
    width: 36,
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
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#A64416',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  mineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  membershipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  membershipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  planNameText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Tabs
  sectionTabsWrap: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  sectionTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  sectionTabPillActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
  },
  tabCountBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  tabCountBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Timeline (Calls)
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCallerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineDurationText: {
    fontSize: 11,
    color: '#64748B',
  },
  timelineTitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  timelineNoteText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  timelineDateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Requests
  requestItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqTicketText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#20304C',
  },
  reqStatusPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reqStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  reqServiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  reqFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  reqPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  reqDateText: {
    fontSize: 10,
    color: '#94A3B8',
  },

  // Properties
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  propIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  propTypeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  propAddressText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  propLocText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Family
  familyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  famIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  famNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  famNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  famRelBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  famRelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  famPhoneText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  famEmailText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  tabEmptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  tabEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

export default CustomerDetail;
