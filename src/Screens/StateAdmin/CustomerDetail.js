import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { getStateAdminCustomerDetail } from '../../Api/StateAdmin/stateAdminCustomersApi';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function membershipBadge(status, hasActive) {
  if (hasActive || status === 'active') {
    return { label: 'Active', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
  }
  if (status === 'pending') {
    return { label: 'Pending', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
  }
  if (status === 'expired') {
    return { label: 'Expired', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
  }
  return { label: 'No Membership', bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

function getRequestStatusMeta(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complet') || s.includes('resolv')) {
    return { label: 'Completed', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  }
  if (s.includes('progress')) {
    return { label: 'In Progress', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  }
  if (s.includes('assign')) {
    return { label: 'Assigned', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
  }
  if (s.includes('escalat')) {
    return { label: 'Escalated', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  }
  if (s.includes('cancel')) {
    return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  }
  return { label: titleCase(status || 'Open'), bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function CustomerDetail({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { customerId: paramId, customer: initialCustomer } = route.params || {};
  const customerId =
    paramId ||
    initialCustomer?.customerId ||
    initialCustomer?.customer_id ||
    initialCustomer?.raw?.customer_id ||
    initialCustomer?.raw?.customer?.id ||
    initialCustomer?.id;

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async (isRefresh = false) => {
    if (!customerId) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getStateAdminCustomerDetail(customerId);
      setCustomer(data);
    } catch (err) {
      setError(err?.message || 'Could not load customer details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    setCustomer(null);
    setLoading(true);
    setError(null);
    fetchDetails(false);
  }, [customerId, fetchDetails]);

  if (!customerId) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customer Details</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>
        </View>
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#CBD5E1" />
          <Text style={styles.errorTitle}>Customer Not Found</Text>
        </View>
      </View>
    );
  }

  const badge = membershipBadge(customer?.membershipStatus, customer?.hasActiveMembership);
  const initials = (customer?.name || 'C').substring(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Customer Details
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      {loading && !customer ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20304C" />
          <Text style={styles.loadingText}>Loading customer details...</Text>
        </View>
      ) : error && !customer ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Could not load customer</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetails(false)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDetails(true)}
              colors={['#20304C']}
              tintColor="#20304C"
            />
          }
        >
          {/* Profile Hero Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.customerName} numberOfLines={2}>
                  {customer.name}
                </Text>
                {!!customer.email && (
                  <View style={styles.metaRow}>
                    <Icon name="email" size={13} color="#64748B" />
                    <Text style={styles.metaRowText} numberOfLines={1}>
                      {customer.email}
                    </Text>
                  </View>
                )}
                {!!customer.phone && (
                  <View style={styles.metaRow}>
                    <Icon name="phone" size={13} color="#64748B" />
                    <Text style={styles.metaRowText} numberOfLines={1}>
                      {customer.phone}
                    </Text>
                  </View>
                )}
                <View style={styles.badgeRow}>
                  <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  {!!customer.location && (
                    <View style={styles.locationPill}>
                      <Icon name="location-on" size={12} color="#475569" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {customer.location}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.paymentsBtn}
              onPress={() => navigation.navigate('CustomerPayments', { customerId, customerName: customer.name })}
            >
              <Icon name="receipt-long" size={16} color="#20304C" />
              <Text style={styles.paymentsBtnText}>Payment History</Text>
              <Icon name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, styles.bgGreen]}>
                <Icon name="card-membership" size={18} color="#059669" />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>
                {customer.plan || (customer.hasActiveMembership ? 'Active' : 'No Plan')}
              </Text>
              <Text style={styles.statLabel}>Membership</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBg, styles.bgBlue]}>
                <Icon name="people" size={18} color="#2563EB" />
              </View>
              <Text style={styles.statValue}>{customer.familyMembersCount ?? customer.familyMembers?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Family</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBg, styles.bgPurple]}>
                <Icon name="home" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.statValue}>{customer.propertiesCount ?? customer.properties?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
          </View>

          {/* Membership & Subscription Details */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="verified-user" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Membership Details</Text>
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Membership Status</Text>
                <View style={[styles.inlineBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.inlineBadgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Active Membership</Text>
                <Text style={[styles.infoValue, customer.hasActiveMembership ? styles.textGreen : styles.textMuted]}>
                  {customer.hasActiveMembership ? 'Yes' : 'No'}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Plan Name</Text>
                <Text style={styles.infoValue}>{customer.plan || 'No Active Plan'}</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expires On</Text>
                <Text style={styles.infoValue}>{formatDate(customer.membershipExpiresAt)}</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>{formatDate(customer.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Location & NRI Details */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="public" size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Location & NRI Information</Text>
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Country of Residence</Text>
                <Text style={styles.infoValue}>{customer.nriCountry || '—'}</Text>
              </View>

              {!!customer.nriState && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>State / Province</Text>
                    <Text style={styles.infoValue}>{customer.nriState}</Text>
                  </View>
                </>
              )}

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City of Residence</Text>
                <Text style={styles.infoValue}>{customer.nriCity || '—'}</Text>
              </View>

              {!!customer.indiaLocation && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Home in India</Text>
                    <Text style={styles.infoValue}>{customer.indiaLocation}</Text>
                  </View>
                </>
              )}

              {!!customer.referralCode && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Referral Code</Text>
                    <Text style={[styles.infoValue, styles.referralCodeText]}>
                      {customer.referralCode}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Family Members List (if any) */}
          {customer.familyMembers?.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="family-restroom" size={18} color="#EA580C" />
                <Text style={styles.sectionTitle}>Family Members ({customer.familyMembers.length})</Text>
              </View>

              <View style={styles.itemList}>
                {customer.familyMembers.map((fam, idx) => (
                  <View key={fam.id || idx} style={styles.itemRow}>
                    <View style={styles.itemIconBg}>
                      <Icon name="person" size={16} color="#EA580C" />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{fam.name}</Text>
                      <Text style={styles.itemSub}>
                        {[fam.relationship, fam.phone].filter(Boolean).join(' · ') || 'Family Contact'}
                      </Text>
                      {!!fam.address && <Text style={styles.itemAddress}>{fam.address}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Properties List (if any) */}
          {customer.properties?.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="apartment" size={18} color="#7C3AED" />
                <Text style={styles.sectionTitle}>Properties ({customer.properties.length})</Text>
              </View>

              <View style={styles.itemList}>
                {customer.properties.map((prop, idx) => (
                  <View key={prop.id || idx} style={styles.itemRow}>
                    <View style={styles.itemIconBg}>
                      <Icon name="home" size={16} color="#7C3AED" />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{prop.nickname || 'Property'}</Text>
                      <Text style={styles.itemSub}>
                        {[prop.type, prop.city, prop.state].filter(Boolean).join(' · ') || 'Property Details'}
                      </Text>
                      {!!prop.address && <Text style={styles.itemAddress}>{prop.address}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent Service Requests (if any) */}
          {customer.recentRequests?.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="receipt-long" size={18} color="#20304C" />
                <Text style={styles.sectionTitle}>Recent Requests ({customer.recentRequests.length})</Text>
              </View>

              <View style={styles.itemList}>
                {customer.recentRequests.map((req, idx) => {
                  const reqMeta = getRequestStatusMeta(req.status);
                  return (
                    <View key={req.id || idx} style={styles.itemRow}>
                      <View style={styles.itemIconBg}>
                        <Icon name="confirmation-number" size={16} color="#20304C" />
                      </View>
                      <View style={styles.itemBody}>
                        <Text style={styles.itemTitle}>{req.serviceName}</Text>
                        <Text style={styles.itemSub}>
                          {[req.ticketNumber, formatDate(req.createdAt)].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <View style={[styles.statusBadgeSmall, { backgroundColor: reqMeta.bg, borderColor: reqMeta.border }]}>
                        <Text style={[styles.statusBadgeSmallText, { color: reqMeta.text }]}>
                          {reqMeta.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#20304C',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    marginLeft: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  backBtnPlaceholder: {
    width: 36,
    height: 36,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#20304C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  paymentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paymentsBtnText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#20304C',
    fontWeight: '700',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#4338CA',
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 18,
    fontFamily: typography.h3.fontFamily,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaRowText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    fontWeight: '700',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  locationText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'flex-start',
    gap: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bgGreen: {
    backgroundColor: '#ECFDF5',
  },
  bgBlue: {
    backgroundColor: '#EFF6FF',
  },
  bgPurple: {
    backgroundColor: '#F5F3FF',
  },
  statValue: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
  },

  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  textGreen: {
    color: '#059669',
  },
  textMuted: {
    color: '#64748B',
  },
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  referralCodeText: {
    fontWeight: '700',
    color: '#20304C',
  },

  itemList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  itemIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  itemAddress: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeSmallText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 30,
  },
});

export default CustomerDetail;
