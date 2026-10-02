import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useAdminDashboard } from '../../Hooks/Admin/useAdminDashboard';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// Heat colour for a state's revenue share relative to the top state — deeper
// chocolate for higher revenue, fading toward a pale neutral for the lowest.
export function heatColor(ratio) {
  if (ratio >= 0.75) return '#A64416';
  if (ratio >= 0.5) return '#C2661F';
  if (ratio >= 0.25) return '#E08E4A';
  if (ratio > 0) return '#F3C89A';
  return '#E2E8F0';
}

function StateOperations({ navigation }) {
  const [search, setSearch] = useState('');
  const { stateBreakdown, loading, failed, error, refresh } = useAdminDashboard();

  // Sorted highest revenue first — the point of a heat-list.
  const sorted = useMemo(
    () => [...(stateBreakdown || [])].sort((a, b) => b.revenue - a.revenue),
    [stateBreakdown]
  );

  const filteredStates = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((s) => String(s.name || '').toLowerCase().includes(q));
  }, [sorted, search]);

  const maxRevenue = sorted.length ? Math.max(...sorted.map(s => s.revenue), 1) : 1;
  const totalRevenue = useMemo(() => sorted.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0), [sorted]);
  const totalTickets = useMemo(() => sorted.reduce((sum, s) => sum + (Number(s.ticketsCount) || 0), 0), [sorted]);

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
            State Operations & Revenue
          </Text>
          {sorted.length > 0 && (
            <View style={styles.headerCountBadge}>
              <Text style={styles.headerCountText}>{sorted.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search state by name..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Summary Stats Row */}
      {sorted.length > 0 && (
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Total Revenue</Text>
            <Text style={styles.summaryStatValue} numberOfLines={1}>{formatInr(totalRevenue)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Active States</Text>
            <Text style={styles.summaryStatValue}>{sorted.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Total Tickets</Text>
            <Text style={styles.summaryStatValue}>{totalTickets}</Text>
          </View>
        </View>
      )}

      {failed && (
        <TouchableOpacity style={styles.errorCard} activeOpacity={0.8} onPress={refresh}>
          <Icon name="error-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>
            {error?.status ? `(${error.status}) ` : ''}{error?.message || 'Could not load state breakdown.'} Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredStates}
        keyExtractor={(item, idx) => `${item.name}-${idx}`}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#20304C" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="map" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {search ? 'No Matching States' : 'No State Data'}
              </Text>
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
                  <Text style={styles.metaText}>{item.ticketsCount || 0} tickets</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="groups" size={13} color="#94A3B8" />
                  <Text style={styles.metaText}>{item.customersCount || 0} customers</Text>
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
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
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
    fontSize: 19,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FDE68A',
  },

  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
  },

  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: 13.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#DC2626',
    lineHeight: 17,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stateName: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
  },
  revenueText: {
    fontSize: 14,
    fontFamily: typography.h4.fontFamily,
    color: '#16A34A',
    fontWeight: '700',
  },

  heatTrack: {
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F1F5F9',
    marginTop: 10,
    overflow: 'hidden',
  },
  heatFill: {
    height: '100%',
    borderRadius: 3.5,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: '#64748B',
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default StateOperations;
