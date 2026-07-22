import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useMyAddonPackages } from '../../Hooks/useMyAddonPackages';

const PAGE_SIZE = 8;

// Add-on prices (price_monthly) are shown in USD across the app.
const formatUsd = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusStyle(status) {
  switch ((status || '').toLowerCase()) {
    case 'active': return { bg: colors.successBackground, text: colors.success };
    case 'cancelled':
    case 'canceled': return { bg: colors.error + '20', text: colors.error };
    case 'pending': return { bg: colors.warningBackground, text: colors.warning };
    default: return { bg: colors.surfaceMuted, text: colors.textSecondary };
  }
}

// Full list of the customer's add-on package subscriptions (the "View all"
// target from My Membership). Same data source as the inline section and
// AddonPackages.js, so anything subscribed there shows up here.
function AddonSubscriptions({ navigation }) {
  const { packages, loading, failed, retry } = useMyAddonPackages();
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  const subscribed = (packages || []).filter(p => p.mySubscription);
  const lastPage = Math.max(1, Math.ceil(subscribed.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const paged = subscribed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="My Add-on Packages" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your add-on packages…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load your add-on packages. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!loading && subscribed.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="auto-awesome-mosaic" size={36} color={colors.textPlaceholder} />
            <Text style={styles.emptyTitle}>No add-on subscriptions yet</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Add-on Packages')}>
              <Text style={styles.browseBtnText}>Browse Packages</Text>
            </TouchableOpacity>
          </View>
        ) : (
          paged.map(pkg => {
            const sub = pkg.mySubscription;
            const ss = statusStyle(sub?.status);
            return (
              <View key={pkg.id} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.iconBox}><Icon name="stars" size={20} color="#F59E0B" /></View>
                  <Text style={styles.name} numberOfLines={2}>{pkg.name}</Text>
                  <Text style={styles.amount}>{formatUsd(pkg.priceMonthly)}<Text style={styles.interval}> / mo</Text></Text>
                </View>
                <View style={styles.metaRow}>
                  {!!sub?.status && (
                    <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.badgeText, { color: ss.text }]}>{sub.status}</Text>
                    </View>
                  )}
                  {!!sub?.currentPeriodEndsAt && (
                    <Text style={styles.meta}>{sub.autoRenew ? 'Auto-renews' : 'Ends'} {formatDate(sub.currentPeriodEndsAt)}</Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        {subscribed.length > PAGE_SIZE && (
          <View style={styles.pagerRow}>
            <TouchableOpacity style={[styles.pagerBtn, currentPage <= 1 && styles.pagerBtnDisabled]} disabled={currentPage <= 1} onPress={() => setPage(currentPage - 1)}>
              <Icon name="chevron-left" size={24} color={currentPage <= 1 ? colors.textPlaceholder : colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pagerText}>{currentPage} / {lastPage}</Text>
            <TouchableOpacity style={[styles.pagerBtn, currentPage >= lastPage && styles.pagerBtnDisabled]} disabled={currentPage >= lastPage} onPress={() => setPage(currentPage + 1)}>
              <Icon name="chevron-right" size={24} color={currentPage >= lastPage ? colors.textPlaceholder : colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 12 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 16 },
  retryText: { ...typography.labelMedium, color: colors.error },

  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#1A1A1A' },
  browseBtn: { backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  browseBtnText: { color: '#FFFFFF', fontFamily: typography.labelMedium.fontFamily, fontSize: 13 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  name: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  amount: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  interval: { fontSize: 12, color: '#64748B', fontFamily: typography.body?.fontFamily },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },
  meta: { fontSize: 12, color: '#64748B', fontFamily: typography.body?.fontFamily },

  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 12 },
  pagerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
});

export default AddonSubscriptions;
