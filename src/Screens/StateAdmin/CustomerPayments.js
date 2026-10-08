import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { getStateAdminCustomerPayments as getAdminCustomerPayments, getStateAdminCustomerPaymentReceiptUrl as getAdminCustomerPaymentReceiptUrl } from '../../Api/StateAdmin/stateAdminCustomersApi';
import { downloadDocumentFile } from '../../Utils/fileDownload';
import CustomDateTimePicker from '../../Components/CustomDateTimePicker';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';

const STATUS_OPTIONS = [
  { value: null, label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const GATEWAY_OPTIONS = [
  { value: null, label: 'All Gateways' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'wallet', label: 'Wallet' },
];

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function statusMeta(status) {
  switch (status) {
    case 'success': return { label: 'Success', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    case 'pending': return { label: 'Pending', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
    case 'failed': return { label: 'Failed', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    case 'refunded': return { label: 'Refunded', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    default: return { label: titleCase(status || 'Unknown'), bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toApiDate(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function CustomerPayments({ route, navigation }) {
  const { customerId } = route.params || {};
  const token = useSelector(state => state.user.token);
  const { showAlert, alertProps } = useAppAlert();
  const insets = useSafeAreaInsets();

  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(null);
  const [gateway, setGateway] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [filterModal, setFilterModal] = useState(null); // 'status' | 'gateway' | 'date' | null
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPayments = useCallback(async (isRefresh = false) => {
    if (!customerId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await getAdminCustomerPayments(customerId, {
        status, gateway, from: toApiDate(fromDate), to: toApiDate(toDate), page,
      });
      setPayments(res.payments);
      setMeta(res.meta);
    } catch (err) {
      setError(err?.message || 'Could not load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, status, gateway, fromDate, toDate, page]);

  useEffect(() => {
    fetchPayments(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, status, gateway, fromDate, toDate, page]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setStatus(null);
    setGateway(null);
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const handleDownloadReceipt = async (payment) => {
    setDownloadingId(payment.id);
    try {
      await downloadDocumentFile({
        url: getAdminCustomerPaymentReceiptUrl(customerId, payment.id),
        filename: `Receipt-${payment.receiptNumber || payment.id}.pdf`,
        token,
      });
      showAlert(
        'Download Complete',
        Platform.OS === 'ios'
          ? 'Your receipt has been saved. Find it in the Files under NRICircle, or use the share sheet to save it elsewhere.'
          : 'Your receipt has been saved to your Downloads folder.'
      );
    } catch (err) {
      showAlert('Download Failed', err?.message || 'Could not download this receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  const hasFilters = !!(status || gateway || fromDate || toDate);

  const statusLabel = status ? (STATUS_OPTIONS.find(o => o.value === status)?.label || status) : 'Status';
  const gatewayLabel = gateway ? (GATEWAY_OPTIONS.find(o => o.value === gateway)?.label || gateway) : 'Gateway';
  const dateLabel = (fromDate || toDate)
    ? (fromDate && toDate ? `${toApiDate(fromDate).slice(5)} - ${toApiDate(toDate).slice(5)}` : '1 Date')
    : 'Date';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Payment History</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments(true)} colors={['#20304C']} tintColor="#20304C" />}
      >
        {!!meta?.totalPaid?.length && (
          <View style={styles.totalPaidRow}>
            {meta.totalPaid.map((t) => (
              <View key={t.currency} style={styles.totalPaidChip}>
                <Text style={styles.totalPaidLabel}>Total Paid ({t.currency})</Text>
                <Text style={styles.totalPaidValue}>{t.amountDisplay || `${t.currency} ${t.amount.toFixed(2)}`}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 3 Responsive Clean Filter Tabs */}
        <View style={styles.filterSection}>
          <View style={styles.tabsRow}>
            {/* Tab 1: Status */}
            <TouchableOpacity
              style={[styles.tabBtn, status && styles.tabBtnActive]}
              onPress={() => setFilterModal('status')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, status && styles.tabBtnTextActive]} numberOfLines={1}>
                {statusLabel}
              </Text>
              <Icon name="arrow-drop-down" size={18} color={status ? '#0F172A' : '#64748B'} />
            </TouchableOpacity>

            {/* Tab 2: Gateway */}
            <TouchableOpacity
              style={[styles.tabBtn, gateway && styles.tabBtnActive]}
              onPress={() => setFilterModal('gateway')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, gateway && styles.tabBtnTextActive]} numberOfLines={1}>
                {gatewayLabel}
              </Text>
              <Icon name="arrow-drop-down" size={18} color={gateway ? '#0F172A' : '#64748B'} />
            </TouchableOpacity>

            {/* Tab 3: Date */}
            <TouchableOpacity
              style={[styles.tabBtn, (fromDate || toDate) && styles.tabBtnActive]}
              onPress={() => setFilterModal('date')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, (fromDate || toDate) && styles.tabBtnTextActive]} numberOfLines={1}>
                {dateLabel}
              </Text>
              <Icon name="arrow-drop-down" size={18} color={(fromDate || toDate) ? '#0F172A' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {hasFilters && (
            <View style={styles.clearRow}>
              <TouchableOpacity onPress={clearFilters} style={styles.clearBtn} activeOpacity={0.7}>
                <Icon name="close" size={14} color="#64748B" />
                <Text style={styles.clearBtnText}>Reset filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loading && !payments.length ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#20304C" />
            <Text style={styles.loadingText}>Loading payments...</Text>
          </View>
        ) : error && !payments.length ? (
          <View style={styles.centered}>
            <Icon name="error-outline" size={44} color="#EF4444" />
            <Text style={styles.errorTitle}>Could not load payments</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPayments(false)}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.centered}>
            <Icon name="receipt-long" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>No payments found.</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {payments.map((p) => {
              const meta2 = statusMeta(p.status);
              return (
                <View key={p.id} style={styles.paymentCard}>
                  <View style={styles.paymentTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentFor}>{titleCase(p.for) || 'Payment'}</Text>
                      <Text style={styles.paymentMeta}>{p.receiptNumber || `#${p.id}`} · {titleCase(p.gateway)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: meta2.bg, borderColor: meta2.border }]}>
                      <Text style={[styles.statusBadgeText, { color: meta2.text }]}>{meta2.label}</Text>
                    </View>
                  </View>

                  <View style={styles.paymentBottomRow}>
                    <View>
                      <Text style={styles.paymentAmount}>{p.amountDisplay || `${p.currency || ''} ${Number(p.amount || 0).toFixed(2)}`}</Text>
                      <Text style={styles.paymentDate}>{formatDate(p.paidAt || p.createdAt)}</Text>
                    </View>
                    {p.status === 'success' && (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => handleDownloadReceipt(p)}
                        disabled={downloadingId === p.id}
                      >
                        {downloadingId === p.id ? (
                          <ActivityIndicator size="small" color="#20304C" />
                        ) : (
                          <>
                            <Icon name="file-download" size={16} color="#20304C" />
                            <Text style={styles.downloadBtnText}>Receipt</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!!meta && meta.lastPage > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pageIndicator}>Page {meta.currentPage} of {meta.lastPage}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, page >= meta.lastPage && styles.pageBtnDisabled]}
              onPress={() => setPage(p => Math.min(meta.lastPage, p + 1))}
              disabled={page >= meta.lastPage}
            >
              <Text style={[styles.pageBtnText, page >= meta.lastPage && styles.pageBtnTextDisabled]}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Middle Modal: Status */}
      <Modal visible={filterModal === 'status'} transparent animationType="fade" onRequestClose={() => setFilterModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModal(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setFilterModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                    onPress={() => {
                      changeFilter(setStatus)(opt.value);
                      setFilterModal(null);
                    }}
                  >
                    <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Icon name="check" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Middle Modal: Gateway */}
      <Modal visible={filterModal === 'gateway'} transparent animationType="fade" onRequestClose={() => setFilterModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModal(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gateway</Text>
              <TouchableOpacity onPress={() => setFilterModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              {GATEWAY_OPTIONS.map((opt) => {
                const isSelected = gateway === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                    onPress={() => {
                      changeFilter(setGateway)(opt.value);
                      setFilterModal(null);
                    }}
                  >
                    <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Icon name="check" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Middle Modal: Date Range */}
      <Modal visible={filterModal === 'date'} transparent animationType="fade" onRequestClose={() => setFilterModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModal(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setFilterModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>From</Text>
                <TouchableOpacity
                  style={styles.dateInputBtn}
                  onPress={() => setShowFromPicker(true)}
                >
                  <Text style={[styles.dateInputBtnText, fromDate && styles.dateInputBtnTextActive]}>
                    {fromDate ? toApiDate(fromDate) : 'Start date'}
                  </Text>
                  <Icon name="event" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>To</Text>
                <TouchableOpacity
                  style={styles.dateInputBtn}
                  onPress={() => setShowToPicker(true)}
                >
                  <Text style={[styles.dateInputBtnText, toDate && styles.dateInputBtnTextActive]}>
                    {toDate ? toApiDate(toDate) : 'End date'}
                  </Text>
                  <Icon name="event" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              {(fromDate || toDate) && (
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => {
                    setFromDate(null);
                    setToDate(null);
                    setPage(1);
                  }}
                >
                  <Text style={styles.modalSecondaryBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setFilterModal(null)}
              >
                <Text style={styles.modalPrimaryBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <CustomDateTimePicker
        visible={showFromPicker}
        mode="date"
        value={fromDate}
        maximumDate={toDate || new Date()}
        title="From Date"
        onConfirm={(date) => { changeFilter(setFromDate)(date); setShowFromPicker(false); }}
        onCancel={() => setShowFromPicker(false)}
      />
      <CustomDateTimePicker
        visible={showToPicker}
        mode="date"
        value={toDate}
        minimumDate={fromDate}
        maximumDate={new Date()}
        title="To Date"
        onConfirm={(date) => { changeFilter(setToDate)(date); setShowToPicker(false); }}
        onCancel={() => setShowToPicker(false)}
      />
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#20304C' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backBtnPlaceholder: { width: 38, height: 38 },
  backIcon: { marginLeft: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', textAlign: 'center' },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  totalPaidRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  totalPaidChip: { flex: 1, minWidth: 140, backgroundColor: '#ECFDF5', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  totalPaidLabel: { fontSize: 11, color: '#047857', fontWeight: '600' },
  totalPaidValue: { fontSize: 17, color: '#059669', fontWeight: '800', marginTop: 2 },

  /* 3 Responsive Clean Filter Tabs */
  filterSection: { gap: 6 },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tabBtnActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  tabBtnText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#475569',
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  clearRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  clearBtnText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Middle Popup Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },
  modalOptionsList: {
    paddingTop: 8,
    gap: 2,
  },
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modalOptionItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  modalOptionText: {
    fontSize: 14,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#475569',
  },
  modalOptionTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },

  /* Date Range in Middle Modal */
  datePickerContainer: {
    paddingTop: 14,
    gap: 12,
  },
  dateField: {
    gap: 4,
  },
  dateFieldLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  dateInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputBtnText: {
    fontSize: 13,
    color: '#64748B',
  },
  dateInputBtnTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    backgroundColor: '#20304C',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 13, color: '#64748B' },
  errorTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  errorSub: { fontSize: 12.5, color: '#64748B', textAlign: 'center' },
  retryBtn: { marginTop: 6, backgroundColor: '#20304C', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 },
  emptyText: { fontSize: 13.5, color: '#94A3B8', fontStyle: 'italic' },

  listWrap: { gap: 10 },
  paymentCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  paymentTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  paymentFor: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  paymentMeta: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontSize: 10.5, fontWeight: '700' },
  paymentBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10 },
  paymentAmount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  paymentDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  downloadBtnText: { fontSize: 12, fontWeight: '700', color: '#20304C' },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageBtn: { backgroundColor: '#20304C', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  pageBtnDisabled: { backgroundColor: '#E2E8F0' },
  pageBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 },
  pageBtnTextDisabled: { color: '#94A3B8' },
  pageIndicator: { fontSize: 12.5, color: '#64748B', fontWeight: '600' },
});

export default CustomerPayments;
