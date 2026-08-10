import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography } from '../../theme/typography';
import { useVendorPayoutDetail } from '../../Hooks/Vendor/useVendorEarnings';
import { getVendorPayoutInvoiceUrl } from '../../Api/Vendor/vendorEarningsApi';
import { downloadDocumentFile } from '../../Utils/fileDownload';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function getStatusStyle(status) {
  switch ((status || '').toLowerCase()) {
    case 'paid': return { bg: '#D1FAE5', text: '#059669' };
    case 'processed': return { bg: '#DBEAFE', text: '#1D4ED8' };
    default: return { bg: '#FEF3C7', text: '#D97706' };
  }
}

function DeductionRow({ label, value }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumDeduction}>-{formatInr(value)}</Text>
    </View>
  );
}

function PayoutDetail({ route, navigation }) {
  const { payoutId } = route.params || {};
  const { detail, loading, failed, retry } = useVendorPayoutDetail(payoutId);
  const token = useSelector(s => s.user.token);
  const { showAlert, alertProps } = useAppAlert();

  const handleDownload = async () => {
    try {
      await downloadDocumentFile({
        url: getVendorPayoutInvoiceUrl(payoutId),
        filename: `Payout-Statement-${payoutId}`,
        token,
      });
      showAlert('Statement Downloaded', 'The payout statement PDF has been saved to your device.');
    } catch (e) {
      showAlert('Download Failed', e?.message || 'Could not download the statement.');
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>Payout Detail</Text>
      <View style={{ width: 44 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerState}><ActivityIndicator size="large" color="#D94625" /></View>
      </View>
    );
  }

  if (failed || !detail) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <TouchableOpacity style={styles.centerState} onPress={retry} activeOpacity={0.7}>
          <Icon name="refresh" size={40} color="#DC2626" />
          <Text style={styles.stateText}>Couldn't load this payout. Tap to retry.</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = getStatusStyle(detail.status);

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>

          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Status</Text>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusPillText, { color: st.text }]}>{detail.status}</Text>
            </View>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Gross Earnings</Text>
            <Text style={styles.sumValue}>{formatInr(detail.grossEarnings)}</Text>
          </View>
          <DeductionRow label="TDS Deduction" value={detail.tdsDeduction} />
          <DeductionRow label="Penalty Deduction" value={detail.penaltyDeduction} />
          <DeductionRow label="Subscription Deduction" value={detail.subscriptionDeduction} />

          <View style={styles.divider} />
          <View style={styles.sumRow}>
            <Text style={styles.netLabel}>Net Payout</Text>
            <Text style={styles.netValue}>{formatInr(detail.netPayout)}</Text>
          </View>
        </View>

        {/* Jobs in this cycle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Jobs in this Cycle</Text>
          {detail.jobs.length === 0 ? (
            <Text style={styles.emptyText}>No jobs in this cycle.</Text>
          ) : (
            detail.jobs.map((job, i) => (
              <View key={job.id ?? i} style={[styles.jobRow, i < detail.jobs.length - 1 && styles.jobRowBorder]}>
                <View style={styles.jobTopRow}>
                  <Text style={styles.jobTicket}>{job.ticket}</Text>
                  <Text style={styles.jobAmount}>{formatInr(job.jobAmount)}</Text>
                </View>
                <Text style={styles.jobService} numberOfLines={2}>{job.service}</Text>
                <View style={styles.jobMetaRow}>
                  <Text style={styles.jobMeta}>Deduction: <Text style={job.deduction ? styles.jobDeduction : styles.jobMetaMuted}>{job.deduction ? `-${formatInr(job.deduction)}` : '—'}</Text></Text>
                  <Text style={styles.jobMeta}>Reason: <Text style={styles.jobMetaMuted}>{job.reason || '—'}</Text></Text>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.85}>
          <Icon name="picture-as-pdf" size={18} color="#FFFFFF" />
          <Text style={styles.downloadBtnText}>Download Statement</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="arrow-back" size={16} color="#2563EB" />
          <Text style={styles.backBtnText}>Back to Earnings</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  headerContainer: {
    backgroundColor: '#20304C',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  headerBackBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', flex: 1, textAlign: 'center' },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center' },

  scrollContent: { padding: 20, paddingBottom: 60, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 12 },

  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  sumLabel: { fontSize: 14, color: '#64748B' },
  sumValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  sumDeduction: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 },
  netLabel: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  netValue: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },

  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },
  jobRow: { paddingVertical: 12, gap: 4 },
  jobRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  jobTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTicket: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B', letterSpacing: 0.3 },
  jobAmount: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  jobService: { fontSize: 14, color: '#475569' },
  jobMetaRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  jobMeta: { fontSize: 12, color: '#64748B' },
  jobMetaMuted: { color: '#94A3B8' },
  jobDeduction: { color: '#DC2626', fontFamily: typography.labelMedium.fontFamily },

  downloadBtn: {
    flexDirection: 'row', gap: 8, backgroundColor: '#D94625', borderRadius: 24,
    paddingVertical: 15, justifyContent: 'center', alignItems: 'center',
  },
  downloadBtnText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center',
    borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FFFFFF',
  },
  backBtnText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },
});

export default PayoutDetail;
