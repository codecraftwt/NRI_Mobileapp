import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useBilling } from '../../Hooks/useBilling';
import { useMyAddonPackages } from '../../Hooks/useMyAddonPackages';
import { getReceiptDownloadUrl } from '../../Api/paymentsApi';
import { downloadDocumentFile } from '../../Utils/fileDownload';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../Utils/paymentGateway';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function resolveReceiptId(item) {
  if (!item.receipt) return null;
  if (typeof item.receipt === 'object') return item.receipt.payment_id ?? item.receipt.id ?? null;
  return item.receipt;
}

function PageSizeField({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.pageSizeBox} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.pageSizeText}>{value}</Text>
        <Icon name="keyboard-arrow-down" size={18} color="#6B7280" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <FlatList
              data={PAGE_SIZE_OPTIONS}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setOpen(false); }}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#007AFF" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function BillingPayments({ navigation }) {
  const { overview, loading, failed, retry, pay, verifyPayment, stopAutoRenew, stopAutoRenewLoading } = useBilling();
  const { cancelSubscription } = useMyAddonPackages();
  const user = useSelector(state => state.user.user);
  const token = useSelector(state => state.user.token);
  const [payingKey, setPayingKey] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const handleGatewayPayment = async (item, gateway) => {
    const key = `${item.type}:${item.id}`;
    setPayingKey(key);
    try {
      const result = await pay(item.type, item.id, gateway, false).unwrap();

      if (result.order) {
        const rzpResult = await openRazorpayCheckout({
          order: result.order,
          name: 'NRI Circle',
          description: item.label,
          user,
        });
        await verifyPayment({
          paymentId: result.paymentId,
          razorpayOrderId: rzpResult.razorpayOrderId,
          razorpayPaymentId: rzpResult.razorpayPaymentId,
          razorpaySignature: rzpResult.razorpaySignature,
        }).unwrap();
        retry();
        Alert.alert('Payment Successful', `${item.label} has been paid.`);
      } else if (result.checkoutUrl) {
        openStripeCheckout(result.checkoutUrl);
        Alert.alert(
          'Complete Payment',
          'Complete your payment in the browser, then come back and tap "I\'ve Paid" to confirm.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: "I've Paid",
              onPress: () => {
                const sessionId = extractStripeSessionId(result.checkoutUrl);
                verifyPayment({ paymentId: result.paymentId, sessionId })
                  .unwrap()
                  .then(() => {
                    retry();
                    Alert.alert('Payment Successful', `${item.label} has been paid.`);
                  })
                  .catch((error) => {
                    Alert.alert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
                  });
              },
            },
          ]
        );
      } else {
        retry();
        Alert.alert('Payment Successful', result.message || `${item.label} has been paid.`);
      }
    } catch (error) {
      Alert.alert('Payment Failed', error?.message || 'Could not complete payment. Please try again.');
    } finally {
      setPayingKey(null);
    }
  };

  const handlePayNow = (item) => {
    Alert.alert(
      'Choose Payment Method',
      `Pay ₹${item.amount.toLocaleString('en-IN')} for ${item.label}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Razorpay', onPress: () => handleGatewayPayment(item, 'razorpay') },
        { text: 'Stripe', onPress: () => handleGatewayPayment(item, 'stripe') },
      ]
    );
  };

  const handleDownloadReceipt = async (item) => {
    const paymentId = resolveReceiptId(item);
    if (!paymentId) return;
    const key = `${item.type}:${item.id}`;
    setDownloadingId(key);
    try {
      await downloadDocumentFile({
        url: getReceiptDownloadUrl(paymentId),
        filename: `Receipt-${item.label}.pdf`,
        token,
      });
      Alert.alert('Download Complete', 'Your receipt has been saved to your Downloads folder.');
    } catch (error) {
      Alert.alert('Download Failed', error?.message || 'Receipt is not available yet.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStopMembershipAutoRenew = (membership) => {
    Alert.alert('Stop Auto-Renewal', `Stop auto-renewal for ${membership.planName}? It stays active until it expires.`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Stop Renewal',
        style: 'destructive',
        onPress: () => {
          stopAutoRenew(membership.id).unwrap().catch((error) => {
            Alert.alert('Failed', error?.message || 'Could not stop auto-renewal.');
          });
        },
      },
    ]);
  };

  const handleStopAddonAutoRenew = (sub) => {
    Alert.alert('Stop Auto-Renewal', `Stop auto-renewal for ${sub.packageName}?`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Stop Renewal',
        style: 'destructive',
        onPress: () => {
          setCancelingId(sub.id);
          cancelSubscription(sub.id)
            .unwrap()
            .catch((error) => {
              Alert.alert('Failed', error?.message || 'Could not stop auto-renewal.');
            })
            .finally(() => setCancelingId(null));
        },
      },
    ]);
  };

  const allItems = overview?.items || [];
  const autoRenewingAddons = (overview?.addonSubscriptions || []).filter(s => s.autoRenew);
  const hasAutoRenewals = !!overview?.autoRenewingMembership || autoRenewingAddons.length > 0;

  const lastPage = Math.max(1, Math.ceil(allItems.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const pagedItems = allItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Billing & Payments" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading billing overview…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load billing overview. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {overview && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, styles.statIconBoxRed]}>
                  <Icon name="error-outline" size={20} color="#EF4444" />
                </View>
                <Text style={styles.statLabel}>Outstanding</Text>
                <Text style={styles.statValue}>₹{overview.outstandingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, styles.statIconBoxGreen]}>
                  <Icon name="receipt-long" size={20} color="#10B981" />
                </View>
                <Text style={styles.statLabel}>Total Invoices</Text>
                <Text style={styles.statValue}>{allItems.length}</Text>
              </View>
            </View>

            {hasAutoRenewals && (
              <View style={styles.invoicesCard}>
                <View style={styles.autoRenewHeaderRow}>
                  <Icon name="autorenew" size={16} color="#10B981" />
                  <Text style={styles.sectionTitle}>Auto-renewal Settings</Text>
                </View>

                {overview.autoRenewingMembership && (
                  <View style={styles.autoRenewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.autoRenewName}>
                        {overview.autoRenewingMembership.planName} <Text style={styles.autoRenewType}>(membership)</Text>
                      </Text>
                      <Text style={styles.autoRenewMeta}>
                        Auto-renews{overview.autoRenewingMembership.nextRenewalAt ? ` on ${formatDate(overview.autoRenewingMembership.nextRenewalAt)}` : ''}
                        {overview.autoRenewingMembership.amount != null ? ` at ₹${overview.autoRenewingMembership.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.stopRenewBtn} onPress={() => handleStopMembershipAutoRenew(overview.autoRenewingMembership)} disabled={stopAutoRenewLoading}>
                      {stopAutoRenewLoading ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.stopRenewBtnText}>Stop Auto-renewal</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {autoRenewingAddons.map(sub => (
                  <View key={sub.id} style={styles.autoRenewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.autoRenewName}>
                        {sub.packageName} <Text style={styles.autoRenewType}>(monthly add-on)</Text>
                      </Text>
                      <Text style={styles.autoRenewMeta}>
                        {sub.currentPeriodEndsAt ? `Auto-renews on ${formatDate(sub.currentPeriodEndsAt)}` : `Status: ${sub.status}`}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.stopRenewBtn} onPress={() => handleStopAddonAutoRenew(sub)} disabled={cancelingId === sub.id}>
                      {cancelingId === sub.id ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.stopRenewBtnText}>Stop Auto-renewal</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.invoicesCard}>
              <View style={styles.tableHeaderRow}>
                <PageSizeField value={pageSize} onSelect={(v) => { setPageSize(v); setPage(1); }} />
                <View style={styles.listTitleRow}>
                  <Text style={styles.sectionTitle}>Invoices & Membership Dues</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{allItems.length}</Text>
                  </View>
                </View>
              </View>

              {allItems.length === 0 ? (
                <Text style={styles.emptyText}>No invoices yet.</Text>
              ) : (
                pagedItems.map((item, index) => {
                  const key = `${item.type}:${item.id}`;
                  const isPaying = payingKey === key;
                  const isDownloading = downloadingId === key;
                  const receiptId = resolveReceiptId(item);
                  return (
                    <View key={key} style={styles.invoiceRow}>
                      <View style={styles.invoiceTopRow}>
                        <Text style={styles.invoiceIndex}>{(currentPage - 1) * pageSize + index + 1}</Text>
                        <Text style={styles.invoiceDesc} numberOfLines={2}>{item.label}</Text>
                      </View>
                      <View style={styles.invoiceMetaRow}>
                        <Text style={styles.invoiceDate}>{formatDate(item.createdAt)}</Text>
                        <Text style={styles.invoiceAmount}>₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={styles.invoiceFooter}>
                        <View style={[styles.invoiceStatus, item.isPaid ? styles.invoiceStatusPaid : styles.invoiceStatusDue]}>
                          <Text style={[styles.invoiceStatusText, item.isPaid ? styles.invoiceStatusTextPaid : styles.invoiceStatusTextDue]}>
                            {item.isPaid ? 'Paid' : 'Outstanding'}
                          </Text>
                        </View>
                        {item.isPaid ? (
                          <TouchableOpacity style={styles.receiptBtn} activeOpacity={0.7} onPress={() => handleDownloadReceipt(item)} disabled={isDownloading || !receiptId}>
                            {isDownloading ? <ActivityIndicator size="small" color="#007AFF" /> : (
                              <>
                                <Icon name="file-download" size={16} color="#007AFF" />
                                <Text style={styles.receiptBtnText}>Receipt</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.payNowBtn} activeOpacity={0.7} onPress={() => handlePayNow(item)} disabled={isPaying}>
                            {isPaying ? <ActivityIndicator size="small" color="white" /> : (
                              <>
                                <Icon name="credit-card" size={16} color="white" />
                                <Text style={styles.payNowBtnText}>Pay Now</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {allItems.length > 0 && (
                <View style={styles.pagerFooter}>
                  <Text style={styles.pagerSummary}>
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, allItems.length)} of {allItems.length} entries
                  </Text>
                  {lastPage > 1 && (
                    <View style={styles.pagerRow}>
                      <TouchableOpacity style={[styles.pagerBtn, currentPage <= 1 && styles.pagerBtnDisabled]} disabled={currentPage <= 1} onPress={() => setPage(currentPage - 1)}>
                        <Icon name="chevron-left" size={18} color={currentPage <= 1 ? '#C4C9D2' : '#007AFF'} />
                      </TouchableOpacity>
                      <Text style={styles.pagerText}>{currentPage} / {lastPage}</Text>
                      <TouchableOpacity style={[styles.pagerBtn, currentPage >= lastPage && styles.pagerBtnDisabled]} disabled={currentPage >= lastPage} onPress={() => setPage(currentPage + 1)}>
                        <Icon name="chevron-right" size={18} color={currentPage >= lastPage ? '#C4C9D2' : '#007AFF'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  emptyText: { fontSize: 12.5, color: '#9CA3AF' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statIconBoxRed: { backgroundColor: '#FDECEC' },
  statIconBoxGreen: { backgroundColor: '#E6F7EF' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  invoicesCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },

  autoRenewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  autoRenewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  autoRenewName: { fontSize: 13.5, fontWeight: '700', color: '#111827' },
  autoRenewType: { fontSize: 12, fontWeight: '400', color: '#6B7280' },
  autoRenewMeta: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  stopRenewBtn: { borderWidth: 1, borderColor: '#EF4444', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  stopRenewBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pageSizeBox: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pageSizeText: { fontSize: 12.5, color: '#374151', fontWeight: '600' },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: '#E5F1FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { fontSize: 11.5, color: '#007AFF', fontWeight: '700' },

  invoiceRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  invoiceTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  invoiceIndex: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', width: 16 },
  invoiceDesc: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  invoiceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  invoiceDate: { fontSize: 12, color: '#6B7280' },
  invoiceAmount: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  invoiceStatusDue: { backgroundColor: '#FEF3C7' },
  invoiceStatusPaid: { backgroundColor: '#E6F7EF' },
  invoiceStatusText: { fontSize: 11, fontWeight: 'bold' },
  invoiceStatusTextDue: { color: '#D97706' },
  invoiceStatusTextPaid: { color: '#10B981' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#007AFF', minWidth: 90, justifyContent: 'center' },
  receiptBtnText: { fontSize: 12, fontWeight: '600', color: '#007AFF' },
  payNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FF7C1A', minWidth: 90, justifyContent: 'center' },
  payNowBtnText: { fontSize: 12, fontWeight: '600', color: 'white' },

  pagerFooter: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  pagerSummary: { fontSize: 11.5, color: '#9CA3AF' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  pagerBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { fontSize: 12.5, color: '#374151', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '40%', paddingBottom: 20, paddingTop: 10 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  modalOptionText: { fontSize: 14, color: '#111827' },
});

export default BillingPayments;
