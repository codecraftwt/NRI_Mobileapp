import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useStateAdminDashboard } from '../../Hooks/StateAdmin/useStateAdminDashboard';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

function Analysis({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    slaBreakdown,
    districtBreakdown,
    loading,
    refresh,
  } = useStateAdminDashboard();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const sortedDistricts = useMemo(() => {
    return [...(districtBreakdown || [])].sort(
      (a, b) => (b.total ?? b.ticketsCount ?? 0) - (a.total ?? a.ticketsCount ?? 0)
    );
  }, [districtBreakdown]);

  const maxTickets = useMemo(() => {
    return sortedDistricts.length
      ? Math.max(...sortedDistricts.map(d => d.total ?? d.ticketsCount ?? 0), 1)
      : 1;
  }, [sortedDistricts]);

  const compliance = slaBreakdown?.compliancePercentage ?? 100;
  const withinSla = slaBreakdown?.withinSla ?? 0;
  const breached = slaBreakdown?.breached ?? 0;
  const slaTotal = slaBreakdown?.total ?? (withinSla + breached);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Simple Clean Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.decorDot} pointerEvents="none" />
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenterWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>Analysis</Text>
            <Text style={styles.headerSub} numberOfLines={1}>SLA & District Performance</Text>
          </View>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      {/* Cream Body */}
      <View style={styles.body}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
        >
          {/* SLA Performance Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Icon name="verified-user" size={18} color="#0EA5E9" />
                <Text style={styles.sectionTitle}>SLA Performance</Text>
              </View>
              <View style={[
                styles.complianceBadge,
                { backgroundColor: compliance >= 90 ? '#ECFDF5' : compliance >= 75 ? '#FFFBEB' : '#FEF2F2' }
              ]}>
                <Text style={[
                  styles.complianceBadgeText,
                  { color: compliance >= 90 ? '#059669' : compliance >= 75 ? '#D97706' : '#DC2626' }
                ]}>
                  {compliance}% Compliance
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.slaProgressTrack}>
                <View
                  style={[
                    styles.slaProgressFill,
                    {
                      width: `${Math.min(Math.max(compliance, 5), 100)}%`,
                      backgroundColor: compliance >= 90 ? '#10B981' : compliance >= 75 ? '#F59E0B' : '#EF4444',
                    },
                  ]}
                />
              </View>

              <View style={styles.slaMetricsGrid}>
                <View style={styles.slaMetricBox}>
                  <View style={styles.slaMetricHeader}>
                    <View style={[styles.slaDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.slaMetricLabel}>Within SLA</Text>
                  </View>
                  <Text style={[styles.slaMetricNumber, { color: '#059669' }]}>{withinSla}</Text>
                </View>

                <View style={styles.slaMetricBox}>
                  <View style={styles.slaMetricHeader}>
                    <View style={[styles.slaDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.slaMetricLabel}>Breached</Text>
                  </View>
                  <Text style={[styles.slaMetricNumber, { color: '#DC2626' }]}>{breached}</Text>
                </View>

                <View style={styles.slaMetricBox}>
                  <View style={styles.slaMetricHeader}>
                    <View style={[styles.slaDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.slaMetricLabel}>Total</Text>
                  </View>
                  <Text style={[styles.slaMetricNumber, { color: '#2563EB' }]}>{slaTotal}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* District Performance Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Icon name="insights" size={18} color="#A64416" />
                <Text style={styles.sectionTitle}>District Performance</Text>
              </View>
              {sortedDistricts.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{sortedDistricts.length} Districts</Text>
                </View>
              )}
            </View>

            {sortedDistricts.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="location-off" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>No district breakdown data available</Text>
              </View>
            ) : (
              <View style={styles.districtsCard}>
                {sortedDistricts.map((d, idx) => {
                  const totalVal = d.total ?? d.ticketsCount ?? 0;
                  const openVal = d.openCount ?? d.activeTicketsCount ?? 0;
                  const resolvedVal = Math.max(totalVal - openVal, 0);
                  const ratio = maxTickets > 0 ? totalVal / maxTickets : 0;

                  return (
                    <View
                      key={d.id || d.name || idx}
                      style={[
                        styles.districtRow,
                        idx < sortedDistricts.length - 1 && styles.districtRowBorder,
                      ]}
                    >
                      <View style={styles.districtTop}>
                        <Text style={styles.districtName} numberOfLines={1}>{d.name}</Text>
                        <View style={styles.districtBadge}>
                          <Text style={styles.districtBadgeText}>{totalVal} Total</Text>
                        </View>
                      </View>

                      <View style={styles.heatTrack}>
                        <View
                          style={[
                            styles.heatFill,
                            { width: `${Math.max(ratio * 100, totalVal > 0 ? 8 : 0)}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.districtMetaRow}>
                        <Text style={styles.metaOpenText}>{openVal} Open Tickets</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.metaResolvedText}>{resolvedVal} Resolved</Text>
                        {d.revenue != null && (
                          <>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaRevenueText}>{d.revenueFormatted || formatInr(d.revenue)}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: '#20304C',
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute', top: -70, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decorDot: {
    position: 'absolute', top: STATUS_BAR_HEIGHT + 14, right: 70,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  headerCenterWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  headerSub: { fontSize: 12.5, color: '#CBD5E1', marginTop: 2, textAlign: 'center' },

  body: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 100, gap: 24 },

  sectionContainer: { gap: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A', fontWeight: '700' },

  complianceBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  complianceBadgeText: { fontSize: 11.5, fontWeight: '700' },

  countBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  countBadgeText: { fontSize: 11.5, color: '#475569', fontWeight: '700' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    gap: 12,
  },
  slaProgressTrack: {
    height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden',
  },
  slaProgressFill: { height: '100%', borderRadius: 4 },

  slaMetricsGrid: { flexDirection: 'row', gap: 10 },
  slaMetricBox: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  slaMetricHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  slaDot: { width: 7, height: 7, borderRadius: 3.5 },
  slaMetricLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  slaMetricNumber: { fontSize: 17, fontWeight: '800' },

  districtsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  districtRow: { paddingVertical: 14 },
  districtRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  districtTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  districtName: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B', marginRight: 10, fontWeight: '600' },
  districtBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  districtBadgeText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  heatTrack: { height: 6, borderRadius: 3, backgroundColor: '#F8FAFC', marginTop: 8, overflow: 'hidden' },
  heatFill: { height: '100%', borderRadius: 3, backgroundColor: '#A64416' },
  districtMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaOpenText: { fontSize: 11.5, color: '#D97706', fontWeight: '700' },
  metaResolvedText: { fontSize: 11.5, color: '#64748B' },
  metaDot: { fontSize: 11, color: '#CBD5E1' },
  metaRevenueText: { fontSize: 11.5, color: '#94A3B8', marginLeft: 'auto' },

  emptyState: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyText: { fontSize: 13, color: '#94A3B8' },
});

export default Analysis;
