import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'verified'].includes(s)) return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
  if (['pending', 'pending_verification', 'under_review'].includes(s)) return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
  if (['suspended', 'rejected', 'blocked', 'inactive'].includes(s)) return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
}

function VendorDetail({ route, navigation }) {
  const { vendor } = route.params || {};
  const [stateSearch, setStateSearch] = useState('');

  const statesList = useMemo(() => {
    return Array.isArray(vendor?.statesCovered) ? vendor.statesCovered : [];
  }, [vendor]);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return statesList;
    const q = stateSearch.toLowerCase();
    return statesList.filter((s) => String(s).toLowerCase().includes(q));
  }, [statesList, stateSearch]);

  if (!vendor) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#20304C" barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Details</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="error-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Vendor Not Found</Text>
        </View>
      </View>
    );
  }

  const badge = statusBadge(vendor.status);
  const initials = (vendor.businessName || 'V').substring(0, 2).toUpperCase();

  const handleCall = () => {
    if (!vendor.phone) return;
    Linking.openURL(`tel:${vendor.phone}`).catch(() => {});
  };

  const handleEmail = () => {
    if (!vendor.email) return;
    Linking.openURL(`mailto:${vendor.email}`).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20304C" barStyle="light-content" />

      {/* Top Header */}
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
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Overview Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.businessName} numberOfLines={2}>
                {vendor.businessName}
              </Text>
              {!!vendor.ownerName && (
                <View style={styles.ownerRow}>
                  <Icon name="person" size={14} color="#64748B" />
                  <Text style={styles.ownerName} numberOfLines={1}>
                    {vendor.ownerName}
                  </Text>
                </View>
              )}
              <View style={styles.badgeRow}>
                <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
                  <Text style={[styles.statusText, { color: badge.color }]}>
                    {vendor.statusLabel || titleCase(vendor.status)}
                  </Text>
                </View>
                <View style={styles.typePill}>
                  <Icon name="business" size={12} color="#475569" />
                  <Text style={styles.typeText}>
                    {vendor.vendorTypeLabel || titleCase(vendor.vendorType) || 'Individual'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>
              {vendor.ratingScore != null ? Number(vendor.ratingScore).toFixed(1) : (vendor.rating?.toFixed(1) ?? '0.0')}
            </Text>
            <Text style={styles.statLabel}>Rating Score</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="work-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{vendor.totalJobs || 0}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#F0FDF4' }]}>
              <Icon name="map" size={20} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>{statesList.length}</Text>
            <Text style={styles.statLabel}>States Covered</Text>
          </View>
        </View>

        {/* Contact & Business Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="info-outline" size={18} color="#20304C" />
            <Text style={styles.sectionTitle}>Vendor Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Business Name</Text>
            <Text style={styles.infoValue}>{vendor.businessName || '—'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Owner Name</Text>
            <Text style={styles.infoValue}>{vendor.ownerName || '—'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <TouchableOpacity onPress={handleEmail} disabled={!vendor.email}>
              <Text style={[styles.infoValue, !!vendor.email && styles.linkValue]}>
                {vendor.email || '—'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <TouchableOpacity onPress={handleCall} disabled={!vendor.phone}>
              <Text style={[styles.infoValue, !!vendor.phone && styles.linkValue]}>
                {vendor.phone || 'Not provided'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vendor Type</Text>
            <Text style={styles.infoValue}>
              {vendor.vendorTypeLabel || titleCase(vendor.vendorType) || 'Individual'}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: badge.color, fontWeight: '700' }]}>
              {vendor.statusLabel || titleCase(vendor.status)}
            </Text>
          </View>

          {!!vendor.location && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Base Location</Text>
                <Text style={styles.infoValue}>{vendor.location}</Text>
              </View>
            </>
          )}
        </View>

        {/* States Covered Section */}
        <View style={styles.sectionCard}>
          <View style={styles.statesHeaderRow}>
            <View style={styles.sectionHeader}>
              <Icon name="explore" size={18} color="#20304C" />
              <Text style={styles.sectionTitle}>States Covered</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{statesList.length}</Text>
            </View>
          </View>

          {statesList.length > 6 && (
            <View style={styles.searchWrap}>
              <Icon name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search state..."
                placeholderTextColor="#94A3B8"
                value={stateSearch}
                onChangeText={setStateSearch}
              />
              {!!stateSearch && (
                <TouchableOpacity onPress={() => setStateSearch('')}>
                  <Icon name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {filteredStates.length > 0 ? (
            <View style={styles.chipsContainer}>
              {filteredStates.map((stateName, idx) => (
                <View key={`${stateName}-${idx}`} style={styles.stateChip}>
                  <Icon name="location-on" size={13} color="#20304C" style={{ marginRight: 4 }} />
                  <Text style={styles.stateChipText}>{stateName}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStatesBox}>
              <Text style={styles.emptyStatesText}>
                {stateSearch ? 'No matching states found' : 'No states assigned'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#20304C',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#6D28D9',
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontFamily: typography.h3.fontFamily,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  ownerName: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: typography.body.fontFamily,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
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
    fontFamily: typography.labelMedium.fontFamily,
    fontWeight: '700',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  typeText: {
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 17,
    fontFamily: typography.h3.fontFamily,
    color: '#0F172A',
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  linkValue: {
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },

  statesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  countBadge: {
    backgroundColor: 'rgba(32, 48, 76, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#20304C',
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    padding: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stateChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  emptyStatesBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStatesText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
});

export default VendorDetail;
