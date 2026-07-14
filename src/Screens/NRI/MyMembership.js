import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useMembership } from '../../Hooks/useMembership';

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
      {/* Dynamic Geometric Background Layering matching Auth screens */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />

      <Header navigation={navigation} title="My Membership" showBack />
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
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MembershipFeatures', { features: membership.features, planName: membership.planName })}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeftCol}>
                <Text style={styles.activePlanLabel}>Active Plan</Text>
                <Text style={styles.activePlanName}>{membership.planName || '—'}</Text>
                {!!membership.endDate && <Text style={styles.validUntil}>Valid until {formatDate(membership.endDate)}</Text>}
              </View>
              <View style={styles.heroPriceCol}>
                {membership.price != null && <Text style={styles.priceValue}>₹{Number(membership.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>}
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
                  <Icon name="chevron-right" size={20} color="white" />
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        <View style={styles.historyCard}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: colors.primaryLight + '10', borderRadius: 80, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: colors.accent + '08', borderRadius: 60, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: colors.primary + '05', borderRadius: 20, transform: [{ rotate: '15deg' }] },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },
  emptyText: { ...typography.body, color: colors.textPlaceholder },

  noPlanCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 24, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  noPlanTitle: { ...typography.h4, color: colors.textPrimary },
  noPlanText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  choosePlanBtn: { backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  choosePlanBtnText: { color: colors.onPrimary, ...typography.labelLarge },

  // Active Plan Hero Card
  activePlanCard: { backgroundColor: colors.primaryDark, borderRadius: 20, padding: 20, shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeftCol: { flex: 1, paddingRight: 12 },
  activePlanLabel: { ...typography.small, color: 'rgba(255,255,255,0.7)' },
  activePlanName: { ...typography.h2, color: colors.onPrimary, marginTop: 2 },
  heroPriceCol: { alignItems: 'flex-end' },
  priceValue: { ...typography.h3, color: colors.onPrimary },
  paymentBadge: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
  paymentText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: colors.primaryDark },
  validUntil: { ...typography.body, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 16, marginBottom: 14 },
  viewBenefitsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewBenefitsText: { ...typography.labelLarge, color: colors.onPrimary },

  // History Card
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },
  historyRow: { paddingVertical: 14 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: colors.surfaceSecondary },
  historyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyPlan: { ...typography.labelLarge, color: colors.textPrimary },
  historyAmount: { ...typography.labelMedium, color: colors.textPrimary },
  historyDates: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  historyBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },

  // Action Buttons
  actionRow: { flexDirection: 'row', gap: 12 },
  upgradeBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.surface, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary },
  upgradeBtnText: { color: colors.primary, ...typography.labelLarge },
});

export default MyMembership;
