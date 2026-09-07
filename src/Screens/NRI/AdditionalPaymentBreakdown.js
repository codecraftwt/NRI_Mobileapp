import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import { useBilling } from '../../Hooks/useBilling';
import { usePaymentGateways, gatewayIcon, GATEWAY_META } from '../../Hooks/usePaymentGateways';
import { runRazorpayPayment } from '../../Utils/paymentGateway';
import { typography } from '../../theme/typography';

// Amounts here follow the booking flow's USD convention (same as TicketDetail).
function formatUsd(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatGstLabel(rate) {
  if (rate == null) return 'GST';
  const pct = rate <= 1 ? rate * 100 : rate;
  const rounded = Number.isInteger(pct) ? pct : Number(pct.toFixed(2));
  return `GST (${rounded}%)`;
}

// Invoice-style breakdown + gateway picker shown before settling a
// staff-requested additional (extra-cost) charge on a ticket. Reached from
// TicketDetail's "Additional Payment Requested" card. All the summary numbers
// come from the ticket's own pricing (amount_due_now/amount_due_gst already
// equal this exact charge, verified live) — no extra fetch needed here.
// Pays via the same generic "pay this ticket's current balance" endpoint
// CustomPlanPayment.js uses (POST /customer/billing/ticket/{id}/pay).
function AdditionalPaymentBreakdown({ route, navigation }) {
  const {
    ticketId, ticketNumber, serviceName, reason,
    baseAmount, alreadyPaidAmount, additionalAmount, gstAmount, gstRate,
  } = route.params || {};

  const user = useSelector(s => s.user.user);
  const { pay: payBill, verifyPayment: verifyBillPayment } = useBilling();
  const { gateways, loading: gatewaysLoading } = usePaymentGateways();
  const { showAlert, alertProps } = useAppAlert();

  const amountPreGst = Math.max(0, Number(additionalAmount || 0) - Number(gstAmount || 0));

  const [selectedGateway, setSelectedGateway] = useState(null);
  useEffect(() => {
    if (gateways.length && !gateways.some(g => g.value === selectedGateway)) {
      setSelectedGateway(gateways[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateways]);

  const [paying, setPaying] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(null);

  const onPaid = () => {
    showAlert('Payment Successful', 'Your additional payment has been confirmed.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const handlePay = async () => {
    if (!ticketId || !selectedGateway) return;
    setPaying(true);
    try {
      const result = await payBill('ticket', ticketId, selectedGateway, false).unwrap();
      if (result.checkoutUrl) {
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId });
      } else if (result.order) {
        await runRazorpayPayment({
          order: result.order,
          paymentId: result.paymentId,
          name: 'NRI Circle',
          description: 'Additional payment',
          user,
          verify: (params) => verifyBillPayment(params).unwrap(),
        });
        onPaid();
      } else {
        onPaid();
      }
    } catch (error) {
      showAlert('Payment Failed', error?.message || 'Could not start payment. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleCheckoutSuccess = async (sessionId) => {
    const session = checkoutSession;
    setCheckoutSession(null);
    try {
      await verifyBillPayment({ paymentId: session?.paymentId, sessionId }).unwrap();
      onPaid();
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Complete Payment" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Icon name="request-quote" size={18} color="#92400E" style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            An additional payment was requested on <Text style={styles.infoBold}>{ticketNumber}</Text>{reason ? `: ${reason}` : ''}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="receipt-long" size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Charges Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base: {serviceName || 'Service'}</Text>
            <Text style={styles.summaryValue}>{formatUsd(baseAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.paidLabel]}>Already Paid</Text>
            <Text style={[styles.summaryValue, styles.paidLabel]}>−{formatUsd(alreadyPaidAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Additional charge{reason ? ` — ${reason}` : ''}</Text>
            <Text style={styles.summaryValue}>{formatUsd(amountPreGst)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{formatGstLabel(gstRate)}</Text>
            <Text style={styles.summaryValue}>{formatUsd(gstAmount)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.payableLabel}>Amount Payable</Text>
            <Text style={styles.payableValue}>{formatUsd(additionalAmount)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="credit-card" size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Choose Payment Method</Text>
          </View>

          {gatewaysLoading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 8 }} />
          ) : gateways.length === 0 ? (
            <Text style={styles.noGatewayText}>No payment method is currently available. Please try again later.</Text>
          ) : (
            gateways.map(g => {
              const active = g.value === selectedGateway;
              return (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.methodRow, active && styles.methodRowActive]}
                  onPress={() => setSelectedGateway(g.value)}
                  activeOpacity={0.8}
                >
                  <View style={styles.methodIconBox}>
                    <Icon name={gatewayIcon(g.value)} size={18} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodTitle}>{g.label}</Text>
                    {!!GATEWAY_META[g.value]?.desc && <Text style={styles.methodSub}>{GATEWAY_META[g.value].desc}</Text>}
                  </View>
                  <View style={styles.radioOuter}>{active && <View style={styles.radioInner} />}</View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.payBtn, (paying || !selectedGateway) && styles.payBtnDisabled]}
              onPress={handlePay}
              disabled={paying || !selectedGateway}
              activeOpacity={0.85}
            >
              {paying ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                <>
                  <Icon name="lock" size={15} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Pay {formatUsd(additionalAmount)}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.payLaterBtn} onPress={() => navigation.goBack()} disabled={paying} activeOpacity={0.85}>
              <Text style={styles.payLaterBtnText}>Pay Later</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.secureRow}>
            <View style={styles.secureItem}>
              <Icon name="verified-user" size={14} color="#059669" />
              <Text style={styles.secureText}>Secure SSL</Text>
            </View>
            <View style={styles.secureItem}>
              <Icon name="check-circle" size={14} color="#059669" />
              <Text style={styles.secureText}>Verified Gateways</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <StripeCheckoutModal
        visible={!!checkoutSession}
        checkoutUrl={checkoutSession?.url}
        title="Complete Payment"
        onSuccess={handleCheckoutSuccess}
        onCancel={() => setCheckoutSession(null)}
      />
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FB' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },

  infoBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#FEF9C3', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  infoBold: { fontFamily: typography.labelMedium.fontFamily, color: '#78350F', fontWeight: '700' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EEF0F5',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', fontWeight: '700' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#475569' },
  summaryValue: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  paidLabel: { color: '#059669' },
  divider: { height: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  payableLabel: { fontSize: 16, color: '#4F46E5', fontFamily: typography.h4.fontFamily, fontWeight: '700' },
  payableValue: { fontSize: 18, color: '#4F46E5', fontFamily: typography.h4.fontFamily, fontWeight: '700' },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, backgroundColor: '#FBFBFE' },
  methodRowActive: { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' },
  methodIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  methodSub: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  noGatewayText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14, minWidth: 140 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  payLaterBtn: { borderWidth: 1.5, borderColor: '#C7D2FE', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  payLaterBtnText: { color: '#4F46E5', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  secureRow: { flexDirection: 'row', gap: 18 },
  secureItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secureText: { fontSize: 12, color: '#059669', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
});

export default AdditionalPaymentBreakdown;
