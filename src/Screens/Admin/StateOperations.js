import React, { useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useAdminDashboard } from '../../Hooks/Admin/useAdminDashboard';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// Heat colour for a state's revenue share relative to the top state — deeper
// chocolate for higher revenue, fading toward a pale neutral for the lowest.
// Exported so the Dashboard's summary section can render matching heat bars.
export function heatColor(ratio) {
  if (ratio >= 0.75) return '#A64416';
  if (ratio >= 0.5) return '#C2661F';
  if (ratio >= 0.25) return '#E08E4A';
  if (ratio > 0) return '#F3C89A';
  return '#E2E8F0';
}

function StateOperations({ navigation }) {
  const { stateBreakdown, loading, failed, error, refresh } = useAdminDashboard();

  // Sorted highest revenue first — the point of a heat-list.
  const sorted = useMemo(
    () => [...(stateBreakdown || [])].sort((a, b) => b.revenue - a.revenue),
    [stateBreakdown]
  );
  const maxRevenue = sorted.length ? Math.max(...sorted.map(s => s.revenue), 1) : 1;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>State Operations</Text>
            <Text style={styles.headerSub}>Revenue heat-list by state</Text>
          </View>
        </View>
      </View>

      {failed && (
        <TouchableOpacity style={styles.errorCard} activeOpacity={0.8} onPress={refresh}>
          <Icon name="error-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>
            {error?.status ? `(${error.status}) ` : ''}{error?.message || 'Could not load state breakdown.'} Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(item, idx) => `${item.name}-${idx}`}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="map" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No State Data</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const ratio = maxRevenue > 0 ? item.revenue / maxRevenue : 0;
          const color = heatColor(ratio);

          return (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={[styles.rankBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.rankText, { color }]}>{index + 1}</Text>
                </View>
                <Text style={styles.stateName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.revenueText}>{formatInr(item.revenue)}</Text>
              </View>

              <View style={styles.heatTrack}>
                <View style={[styles.heatFill, { width: `${Math.max(ratio * 100, item.revenue > 0 ? 4 : 0)}%`, backgroundColor: color }]} />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="confirmation-number" size={13} color="#94A3B8" />
                  <Text style={styles.metaText}>{item.ticketsCount} tickets</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="groups" size={13} color="#94A3B8" />
                  <Text style={styles.metaText}>{item.customersCount} customers</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#20304C',
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginHorizontal: 20, marginTop: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 10 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: '800' },
  stateName: { flex: 1, fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  revenueText: { fontSize: 14, fontFamily: typography.h4.fontFamily, color: '#16A34A' },

  heatTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', marginTop: 10, overflow: 'hidden' },
  heatFill: { height: '100%', borderRadius: 4 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5, color: '#64748B' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
});

export default StateOperations;
