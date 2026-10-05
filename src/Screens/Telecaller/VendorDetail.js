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
import { getTelecallerVendorDetail } from '../../Api/Telecaller/telecallerVendorsApi';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getJobStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complet') || s.includes('resolv')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('progress') || s.includes('active') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s.includes('cancel') || s.includes('reject')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
}

function VendorDetail({ route, navigation }) {
  const { vendorId, vendor: initialVendor } = route.params || {};

  const [vendor, setVendor] = useState(initialVendor || null);
  const [loading, setLoading] = useState(!initialVendor);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    if (!vendorId && !initialVendor?.id) return;
    const id = vendorId || initialVendor?.id;

    try {
      if (!isRefresh && !vendor) setLoading(true);
      setError(null);
      setErrorStatus(null);

      const res = await getTelecallerVendorDetail(id);
      setVendor(res);
    } catch (err) {
      setError(err?.message || 'Could not load vendor profile');
      if (err?.status === 403 || err?.response?.status === 403) {
        setErrorStatus(403);
      } else if (err?.status === 404 || err?.response?.status === 404) {
        setErrorStatus(404);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendorId, initialVendor, vendor]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail(true);
  };

  const handleCall = () => {
    if (!vendor?.phone) return;
    Linking.openURL(`tel:${vendor.phone}`).catch(() => {});
  };

  const handleEmail = () => {
    if (!vendor?.email) return;
    Linking.openURL(`mailto:${vendor.email}`).catch(() => {});
  };

  const initials = ((vendor?.businessName || vendor?.ownerName || 'V').substring(0, 2)).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {vendor?.businessName || 'Vendor Details'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loadingText}>Loading vendor details...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerEmpty}>
          <Icon
            name={errorStatus === 403 ? 'lock-outline' : errorStatus === 404 ? 'person-off' : 'error-outline'}
            size={48}
            color={errorStatus === 403 ? '#D97706' : '#DC2626'}
          />
          <Text style={styles.errorTitle}>
            {errorStatus === 403
              ? 'Access Restricted'
              : errorStatus === 404
              ? 'Vendor Not Found'
              : 'Could not load vendor'}
          </Text>
          <Text style={styles.errorSubtitle}>
            {errorStatus === 403
              ? "This vendor doesn't cover your assigned service area."
              : errorStatus === 404
              ? 'This vendor is not active or has been removed.'
              : error}
          </Text>
          {errorStatus !== 403 && errorStatus !== 404 && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetail()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : vendor ? (
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
                <Text style={styles.businessName}>{vendor.businessName}</Text>
                {vendor.ownerName ? (
                  <View style={styles.metaRow}>
                    <Icon name="person" size={14} color="#64748B" />
                    <Text style={styles.metaText}>{vendor.ownerName}</Text>
                  </View>
                ) : null}

                <View style={styles.badgeRow}>
                  {/* Availability badge */}
                  <View style={[styles.availBadge, vendor.isAvailable ? styles.availBadgeActive : styles.availBadgeInactive]}>
                    <View style={[styles.availDot, vendor.isAvailable ? styles.availDotActive : styles.availDotInactive]} />
                    <Text style={[styles.availText, vendor.isAvailable ? styles.availTextActive : styles.availTextInactive]}>
                      {vendor.isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>

                  {/* Rating badge */}
                  {vendor.rating > 0 ? (
                    <View style={styles.ratingBadge}>
                      <Icon name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText}>{vendor.rating.toFixed(1)}</Text>
                      {vendor.ratingCount > 0 && (
                        <Text style={styles.ratingCountText}>({vendor.ratingCount})</Text>
                      )}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Quick Contact Action Buttons */}
            <View style={styles.contactActionsRow}>
              {vendor.phone ? (
                <TouchableOpacity style={styles.actionBtnCall} onPress={handleCall} activeOpacity={0.8}>
                  <Icon name="phone" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnCallText}>Call {vendor.phone}</Text>
                </TouchableOpacity>
              ) : null}

              {vendor.email ? (
                <TouchableOpacity style={styles.actionBtnEmail} onPress={handleEmail} activeOpacity={0.8}>
                  <Icon name="email" size={16} color="#20304C" />
                  <Text style={styles.actionBtnEmailText}>Email</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>{vendor.totalJobs}</Text>
              <Text style={styles.metricLabel}>Total Jobs</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#2563EB' }]}>
                {vendor.currentJobs ? vendor.currentJobs.length : vendor.activeJobsCount}
              </Text>
              <Text style={styles.metricLabel}>Active Jobs</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#F59E0B' }]}>
                {vendor.rating > 0 ? vendor.rating.toFixed(1) : '—'}
              </Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>

          {/* Categories & Services */}
          {vendor.categories && vendor.categories.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Services & Categories</Text>
              <View style={styles.tagsWrap}>
                {vendor.categories.map((cat, idx) => (
                  <View key={String(cat.id || idx)} style={styles.catPill}>
                    <Icon name="check" size={12} color="#059669" />
                    <Text style={styles.catPillText}>{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Coverage Areas */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coverage & Location</Text>

            {vendor.statesCovered && vendor.statesCovered.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.subTitle}>States Covered</Text>
                <View style={styles.tagsWrap}>
                  {vendor.statesCovered.map((st, idx) => (
                    <View key={String(st || idx)} style={styles.geoPill}>
                      <Text style={styles.geoPillText}>{st}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {vendor.citiesCovered && vendor.citiesCovered.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.subTitle}>Cities Covered</Text>
                <View style={styles.tagsWrap}>
                  {vendor.citiesCovered.map((ct, idx) => (
                    <View key={String(ct || idx)} style={styles.geoPill}>
                      <Text style={styles.geoPillText}>{ct}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {vendor.address ? (
              <View style={styles.addressRow}>
                <Icon name="place" size={15} color="#64748B" />
                <Text style={styles.addressText}>
                  {vendor.address}{vendor.pincode ? ` - ${vendor.pincode}` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Current / Assigned Jobs */}
          {vendor.currentJobs && vendor.currentJobs.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Current Assigned Jobs</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{vendor.currentJobs.length}</Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                {vendor.currentJobs.map(job => {
                  const jobStatus = getJobStatusStyle(job.status);
                  return (
                    <TouchableOpacity
                      key={String(job.id)}
                      style={styles.jobItem}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: job.id, ticket: job.ticketNumber })}
                    >
                      <View style={styles.jobTopRow}>
                        <Text style={styles.jobTicketText}>{job.ticketNumber}</Text>
                        <View style={[styles.jobStatusPill, { backgroundColor: jobStatus.bg, borderColor: jobStatus.border }]}>
                          <Text style={[styles.jobStatusText, { color: jobStatus.text }]}>{job.statusLabel}</Text>
                        </View>
                      </View>

                      <Text style={styles.jobServiceName} numberOfLines={1}>{job.serviceName}</Text>

                      <View style={styles.jobMetaRow}>
                        <Icon name="person-outline" size={13} color="#64748B" />
                        <Text style={styles.jobMetaText}>{job.customerName}</Text>
                        {job.cityName ? (
                          <>
                            <Text style={styles.dot}>•</Text>
                            <Text style={styles.jobMetaText}>{job.cityName}</Text>
                          </>
                        ) : null}
                      </View>

                      {job.scheduledAt ? (
                        <View style={styles.jobDateRow}>
                          <Icon name="event" size={13} color="#94A3B8" />
                          <Text style={styles.jobDateText}>Scheduled: {formatDate(job.scheduledAt)}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Recent Calls */}
          {vendor.recentCalls && vendor.recentCalls.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Call Logs</Text>
              <View style={{ gap: 8 }}>
                {vendor.recentCalls.map(call => (
                  <View key={String(call.id)} style={styles.callLogItem}>
                    <View style={styles.callIconWrap}>
                      <Icon
                        name={call.direction === 'incoming' ? 'call-received' : 'call-made'}
                        size={16}
                        color={call.direction === 'incoming' ? '#059669' : '#2563EB'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.callHeaderRow}>
                        <Text style={styles.callTitleText}>{call.title}</Text>
                        {call.duration && <Text style={styles.callDurationText}>{call.duration}</Text>}
                      </View>
                      {call.note && <Text style={styles.callNoteText}>{call.note}</Text>}
                      {call.createdAt && <Text style={styles.callDateText}>{formatDate(call.createdAt)}</Text>}
                    </View>
                  </View>
                ))}
              </View>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 5,
  },
  availBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  availBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availDotActive: {
    backgroundColor: '#10B981',
  },
  availDotInactive: {
    backgroundColor: '#94A3B8',
  },
  availText: {
    fontSize: 10,
    fontWeight: '700',
  },
  availTextActive: {
    color: '#059669',
  },
  availTextInactive: {
    color: '#64748B',
  },

  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  ratingCountText: {
    fontSize: 10,
    color: '#92400E',
  },

  contactActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnCallText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnEmailText: {
    color: '#20304C',
    fontSize: 13,
    fontWeight: '600',
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
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

  // Tags & Pills
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  catPillText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  geoPill: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  geoPillText: {
    fontSize: 11,
    color: '#334155',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 17,
  },

  // Jobs
  jobItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTicketText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#20304C',
  },
  jobStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  jobStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  jobServiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  jobMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  dot: {
    color: '#94A3B8',
    fontSize: 11,
  },
  jobDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  jobDateText: {
    fontSize: 10,
    color: '#94A3B8',
  },

  // Calls
  callLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  callIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  callHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  callDurationText: {
    fontSize: 11,
    color: '#64748B',
  },
  callNoteText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  callDateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
  },
});

export default VendorDetail;
