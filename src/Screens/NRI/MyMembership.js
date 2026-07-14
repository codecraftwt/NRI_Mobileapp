import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useMembership } from '../../Hooks/useMembership';

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
    case 'active': return { bg: '#E8F5E9', text: '#4CAF50' };
    case 'pending': return { bg: '#FFF3E0', text: '#FF9800' };
    case 'expired': return { bg: '#FFEBEE', text: '#EF4444' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
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

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="My Membership" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
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
            <Icon name="card-membership" size={40} color="#94A3B8" />
            <Text style={styles.noPlanTitle}>No active membership</Text>
            <Text style={styles.noPlanText}>Choose a plan to unlock service requests, parent-care visits and more.</Text>
            <TouchableOpacity style={styles.choosePlanBtn} onPress={() => navigation.navigate('MembershipCheckout', { mode: 'new' })}>
              <Text style={styles.choosePlanBtnText}>Choose a Plan</Text>
            </TouchableOpacity>
          </View>
        ) : membership ? (
          <View style={styles.activePlanCard}>
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
                <View style={styles.featureGrid}>
                  {membership.features.map(feature => (
                    <View key={feature.id} style={styles.heroFeatureCol}>
                      <Icon name={FEATURE_ICONS[feature.slug] || 'check-circle'} size={15} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.heroFeatureText}>
                        {feature.name} — <Text style={styles.heroFeatureValue}>{feature.value ?? '—'}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Membership History</Text>
          {historyLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#007AFF" />
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

        {/* {membership && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.renewBtn} onPress={() => navigation.navigate('MembershipCheckout', { mode: 'renew', planId: membership.planId })}>
              <Icon name="autorenew" size={18} color="white" />
              <Text style={styles.renewBtnText}>Renew Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('MembershipCheckout', { mode: 'upgrade', planId: membership.planId })}>
              <Icon name="upgrade" size={18} color="#007AFF" />
              <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
            </TouchableOpacity>
          </View>
        )} */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  emptyText: { fontSize: 12.5, color: '#9CA3AF' },

  noPlanCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  noPlanTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  noPlanText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
  choosePlanBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 6 },
  choosePlanBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },

  // Active Plan Hero Card
  activePlanCard: { backgroundColor: '#1D4ED8', borderRadius: 20, padding: 20, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeftCol: { flex: 1, paddingRight: 12 },
  activePlanLabel: { fontSize: 12.5, color: 'rgba(255,255,255,0.7)' },
  activePlanName: { fontSize: 26, fontWeight: 'bold', color: 'white', marginTop: 2 },
  heroPriceCol: { alignItems: 'flex-end' },
  priceValue: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  paymentBadge: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  paymentText: { fontSize: 11, fontWeight: 'bold', color: '#1D4ED8' },
  validUntil: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 16, marginBottom: 14 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  heroFeatureCol: { width: '33.33%', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, paddingRight: 6 },
  heroFeatureText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', flex: 1, flexShrink: 1 },
  heroFeatureValue: { fontWeight: 'bold', color: 'white' },

  // History Card
  historyCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  historyRow: { paddingVertical: 12 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  historyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyPlan: { fontSize: 14.5, fontWeight: 'bold', color: '#1E293B' },
  historyAmount: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  historyDates: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  historyBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' },

  // Action Buttons
  actionRow: { flexDirection: 'row', gap: 12 },
  upgradeBtn: { flex: 1, flexDirection: 'row', backgroundColor: 'white', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#007AFF' },
  upgradeBtnText: { color: '#007AFF', fontSize: 15, fontWeight: 'bold' },
});

export default MyMembership;
