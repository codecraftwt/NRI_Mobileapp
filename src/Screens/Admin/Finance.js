import React, { useState, useEffect, useCallback } from 'react';
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
import { getAdminFinance } from '../../Api/Admin/adminFinanceApi';

function formatInr(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Finance({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchFinance = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await getAdminFinance();
      setData(res);
    } catch (err) {
      setError(err?.message || 'Could not load finance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  const receivedByType = data?.receivedByType || {};

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20304C" barStyle="light-content" />

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
            Billing & Finance
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      {loading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20304C" />
          <Text style={styles.loadingText}>Loading finance data...</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#EF4444" />

          <Text style={styles.errorTitle}>Could not load finance data</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchFinance(false)}>
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
              onRefresh={() => fetchFinance(true)}
              colors={['#20304C']}
              tintColor="#20304C"
            />
          }
        >
          {/* Top KPI 2x2 Grid Cards */}
          <View style={styles.kpiGrid}>
            {/* Card 1: Money Received */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Money received</Text>
              <Text style={[styles.kpiValue, styles.textGreen]}>
                {formatInr(data?.moneyReceived)}
              </Text>
              <Text style={styles.kpiSub}>Paid by customers, after refunds</Text>
            </View>

            {/* Card 2: Vendor Cost */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Vendor cost</Text>
              <Text style={[styles.kpiValue, styles.textRed]}>
                {formatInr(data?.vendorCost)}
              </Text>
              <Text style={styles.kpiSub}>Owed to vendors for completed jobs</Text>
            </View>

            {/* Card 3: Left after vendor cost */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Left after vendor cost</Text>
              <Text style={[styles.kpiValue, styles.textDark]}>
                {formatInr(data?.afterVendorCost)}
              </Text>
              <Text style={styles.kpiSub}>Money received – vendor cost</Text>
            </View>

            {/* Card 4: Awaiting payment */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Awaiting payment</Text>
              <Text style={[styles.kpiValue, styles.textAmber]}>
                {formatInr(data?.awaitingPayment)}
              </Text>
              <Text style={styles.kpiSub}>Service requests not paid yet</Text>
            </View>
          </View>

          {/* Section 1: Where the money came from */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Where the money came from</Text>

            <View style={styles.breakdownList}>
              {/* Memberships */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Memberships</Text>
                <Text style={styles.breakdownValue}>{formatInr(receivedByType.memberships)}</Text>
              </View>

              {/* Service Requests */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Service requests (incl. extra charges)</Text>
                <Text style={styles.breakdownValue}>{formatInr(receivedByType.services)}</Text>
              </View>

              {/* Recurring Subscriptions */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Recurring subscriptions</Text>
                <Text style={styles.breakdownValue}>{formatInr(receivedByType.subscriptions)}</Text>
              </View>

              {/* Other (if any) */}
              {Number(receivedByType.other || 0) > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Other</Text>
                  <Text style={styles.breakdownValue}>{formatInr(receivedByType.other)}</Text>
                </View>
              )}

              {/* Less: Refunds */}
              <View style={styles.breakdownRow}>
                <Text style={styles.refundLabel}>Less: refunds</Text>
                <Text style={styles.refundValue}>- {formatInr(data?.refunded)}</Text>
              </View>

              {/* Total: Money Received */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Money received</Text>
                <Text style={styles.totalValue}>{formatInr(data?.moneyReceived)}</Text>
              </View>

              {/* GST Included */}
              <View style={styles.gstRow}>
                <Text style={styles.gstLabel}>of which GST (18%, included in prices)</Text>
                <Text style={styles.gstValue}>{formatInr(data?.gstIncluded)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
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
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 14,
  },

  textGreen: {
    color: '#16A34A',
  },
  textRed: {
    color: '#DC2626',
  },
  textDark: {
    color: '#0F172A',
  },
  textAmber: {
    color: '#D97706',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  sectionCardTitle: {
    fontSize: 15.5,
    fontFamily: typography.h3.fontFamily,
    fontWeight: '800',
    color: '#0F172A',
  },

  breakdownList: {
    gap: 0,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  breakdownLabel: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  refundLabel: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  refundValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
  },
  totalLabel: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#16A34A',
  },

  gstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  gstLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  gstValue: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '600',
  },

  backIcon: {
    marginLeft: 4,
  },
});

export default Finance;
