import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { getStateAdminRevenue } from '../../Api/StateAdmin/stateAdminRevenueApi';

function formatInr(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInrCompact(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function extractString(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.name || val.label || val.title || val.city || val.category || val.status || '';
  }
  return String(val);
}

function getStatusMeta(status) {
  const s = String(extractString(status) || '').toLowerCase();
  if (s.includes('complet') || s.includes('resolv')) {
    return { label: 'Completed', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: 'check-circle' };
  }
  if (s.includes('progress')) {
    return { label: 'In Progress', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: 'sync' };
  }
  if (s.includes('assign')) {
    return { label: 'Assigned', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', icon: 'assignment-ind' };
  }
  if (s.includes('escalat')) {
    return { label: 'Escalated', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', icon: 'warning' };
  }
  if (s.includes('cancel')) {
    return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: 'cancel' };
  }
  return { label: extractString(status) || 'Other', bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', icon: 'info' };
}

function Revenue({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRevenue = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await getStateAdminRevenue({ months: 12 });
      setData(res);
    } catch (err) {
      setError(err?.message || 'Could not load revenue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue(false);
  }, [fetchRevenue]);

  const totalRevenue = data?.totalRevenue || 0;
  const totalRequests = data?.requests || 0;
  const avgValue = totalRequests > 0 ? totalRevenue / totalRequests : 0;

  const maxMonthAmount = useMemo(() => {
    const list = data?.monthlyTrend || [];
    if (!list.length) return 1;
    return Math.max(...list.map(m => m.amount), 1);
  }, [data?.monthlyTrend]);

  const maxCityAmount = useMemo(() => {
    const list = data?.byCity || [];
    if (!list.length) return 1;
    return Math.max(...list.map(c => c.amount), 1);
  }, [data?.byCity]);

  const maxCategoryAmount = useMemo(() => {
    const list = data?.byCategory || [];
    if (!list.length) return 1;
    return Math.max(...list.map(c => c.amount), 1);
  }, [data?.byCategory]);

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
            Total Revenue
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      {loading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20304C" />
          <Text style={styles.loadingText}>Loading revenue data...</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Could not load revenue data</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRevenue(false)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRevenue(true)}
              colors={['#20304C']}
              tintColor="#20304C"
            />
          }
        >
          {/* Top KPI Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiMainCard}>
              <View style={styles.kpiMainRow}>
                <View style={styles.kpiMainIconBg}>
                  <Icon name="payments" size={24} color="#16A34A" />
                </View>
                <View style={styles.kpiMainTextWrap}>
                  <Text style={styles.kpiMainLabel}>Total Revenue</Text>
                  <Text style={styles.kpiMainValue}>{formatInr(totalRevenue)}</Text>
                </View>
              </View>
              <Text style={styles.kpiMainSub}>
                Active & completed service requests value in your area
              </Text>
            </View>

            <View style={styles.kpiSubRow}>
              <View style={styles.kpiSubCard}>
                <View style={[styles.kpiSubIconBg, styles.bgBlue]}>
                  <Icon name="confirmation-number" size={16} color="#2563EB" />
                </View>
                <Text style={styles.kpiSubValue}>{totalRequests}</Text>
                <Text style={styles.kpiSubLabel}>Total Requests</Text>
              </View>

              <View style={styles.kpiSubCard}>
                <View style={[styles.kpiSubIconBg, styles.bgPurple]}>
                  <Icon name="trending-up" size={16} color="#7C3AED" />
                </View>
                <Text style={styles.kpiSubValue}>{formatInrCompact(avgValue)}</Text>
                <Text style={styles.kpiSubLabel}>Avg. Value</Text>
              </View>
            </View>
          </View>

          {/* Revenue by Status */}
          {data?.byStatus?.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIconBg}>
                  <Icon name="donut-large" size={18} color="#20304C" />
                </View>
                <View style={styles.sectionHeaderTextWrap}>
                  <Text style={styles.sectionTitle}>Revenue by Status</Text>
                  <Text style={styles.sectionSub}>Breakdown by ticket progress state</Text>
                </View>
              </View>

              <View style={styles.statusList}>
                {data.byStatus.map((item, idx) => {
                  const itemLabel = extractString(item.label || item.status);
                  const meta = getStatusMeta(item.status || itemLabel);
                  const share = totalRevenue > 0 ? (item.amount / totalRevenue) * 100 : 0;

                  return (
                    <View key={item.id || item.status || idx} style={styles.statusRow}>
                      <View style={styles.statusTopLine}>
                        <View style={styles.statusBadgeWrap}>
                          <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                            <Icon name={meta.icon} size={14} color={meta.text} />
                            <Text style={[styles.statusBadgeText, { color: meta.text }]}>
                              {itemLabel || meta.label}
                            </Text>
                          </View>
                          <View style={styles.requestCountPill}>
                            <Text style={styles.requestCountText}>{item.requests} reqs</Text>
                          </View>
                        </View>
                        <Text style={styles.statusAmountText}>{formatInr(item.amount)}</Text>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(Math.max(share, 2), 100)}%`, backgroundColor: meta.text },
                          ]}
                        />
                      </View>
                      <View style={styles.statusBottomLine}>
                        <Text style={styles.statusShareText}>{share.toFixed(1)}% of total revenue</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Monthly Trend */}
          {data?.monthlyTrend?.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIconBg}>
                  <Icon name="bar-chart" size={18} color="#20304C" />
                </View>
                <View style={styles.sectionHeaderTextWrap}>
                  <Text style={styles.sectionTitle}>Monthly Trend</Text>
                  <Text style={styles.sectionSub}>Revenue and volume across recent months</Text>
                </View>
              </View>

              <View style={styles.trendList}>
                {data.monthlyTrend.map((m, idx) => {
                  const share = maxMonthAmount > 0 ? (m.amount / maxMonthAmount) * 100 : 0;
                  const monthLabel = extractString(m.month);
                  return (
                    <View key={m.id || m.month || idx} style={styles.trendRow}>
                      <View style={styles.trendHeaderLine}>
                        <Text style={styles.trendMonthText}>{monthLabel}</Text>
                        <View style={styles.trendAmountWrap}>
                          <Text style={styles.trendRequestsText}>{m.requests} reqs</Text>
                          <Text style={styles.trendAmountText}>{formatInr(m.amount)}</Text>
                        </View>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            styles.fillBlue,
                            { width: `${Math.min(Math.max(share, 2), 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Revenue by City */}
          {data?.byCity?.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIconBg}>
                  <Icon name="location-city" size={18} color="#20304C" />
                </View>
                <View style={styles.sectionHeaderTextWrap}>
                  <Text style={styles.sectionTitle}>Top Cities</Text>
                  <Text style={styles.sectionSub}>Revenue by coverage area</Text>
                </View>
              </View>

              <View style={styles.cityList}>
                {data.byCity.map((c, idx) => {
                  const share = maxCityAmount > 0 ? (c.amount / maxCityAmount) * 100 : 0;
                  const cityName = extractString(c.city);
                  return (
                    <View key={c.id || c.city || idx} style={styles.cityRow}>
                      <View style={styles.cityHeaderLine}>
                        <View style={styles.cityNameWrap}>
                          <Icon name="place" size={15} color="#A64416" />
                          <Text style={styles.cityNameText}>{cityName || 'Unknown City'}</Text>
                        </View>
                        <View style={styles.cityAmountWrap}>
                          <Text style={styles.cityRequestsText}>{c.requests} reqs</Text>
                          <Text style={styles.cityAmountText}>{formatInr(c.amount)}</Text>
                        </View>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            styles.fillBrown,
                            { width: `${Math.min(Math.max(share, 2), 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Revenue by Category */}
          {data?.byCategory?.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIconBg}>
                  <Icon name="category" size={18} color="#20304C" />
                </View>
                <View style={styles.sectionHeaderTextWrap}>
                  <Text style={styles.sectionTitle}>Service Categories</Text>
                  <Text style={styles.sectionSub}>Revenue breakdown by service type</Text>
                </View>
              </View>

              <View style={styles.categoryList}>
                {data.byCategory.map((cat, idx) => {
                  const share = maxCategoryAmount > 0 ? (cat.amount / maxCategoryAmount) * 100 : 0;
                  const catName = extractString(cat.category);
                  return (
                    <View key={cat.id || cat.category || idx} style={styles.categoryRow}>
                      <View style={styles.categoryHeaderLine}>
                        <Text style={styles.categoryNameText}>{catName || 'General'}</Text>
                        <View style={styles.categoryAmountWrap}>
                          <Text style={styles.categoryRequestsText}>{cat.requests} reqs</Text>
                          <Text style={styles.categoryAmountText}>{formatInr(cat.amount)}</Text>
                        </View>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            styles.fillGreen,
                            { width: `${Math.min(Math.max(share, 2), 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
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
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  kpiGrid: {
    gap: 10,
  },
  kpiMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  kpiMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kpiMainIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiMainTextWrap: {
    flex: 1,
  },
  kpiMainLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  kpiMainValue: {
    fontSize: 22,
    fontFamily: typography.h2.fontFamily,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiMainSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 16,
  },

  kpiSubRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiSubCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
    gap: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  kpiSubIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bgBlue: {
    backgroundColor: '#EFF6FF',
  },
  bgPurple: {
    backgroundColor: '#F5F3FF',
  },
  kpiSubValue: {
    fontSize: 17,
    fontFamily: typography.h3.fontFamily,
    color: '#0F172A',
  },
  kpiSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    gap: 10,
  },
  sectionHeaderIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  statusList: {
    gap: 14,
  },
  statusRow: {
    gap: 6,
  },
  statusTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  requestCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requestCountText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  statusAmountText: {
    fontSize: 13.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  fillBlue: {
    backgroundColor: '#2563EB',
  },
  fillBrown: {
    backgroundColor: '#A64416',
  },
  fillGreen: {
    backgroundColor: '#059669',
  },
  statusBottomLine: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusShareText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },

  trendList: {
    gap: 12,
  },
  trendRow: {
    gap: 6,
  },
  trendHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendMonthText: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '600',
  },
  trendAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendRequestsText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  trendAmountText: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },

  cityList: {
    gap: 12,
  },
  cityRow: {
    gap: 6,
  },
  cityHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  cityNameText: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: typography.labelMedium.fontFamily,
    fontWeight: '600',
  },
  cityAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityRequestsText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cityAmountText: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },

  categoryList: {
    gap: 12,
  },
  categoryRow: {
    gap: 6,
  },
  categoryHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryNameText: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: typography.labelMedium.fontFamily,
    fontWeight: '600',
  },
  categoryAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryRequestsText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  categoryAmountText: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 30,
  },
});

export default Revenue;
