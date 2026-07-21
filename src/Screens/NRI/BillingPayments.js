import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
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
        <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <FlatList
              data={PAGE_SIZE_OPTIONS}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setOpen(false); }}>
                  <Text style={[styles.modalOptionText, item === value && { color: colors.primary, fontFamily: typography.labelLarge.fontFamily }]}>{item}</Text>
                  {item === value && <Icon name="check" size={20} color={colors.primary} />}
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
  const { showAlert, alertProps } = useAppAlert();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a new function reference every render (not memoized by the
  // hook) — keeping it out of these deps avoids an infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

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
        showAlert('Payment Successful', `${item.label} has been paid.`);
      } else if (result.checkoutUrl) {
        openStripeCheckout(result.checkoutUrl);
        showAlert(
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
                    showAlert('Payment Successful', `${item.label} has been paid.`);
                  })
                  .catch((error) => {
                    showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
                  });
              },
            },
          ]
        );
      } else {
        retry();
        showAlert('Payment Successful', result.message || `${item.label} has been paid.`);
      }
    } catch (error) {
      showAlert('Payment Failed', error?.message || 'Could not complete payment. Please try again.');
    } finally {
      setPayingKey(null);
    }
  };

  const handlePayNow = (item) => {
    showAlert(
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
      showAlert('Download Complete', 'Your receipt has been saved to your Downloads folder.');
    } catch (error) {
      showAlert('Download Failed', error?.message || 'Receipt is not available yet.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStopMembershipAutoRenew = (membership) => {
    showAlert('Stop Auto-Renewal', `Stop auto-renewal for ${membership.planName}? It stays active until it expires.`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Stop Renewal',
        style: 'destructive',
        onPress: () => {
          stopAutoRenew(membership.id).unwrap().catch((error) => {
            showAlert('Failed', error?.message || 'Could not stop auto-renewal.');
          });
        },
      },
    ]);
  };

  const handleStopAddonAutoRenew = (sub) => {
    showAlert('Stop Auto-Renewal', `Stop auto-renewal for ${sub.packageName}?`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Stop Renewal',
        style: 'destructive',
        onPress: () => {
          setCancelingId(sub.id);
          cancelSubscription(sub.id)
            .unwrap()
            .catch((error) => {
              showAlert('Failed', error?.message || 'Could not stop auto-renewal.');
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
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
                <View style={styles.statHeaderRow}>
                  <View style={[styles.statIconBox, styles.statIconBoxRed]}>
                    <Icon name="error-outline" size={18} color={colors.error} />
                  </View>
                  <Text style={styles.statLabel}>Outstanding</Text>
                </View>
                <Text style={styles.statValue}>₹{overview.outstandingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHeaderRow}>
                  <View style={[styles.statIconBox, styles.statIconBoxGreen]}>
                    <Icon name="receipt-long" size={18} color={colors.success} />
                  </View>
                  <Text style={styles.statLabel}>Total Invoices</Text>
                </View>
                <Text style={styles.statValue}>{allItems.length}</Text>
              </View>
            </View>

            {hasAutoRenewals && (
              <View style={styles.autoRenewCard}>
                <View style={styles.autoRenewHeaderRow}>
                  <Icon name="autorenew" size={18} color={colors.success} />
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
                      {stopAutoRenewLoading ? <ActivityIndicator size="small" color={colors.error} /> : <Text style={styles.stopRenewBtnText}>Stop Auto-renewal</Text>}
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
                      {cancelingId === sub.id ? <ActivityIndicator size="small" color={colors.error} /> : <Text style={styles.stopRenewBtnText}>Stop Auto-renewal</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.invoicesContainer}>
              <View style={styles.sectionHeaderRow}>
                <PageSizeField value={pageSize} onSelect={(v) => { setPageSize(v); setPage(1); }} />
                <View style={styles.listTitleRow}>
                  <Text style={styles.sectionTitle}>Invoices & Dues</Text>
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
                    <View key={key} style={styles.invoiceCard}>
                      <View style={styles.invoiceTopRow}>
                        <View style={styles.invoiceIconBox}>
                          <Icon name="receipt" size={20} color={colors.primary} />
                        </View>
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
                            {isDownloading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                              <>
                                <Icon name="file-download" size={18} color={colors.primary} />
                                <Text style={styles.receiptBtnText}>Receipt</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.payNowBtn} activeOpacity={0.7} onPress={() => handlePayNow(item)} disabled={isPaying}>
                            {isPaying ? <ActivityIndicator size="small" color={colors.onAccent} /> : (
                              <>
                                <Icon name="credit-card" size={18} color={colors.onAccent} />
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
                        <Icon name="chevron-left" size={24} color={currentPage <= 1 ? colors.textPlaceholder : colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.pagerText}>{currentPage} / {lastPage}</Text>
                      <TouchableOpacity style={[styles.pagerBtn, currentPage >= lastPage && styles.pagerBtnDisabled]} disabled={currentPage >= lastPage} onPress={() => setPage(currentPage + 1)}>
                        <Icon name="chevron-right" size={24} color={currentPage >= lastPage ? colors.textPlaceholder : colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 20 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { fontSize: 15, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 16 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  emptyText: { fontSize: 15, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 10 },
  
  statsRow: { flexDirection: 'row', gap: 14 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 16, 
    elevation: 3 
  },
  statHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  statIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statIconBoxRed: { backgroundColor: '#FEF2F2' },
  statIconBoxGreen: { backgroundColor: '#DCFCE7' },
  statLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  
  autoRenewCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 16, 
    elevation: 4 
  },
  autoRenewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  autoRenewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  autoRenewName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  autoRenewType: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  autoRenewMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  stopRenewBtn: { borderWidth: 1, borderColor: '#EF4444', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  stopRenewBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  invoicesContainer: { marginTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  pageSizeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFFFFF' },
  pageSizeText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },

  invoiceCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 3 
  },
  invoiceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  invoiceIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  invoiceDesc: { fontSize: 15, fontWeight: '600', color: '#0F172A', flex: 1, lineHeight: 22 },
  
  invoiceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  invoiceDate: { fontSize: 14, color: '#64748B' },
  invoiceAmount: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  
  invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  invoiceStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  invoiceStatusDue: { backgroundColor: '#FFFBEB' },
  invoiceStatusPaid: { backgroundColor: '#DCFCE7' },
  invoiceStatusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  invoiceStatusTextDue: { color: '#B45309' },
  invoiceStatusTextPaid: { color: '#16A34A' },
  
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1E3A8A', minWidth: 90, justifyContent: 'center' },
  receiptBtnText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  payNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#D94625', minWidth: 90, justifyContent: 'center' },
  payNowBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  pagerFooter: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 16 },
  pagerSummary: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  pagerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '50%', paddingBottom: 40, paddingTop: 16 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
});

export default BillingPayments;
