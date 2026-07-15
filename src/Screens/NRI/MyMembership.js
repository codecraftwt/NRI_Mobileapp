import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useMembership } from '../../Hooks/useMembership';
import { useMyAddonPackages } from '../../Hooks/useMyAddonPackages';

const { width: W, height: H } = Dimensions.get('window');

// Icon per plan feature slug, verified live against GET /plans (Essential/Family/Premium/Elite/Corporate
// all share this same 17-feature set).
const FEATURE_ICONS = {
  'parent-care-visits': 'favorite',
  'medicine-reminder': 'healing',
  'property-inspection': 'home-work',
  'document-assistance': 'description',
  'legal-consultation': 'gavel',
  'service-requests': 'assignment',
  'dedicated-rm': 'support-agent',
  'whatsapp-support': 'chat',
  'app-access': 'phone-android',
  'emergency-support': 'warning',
  'family-members-covered': 'people',
  'coupon-credits': 'local-offer',
  'referral-rewards': 'card-giftcard',
  'auto-renewal-discount': 'autorenew',
  'annual-reports': 'insert-drive-file',
  'express-waiver': 'flash-on',
  'priority-support': 'headset-mic',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusStyle(status) {
  switch ((status || '').toLowerCase()) {
    case 'active': return { bg: colors.successBackground, text: colors.success };
    case 'pending': return { bg: colors.warningBackground, text: colors.warning };
    case 'expired': return { bg: colors.error + '20', text: colors.error };
    default: return { bg: colors.surfaceMuted, text: colors.textSecondary };
  }
}

function MyMembership({ navigation }) {
  const {
    membership,
    loading,
    failed,
    retry,
    history,
    historyLoading,
    historyFailed,
    retryHistory,
  } = useMembership();

  const { packages: addonPackages, loading: addonsLoading } = useMyAddonPackages();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retry(), retryHistory()]);
    setRefreshing(false);
  };

  // `retry`/`retryHistory` are new function references every render (not
  // memoized by the hook) — keeping them out of these deps avoids an
  // infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      retryHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Membership</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your membership…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load your membership. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!loading && !membership ? (
          <View style={styles.noPlanCard}>
            <Icon name="card-membership" size={40} color={colors.textPlaceholder} />
            <Text style={styles.noPlanTitle}>No active membership</Text>
            <Text style={styles.noPlanText}>Choose a plan to unlock service requests, parent-care visits and more.</Text>
            <TouchableOpacity style={styles.choosePlanBtn} onPress={() => navigation.navigate('MembershipCheckout', { mode: 'new' })}>
              <Text style={styles.choosePlanBtnText}>Choose a Plan</Text>
            </TouchableOpacity>
          </View>
        ) : membership ? (
          <TouchableOpacity
            style={styles.activePlanCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MembershipFeatures', { features: membership.features, planName: membership.planName })}
          >
            {/* Pseudo-gradient splash matching Dashboard */}
            <View style={{ position: 'absolute', top: -50, bottom: -50, right: -50, width: '65%', backgroundColor: '#A64416', borderRadius: 300, opacity: 0.95 }} />
            
            <View style={{ zIndex: 1 }}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroLeftCol}>
                  <Text style={styles.activePlanLabel}>YOUR PLAN</Text>
                  <Text style={styles.activePlanName}>{membership.planName || '—'}</Text>
                  {!!membership.endDate && <Text style={styles.validUntil}>Valid until {formatDate(membership.endDate)}</Text>}
                </View>
                <View style={styles.heroPriceCol}>
                  {membership.price != null && <Text style={styles.priceValue}>₹{Number(membership.price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>}
                  {!!membership.paymentStatus && (
                    <View style={styles.paymentBadge}>
                      <Text style={styles.paymentText}>{membership.paymentStatus}</Text>
                    </View>
                  )}
                </View>
              </View>

              {membership.features.length > 0 && (
                <>
                  <View style={styles.heroDivider} />
                  <View style={styles.viewBenefitsRow}>
                    <Text style={styles.viewBenefitsText}>View all {membership.features.length} benefits</Text>
                    <Icon name="arrow-forward" size={20} color="white" />
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Membership History</Text>
          {historyLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading history…</Text>
            </View>
          )}
          {historyFailed && (
            <TouchableOpacity onPress={retryHistory}>
              <Text style={styles.retryText}>Couldn't load membership history. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          {!historyLoading && history.length === 0 ? (
            <Text style={styles.emptyText}>No past memberships yet.</Text>
          ) : (
            history.map((item, index) => {
              const statusStyle = getStatusStyle(item.status);
              const paymentStyle = getStatusStyle(item.paymentStatus === 'Paid' ? 'active' : 'pending');
              return (
                <View key={item.id ?? index} style={[styles.historyRow, index > 0 && styles.historyRowBorder]}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyPlan}>{item.planName || '—'}</Text>
                    {item.price != null && (
                      <Text style={styles.historyAmount}>₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    )}
                  </View>
                  {!!(item.startDate || item.endDate) && (
                    <Text style={styles.historyDates}>{formatDate(item.startDate) || '—'} — {formatDate(item.endDate) || '—'}</Text>
                  )}
                  <View style={styles.historyBadgeRow}>
                    {!!item.status && (
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                      </View>
                    )}
                    {!!item.paymentStatus && (
                      <View style={[styles.statusBadge, { backgroundColor: paymentStyle.bg }]}>
                        <Text style={[styles.statusText, { color: paymentStyle.text }]}>{item.paymentStatus}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Add-on Packages Inline Section */}
        <View style={[styles.sectionContainer, { marginTop: 16 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Add-on Packages</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Add-on Packages')}>
              <Text style={styles.viewAllText}>View all →</Text>
            </TouchableOpacity>
          </View>
          
          {addonsLoading ? (
            <ActivityIndicator size="small" color="#F97316" style={{ alignSelf: 'flex-start', marginTop: 8 }} />
          ) : addonPackages && addonPackages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 4 }}>
              {addonPackages.slice(0, 3).map(pkg => (
                <View key={pkg.id} style={styles.miniAddonCard}>
                  <View style={styles.miniAddonHeader}>
                    <Icon name="stars" size={18} color="#F59E0B" />
                    <Text style={styles.miniAddonName}>{pkg.name}</Text>
                  </View>
                  <Text style={styles.miniAddonPrice}>₹{pkg.priceMonthly?.toLocaleString('en-IN')}<Text style={styles.miniAddonInterval}> / mo</Text></Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#20304C', // Dark blue status bar & header
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 24 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },
  emptyText: { ...typography.body, color: colors.textPlaceholder },

  noPlanCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', gap: 12, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  noPlanTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#1A1A1A' },
  noPlanText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  choosePlanBtn: { backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  choosePlanBtnText: { color: '#FFFFFF', fontFamily: typography.labelMedium.fontFamily, fontSize: 14, fontWeight: '600' },

  // Active Plan Hero Card
  activePlanCard: { backgroundColor: '#202945', borderRadius: 24, padding: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeftCol: { flex: 1, paddingRight: 12 },
  activePlanLabel: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  activePlanName: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },
  heroPriceCol: { alignItems: 'flex-end' },
  priceValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },
  paymentBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
  paymentText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF', fontWeight: '600' },
  validUntil: { fontSize: 13, color: '#E5E7EB', marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 24, marginBottom: 16 },
  viewBenefitsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewBenefitsText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF', fontWeight: '600' },

  // History Card
  sectionContainer: { marginTop: 8 },
  sectionTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#1A1A1A', marginBottom: 16 },
  historyRow: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  historyRowBorder: {}, // Unused now since cards are separated
  historyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyPlan: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  historyAmount: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '600' },
  historyDates: { fontSize: 12, color: '#64748B', marginTop: 4 },
  historyBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize', fontWeight: '600' },

  // Addon Packages Inline Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#D94625',
    fontWeight: '600',
  },
  miniAddonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: 220,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  miniAddonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  miniAddonName: {
    fontSize: 15,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
  },
  miniAddonPrice: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#0F172A',
  },
  miniAddonInterval: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: typography.regular?.fontFamily || typography.body?.fontFamily,
  },
});

export default MyMembership;
