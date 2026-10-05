import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

function CustomerDetail({ route, navigation }) {
  const { customer } = route.params || {};

  if (!customer) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="error-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Customer Not Found</Text>
        </View>
      </View>
    );
  }

  const badge = membershipBadge(customer.membershipStatus, customer.hasActiveMembership);
  const initials = (customer.name || 'C').substring(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Details
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
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
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="card-membership" size={20} color="#059669" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>
              {customer.plan || (customer.hasActiveMembership ? 'Active' : 'No Plan')}
            </Text>
            <Text style={styles.statLabel}>Membership</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="people" size={20} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{customer.familyMembersCount ?? 0}</Text>
            <Text style={styles.statLabel}>Family Members</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#F5F3FF' }]}>
              <Icon name="home" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.statValue}>{customer.propertiesCount ?? 0}</Text>
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
              <Text style={[styles.infoValue, { color: customer.hasActiveMembership ? '#059669' : '#64748B' }]}>
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

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City of Residence</Text>
              <Text style={styles.infoValue}>{customer.nriCity || '—'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Location</Text>
              <Text style={styles.infoValue}>{customer.location || '—'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Family Members</Text>
              <Text style={styles.infoValue}>{customer.familyMembersCount ?? 0} registered</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Properties</Text>
              <Text style={styles.infoValue}>{customer.propertiesCount ?? 0} listed</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#4338CA',
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 17,
    fontFamily: typography.h4.fontFamily,
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
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
    gap: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },
  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default CustomerDetail;
