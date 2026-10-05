import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'verified'].includes(s)) return { label: 'Active', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
  if (['pending', 'pending_verification', 'under_review'].includes(s)) return { label: 'Pending', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
  if (['suspended', 'rejected', 'blocked', 'inactive'].includes(s)) return { label: 'Suspended', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
  return { label: titleCase(status || 'Unknown'), bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
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

function VendorDetail({ route, navigation }) {
  const vendor = route?.params?.vendor;
  const [stateSearch, setStateSearch] = useState('');
  const [expandedStates, setExpandedStates] = useState(false);
  const INITIAL_STATES_LIMIT = 6;

  const statesList = useMemo(() => {
    const raw = vendor?.raw || {};
    if (Array.isArray(vendor?.statesCovered) && vendor.statesCovered.length > 0) {
      return vendor.statesCovered;
    }
    if (Array.isArray(raw.states_covered)) {
      return raw.states_covered;
    }
    return [];
  }, [vendor]);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return statesList;
    const q = stateSearch.toLowerCase();
    return statesList.filter((s) => String(s).toLowerCase().includes(q));
  }, [statesList, stateSearch]);

  const displayedStates = useMemo(() => {
    if (stateSearch.trim() || expandedStates) {
      return filteredStates;
    }
    return filteredStates.slice(0, INITIAL_STATES_LIMIT);
  }, [filteredStates, stateSearch, expandedStates]);

  if (!vendor) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vendor Details</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>
        </View>
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#CBD5E1" />
          <Text style={styles.errorTitle}>Vendor Not Found</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const raw = vendor?.raw || {};
  const badge = statusBadge(vendor.status);
  const initials = (vendor.businessName || 'V').substring(0, 2).toUpperCase();
  const vendorTypeDisplay = vendor.vendorTypeLabel || titleCase(vendor.vendorType) || 'Individual';

  const handleCall = () => {
    if (!vendor.phone) {
      Alert.alert('No Phone', 'Phone number is not available for this vendor.');
      return;
    }
    Linking.openURL(`tel:${vendor.phone}`).catch(() => {
      Alert.alert('Error', 'Could not open phone dialer.');
    });
  };

  const handleEmail = () => {
    if (!vendor.email) {
      Alert.alert('No Email', 'Email address is not available for this vendor.');
      return;
    }
    Linking.openURL(`mailto:${vendor.email}`).catch(() => {
      Alert.alert('Error', 'Could not open email app.');
    });
  };

  const servicesList = Array.isArray(vendor.services) && vendor.services.length > 0
    ? vendor.services
    : (Array.isArray(raw.services) ? raw.services : []);

  const categoriesList = Array.isArray(vendor.categories) && vendor.categories.length > 0
    ? vendor.categories
    : (Array.isArray(raw.categories) ? raw.categories : []);

  const ratesList = Array.isArray(vendor.rates) && vendor.rates.length > 0
    ? vendor.rates
    : (Array.isArray(raw.rates) ? raw.rates : []);

  const panNumber = vendor.panNumber || raw.pan_number;
  const gstNumber = vendor.gstNumber || raw.gst_number;
  const aadhaarNumber = vendor.aadhaarNumber || raw.aadhaar_number;
  const bankName = vendor.bankName || raw.bank_name;
  const bankAccountName = vendor.bankAccountName || raw.bank_account_name;
  const bankAccountNumber = vendor.bankAccountNumber || raw.bank_account_number;
  const bankIfsc = vendor.bankIfsc || raw.bank_ifsc;
  const upiId = vendor.upiId || raw.upi_id;
  const address = vendor.address || raw.address;

  const hasFinancials = Boolean(
    panNumber || gstNumber || aadhaarNumber || bankName || bankAccountNumber || upiId
  );

  const hasLocation = Boolean(address || vendor.city || vendor.district || vendor.state || vendor.pincode);

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
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
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
              <Text style={styles.businessName} numberOfLines={2}>
                {vendor.businessName}
              </Text>
              {!!vendor.ownerName && (
                <View style={styles.metaRow}>
                  <Icon name="person" size={13} color="#64748B" />
                  <Text style={styles.metaRowText} numberOfLines={1}>
                    {vendor.ownerName}
                  </Text>
                </View>
              )}
              <View style={styles.badgeRow}>
                <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
                  <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                </View>
                <View style={styles.typePill}>
                  <Icon name="business" size={12} color="#475569" />
                  <Text style={styles.typeText}>{vendorTypeDisplay}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, styles.bgAmber]}>
              <Icon name="star" size={18} color="#D97706" />
            </View>
            <Text style={styles.statValue}>
              {vendor.rating != null ? Number(vendor.rating).toFixed(1) : (raw.rating_score != null ? Number(raw.rating_score).toFixed(1) : '—')}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, styles.bgBlue]}>
              <Icon name="work-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{vendor.totalJobs || raw.total_jobs || 0}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>

          {statesList.length > 0 ? (
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, styles.bgGreen]}>
                <Icon name="map" size={18} color="#059669" />
              </View>
              <Text style={styles.statValue}>{statesList.length}</Text>
              <Text style={styles.statLabel}>States</Text>
            </View>
          ) : (
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, styles.bgGreen]}>
                <Icon name="play-circle-outline" size={18} color="#059669" />
              </View>
              <Text style={styles.statValue}>{vendor.activeJobs || 0}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
          )}
        </View>

        {/* Vendor Contact & Business Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="info-outline" size={18} color="#20304C" />
            <Text style={styles.sectionTitle}>Vendor Information</Text>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Business Name</Text>
              <Text style={styles.infoValue}>{vendor.businessName || raw.business_name || '—'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Owner / Contact</Text>
              <Text style={styles.infoValue}>{vendor.ownerName || raw.owner_name || '—'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <TouchableOpacity onPress={handleCall} disabled={!vendor.phone}>
                <Text style={[styles.infoValue, !!vendor.phone && styles.linkText]}>
                  {vendor.phone || 'Not provided'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <TouchableOpacity onPress={handleEmail} disabled={!vendor.email}>
                <Text style={[styles.infoValue, !!vendor.email && styles.linkText]}>
                  {vendor.email || 'Not provided'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vendor Type</Text>
              <Text style={styles.infoValue}>
                {vendorTypeDisplay}
              </Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.inlineBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Text style={[styles.inlineBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>

            {!!vendor.createdAt && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Registered On</Text>
                  <Text style={styles.infoValue}>{formatDate(vendor.createdAt)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* States Covered Section */}
        {statesList.length > 0 && (
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
                <Icon name="search" size={16} color="#94A3B8" />
                <TextInput
                  style={styles.stateSearchInput}
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
              <>
                <View style={styles.chipsContainer}>
                  {displayedStates.map((stateName, idx) => (
                    <View key={`${stateName}-${idx}`} style={styles.stateChip}>
                      <Icon name="location-on" size={12} color="#A64416" style={styles.chipIcon} />
                      <Text style={styles.stateChipText}>{stateName}</Text>
                    </View>
                  ))}
                </View>

                {filteredStates.length > INITIAL_STATES_LIMIT && !stateSearch.trim() && (
                  <TouchableOpacity
                    style={styles.expandStatesBtn}
                    activeOpacity={0.7}
                    onPress={() => setExpandedStates(prev => !prev)}
                  >
                    <Text style={styles.expandStatesBtnText}>
                      {expandedStates
                        ? 'Show Less'
                        : `View All ${statesList.length} States (+${statesList.length - INITIAL_STATES_LIMIT} more)`}
                    </Text>
                    <Icon
                      name={expandedStates ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={18}
                      color="#A64416"
                    />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyStatesBox}>
                <Text style={styles.emptyStatesText}>No matching states found</Text>
              </View>
            )}
          </View>
        )}

        {/* Location & Jurisdiction Details (if specific city/state is present) */}
        {hasLocation && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="place" size={18} color="#EA580C" />
              <Text style={styles.sectionTitle}>Base Location & Jurisdiction</Text>
            </View>

            <View style={styles.infoList}>
              {!!address && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Street Address</Text>
                    <Text style={styles.infoValue}>{address}</Text>
                  </View>
                  <View style={styles.infoDivider} />
                </>
              )}

              {!!vendor.city && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>City / Taluka</Text>
                    <Text style={styles.infoValue}>{vendor.city}</Text>
                  </View>
                  <View style={styles.infoDivider} />
                </>
              )}

              {!!vendor.district && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>District</Text>
                    <Text style={styles.infoValue}>{vendor.district}</Text>
                  </View>
                  <View style={styles.infoDivider} />
                </>
              )}

              {!!vendor.state && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>State</Text>
                    <Text style={styles.infoValue}>{vendor.state}</Text>
                  </View>
                  <View style={styles.infoDivider} />
                </>
              )}

              {!!vendor.pincode && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pincode</Text>
                  <Text style={styles.infoValue}>{vendor.pincode}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Categories & Services */}
        {(categoriesList.length > 0 || servicesList.length > 0) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="category" size={18} color="#7C3AED" />
              <Text style={styles.sectionTitle}>Categories & Services</Text>
            </View>

            {categoriesList.length > 0 && (
              <View style={styles.tagGroup}>
                <Text style={styles.tagGroupTitle}>Categories</Text>
                <View style={styles.tagWrap}>
                  {categoriesList.map((cat, idx) => {
                    const catName = typeof cat === 'string' ? cat : (cat.name || `Category #${idx + 1}`);
                    return (
                      <View key={idx} style={styles.categoryChip}>
                        <Icon name="label" size={12} color="#7C3AED" style={styles.chipIcon} />
                        <Text style={styles.categoryChipText}>{catName}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {servicesList.length > 0 && (
              <View style={styles.tagGroup}>
                <Text style={styles.tagGroupTitle}>Services Offered</Text>
                <View style={styles.tagWrap}>
                  {servicesList.map((srv, idx) => {
                    const srvName = typeof srv === 'string' ? srv : (srv.name || `Service #${idx + 1}`);
                    return (
                      <View key={idx} style={styles.serviceChip}>
                        <Icon name="check" size={12} color="#059669" style={styles.chipIcon} />
                        <Text style={styles.serviceChipText}>{srvName}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Priced Rates List (if any) */}
        {ratesList.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="payments" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Priced Service Rates</Text>
            </View>

            <View style={styles.itemList}>
              {ratesList.map((rateItem, idx) => (
                <View key={rateItem.id || idx} style={styles.rateCard}>
                  <View style={styles.rateCardHeader}>
                    <Text style={styles.rateServiceTitle}>
                      {rateItem.service?.name || rateItem.service_name || `Service Rate #${idx + 1}`}
                    </Text>
                    <Text style={styles.ratePrice}>
                      ₹{rateItem.rate != null ? Number(rateItem.rate).toLocaleString('en-IN') : '0'}
                    </Text>
                  </View>
                  {!!rateItem.recurring_rate && (
                    <Text style={styles.rateRecurring}>
                      Recurring: ₹{Number(rateItem.recurring_rate).toLocaleString('en-IN')}
                    </Text>
                  )}
                  {!!rateItem.pincodes && (
                    <Text style={styles.ratePincodes}>
                      Pincodes: {rateItem.pincodes}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Legal & Banking Details */}
        {hasFinancials && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="account-balance" size={18} color="#20304C" />
              <Text style={styles.sectionTitle}>Legal & Banking Information</Text>
            </View>

            <View style={styles.infoList}>
              {!!panNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>PAN Number</Text>
                  <Text style={styles.infoValue}>{panNumber}</Text>
                </View>
              )}

              {!!gstNumber && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>GST Number</Text>
                    <Text style={styles.infoValue}>{gstNumber}</Text>
                  </View>
                </>
              )}

              {!!aadhaarNumber && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Aadhaar Number</Text>
                    <Text style={styles.infoValue}>{aadhaarNumber}</Text>
                  </View>
                </>
              )}

              {!!bankName && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Bank Name</Text>
                    <Text style={styles.infoValue}>{bankName}</Text>
                  </View>
                </>
              )}

              {!!bankAccountName && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Name</Text>
                    <Text style={styles.infoValue}>{bankAccountName}</Text>
                  </View>
                </>
              )}

              {!!bankAccountNumber && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Number</Text>
                    <Text style={styles.infoValue}>{bankAccountNumber}</Text>
                  </View>
                </>
              )}

              {!!bankIfsc && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>IFSC Code</Text>
                    <Text style={styles.infoValue}>{bankIfsc}</Text>
                  </View>
                </>
              )}

              {!!upiId && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>UPI ID</Text>
                    <Text style={styles.infoValue}>{upiId}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingTop: 60,
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
    marginHorizontal: 12,
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
  errorTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
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
    gap: 16,
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
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#C2410C',
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    fontSize: 18,
    fontFamily: typography.h3.fontFamily,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaRowText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
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
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  typeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '600',
  },
  actionBtnTextDisabled: {
    color: '#94A3B8',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    gap: 2,
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
  bgAmber: { backgroundColor: '#FEF3C7' },
  bgBlue: { backgroundColor: '#EFF6FF' },
  bgGreen: { backgroundColor: '#ECFDF5' },
  bgPurple: { backgroundColor: '#F5F3FF' },
  statValue: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
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
    fontWeight: '700',
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
  linkText: {
    color: '#2563EB',
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

  // States Covered
  statesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  countBadgeText: {
    fontSize: 12,
    color: '#C2410C',
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stateSearchInput: {
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
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  chipIcon: {
    marginRight: 4,
  },
  stateChipText: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
  },
  emptyStatesBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyStatesText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  expandStatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  expandStatesBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#A64416',
  },

  // Categories & Services
  tagGroup: {
    gap: 8,
  },
  tagGroupTitle: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryChipText: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '600',
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  serviceChipText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },

  itemList: {
    gap: 10,
  },
  rateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  rateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateServiceTitle: {
    fontSize: 13.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
  },
  ratePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  rateRecurring: {
    fontSize: 11.5,
    color: '#64748B',
  },
  ratePincodes: {
    fontSize: 11,
    color: '#94A3B8',
  },

  bottomSpacer: {
    height: 30,
  },
});

export default VendorDetail;
