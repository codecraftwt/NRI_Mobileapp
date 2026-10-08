import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { stateBreakdown, loading, failed, error, refresh } = useAdminDashboard();

  // Sorted highest revenue first — the point of a heat-list.
  const sorted = useMemo(
    () => [...(stateBreakdown || [])].sort((a, b) => b.revenue - a.revenue),
    [stateBreakdown]
  );

  const maxRevenue = sorted.length ? Math.max(...sorted.map(s => s.revenue), 1) : 1;
  const totalRevenue = useMemo(() => sorted.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0), [sorted]);
  const totalTickets = useMemo(() => sorted.reduce((sum, s) => sum + (Number(s.ticketsCount) || 0), 0), [sorted]);

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
            State Operations & Revenue
          </Text>
          <View style={styles.backBtnPlaceholder} />
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
        data={sorted}
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
              <Text style={styles.emptyTitle}>No State Data</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const ratio = maxRevenue > 0 ? (item.revenue || 0) / maxRevenue : 0;
          const barColor = heatColor(ratio);
          const rank = index + 1;

          return (
            <View style={styles.stateCard}>
              <View style={styles.stateTopRow}>
                <View style={styles.stateNameWrap}>
                  <View style={[styles.rankBadge, rank <= 3 && styles.rankBadgeTop]}>
                    <Text style={[styles.rankText, rank <= 3 && styles.rankTextTop]}>{rank}</Text>
                  </View>
                  <Text style={styles.stateName} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={styles.stateRevenue}>{formatInr(item.revenue)}</Text>
              </View>

              {/* Revenue heat bar */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(ratio * 100, item.revenue > 0 ? 4 : 0)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="confirmation-number" size={13} color="#64748B" />
                  <Text style={styles.metaText}>{item.ticketsCount} tickets</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="people" size={13} color="#64748B" />
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
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  backIcon: {
    marginLeft: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17.5,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 12,
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
    backgroundColor: '#F1F5F9',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#DC2626',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },

  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 10,
  },
  stateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeTop: {
    backgroundColor: '#FFF7ED',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rankTextTop: {
    color: '#EA580C',
  },
  stateName: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
  },
  stateRevenue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#16A34A',
  },

  barTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    color: '#0F172A',
  },
});

export default StateOperations;
