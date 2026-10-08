import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { useStateAdminDashboard } from '../../Hooks/StateAdmin/useStateAdminDashboard';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

function DistrictBreakdown({ navigation }) {
  const insets = useSafeAreaInsets();
  const { districtBreakdown, loading, refresh } = useStateAdminDashboard();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('revenue'); // 'revenue' | 'tickets' | 'customers' | 'name'
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...(districtBreakdown || [])];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d => (d.name || d.districtName || '').toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === 'tickets') return (b.total ?? b.ticketsCount ?? 0) - (a.total ?? a.ticketsCount ?? 0);
      if (sortBy === 'open') return (b.openCount ?? b.activeTicketsCount ?? 0) - (a.openCount ?? a.activeTicketsCount ?? 0);
      if (sortBy === 'revenue') return (b.revenue || 0) - (a.revenue || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    return list;
  }, [districtBreakdown, search, sortBy]);

  const maxTickets = useMemo(() => {
    return filteredAndSorted.length
      ? Math.max(...filteredAndSorted.map(d => d.total ?? d.ticketsCount ?? 0), 1)
      : 1;
  }, [filteredAndSorted]);

  const totals = useMemo(() => {
    const list = districtBreakdown || [];
    return {
      districtsCount: list.length,
      totalTickets: list.reduce((acc, d) => acc + (d.total ?? d.ticketsCount ?? 0), 0),
      openTickets: list.reduce((acc, d) => acc + (d.openCount ?? d.activeTicketsCount ?? 0), 0),
      totalRevenue: list.reduce((acc, d) => acc + (d.revenue || 0), 0),
    };
  }, [districtBreakdown]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>District Performance</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Summary Card inside Header */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{totals.districtsCount}</Text>
            <Text style={styles.summaryLabel}>Districts</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#60A5FA' }]}>{totals.totalTickets}</Text>
            <Text style={styles.summaryLabel}>Total Tickets</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#FBBF24' }]}>{totals.openTickets}</Text>
            <Text style={styles.summaryLabel}>Open Tickets</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Search & Sort Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search district..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sort Chips */}
        <View style={styles.sortChipsRow}>
          <Text style={styles.sortTitle}>Sort by:</Text>
          {[
            { id: 'tickets', label: 'Total Tickets' },
            { id: 'open', label: 'Open' },
            { id: 'name', label: 'A-Z' },
            { id: 'revenue', label: 'Revenue' },
          ].map(chip => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.sortChip, sortBy === chip.id && styles.sortChipActive]}
              onPress={() => setSortBy(chip.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortChipText, sortBy === chip.id && styles.sortChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
        >
          {filteredAndSorted.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="map" size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No districts found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try adjusting your search filter' : 'No district performance data available for your state'}
              </Text>
            </View>
          ) : (
            filteredAndSorted.map((d, idx) => {
              const val = d.total ?? d.ticketsCount ?? 0;
              const ratio = maxTickets > 0 ? val / maxTickets : 0;
              const resolved = d.total - d.openCount >= 0 ? d.total - d.openCount : 0;
              return (
                <View key={d.id || d.name || idx} style={styles.districtCard}>
                  <View style={styles.districtHeader}>
                    <View style={styles.districtTitleWrap}>
                      <Text style={styles.districtName}>{d.name || d.districtName}</Text>
                      {d.slaCompliance != null && (
                        <View style={styles.slaBadge}>
                          <Text style={styles.slaBadgeText}>{d.slaCompliance}% SLA</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalBadgeText}>{d.total} Total</Text>
                    </View>
                  </View>

                  {/* Heat Progress */}
                  <View style={styles.heatTrack}>
                    <View
                      style={[
                        styles.heatFill,
                        { width: `${Math.max(ratio * 100, val > 0 ? 6 : 0)}%`, backgroundColor: '#A64416' },
                      ]}
                    />
                  </View>

                  {/* Stat Grid */}
                  <View style={styles.districtGrid}>
                    <View style={styles.districtGridCol}>
                      <Text style={[styles.gridVal, { color: '#0F172A' }]}>{d.total}</Text>
                      <Text style={styles.gridLabel}>Total Tickets</Text>
                    </View>
                    <View style={styles.districtGridCol}>
                      <Text style={[styles.gridVal, { color: '#D97706' }]}>{d.openCount}</Text>
                      <Text style={styles.gridLabel}>Open</Text>
                    </View>
                    <View style={styles.districtGridCol}>
                      <Text style={[styles.gridVal, { color: '#059669' }]}>{resolved}</Text>
                      <Text style={styles.gridLabel}>Resolved</Text>
                    </View>
                    {d.revenue != null && (
                      <View style={styles.districtGridCol}>
                        <Text style={[styles.gridVal, { color: '#2563EB' }]}>{d.revenueFormatted || formatInr(d.revenue)}</Text>
                        <Text style={styles.gridLabel}>Revenue</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#20304C',
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute', top: -50, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 8,
  },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  summaryLabel: { fontSize: 10, color: '#CBD5E1', marginTop: 2 },
  summaryDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },

  body: {
    flex: 1, backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingTop: 18,
  },

  searchRow: { paddingHorizontal: 20, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', height: '100%' },

  sortChipsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginBottom: 14,
  },
  sortTitle: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  sortChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  sortChipActive: { backgroundColor: '#A64416' },
  sortChipText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  sortChipTextActive: { color: '#FFFFFF' },

  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110, gap: 12 },

  districtCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  districtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  districtTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  districtName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  slaBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  slaBadgeText: { fontSize: 10, fontWeight: '700', color: '#0369A1' },
  districtRevenue: { fontSize: 15, fontWeight: '700', color: '#A64416' },
  totalBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalBadgeText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },

  heatTrack: { height: 5, borderRadius: 2.5, backgroundColor: '#F8FAFC', overflow: 'hidden', marginBottom: 12 },
  heatFill: { height: '100%', borderRadius: 2.5, backgroundColor: '#A64416' },

  districtGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
  },
  districtGridCol: { alignItems: 'center' },
  gridVal: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  gridLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },

  emptyWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 50, gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },
});

export default DistrictBreakdown;
