import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import { useBilling } from '../../Hooks/useBilling';
import { typography } from '../../theme/typography';

// Amounts here follow the booking flow's USD convention (same as Billing).
function formatUsd(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Invoice-settlement screen shown after a customer accepts a Custom Plan
// proposal, before the Stripe checkout opens. Base price comes from the
// accepted proposal; GST is added at 18% (matching the web invoice).
function CustomPlanPayment({ route, navigation }) {
  const { jobId, ticketNumber, basePrice, replyId, supportTicketId, kind } = route.params || {};
  const { pay: payBill, verifyPayment } = useBilling();
  const { showAlert, alertProps } = useAppAlert();

  // Return to the support/custom-plan chat, flagging this proposal reply as
  // paid so its "Pay Now" button is removed. Navigate with the ticket id
  // explicitly (not a bare merge:true) so we always land on the correct
  // thread — this screen lives in the Dashboard stack, so the chat opened
  // from another tab isn't in this stack for merge to find, and a fresh
  // instance needs the id (and kind, so it fetches from the right API) to load.
  const goBackPaid = () => {
    if (supportTicketId != null) {
      navigation.navigate('SupportTicketChat', { ticketId: supportTicketId, paidReplyId: replyId, kind });
    } else if (replyId != null) {
      navigation.navigate({ name: 'SupportTicketChat', params: { paidReplyId: replyId, kind }, merge: true });
    } else {
      navigation.goBack();
    }
  };

  const base = Number(basePrice) || 0;
  const gstRate = 0.18;
  const gstAmount = Math.round(base * gstRate * 100) / 100;
  const amountPayable = Math.round((base + gstAmount) * 100) / 100;

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(null);

  const handlePay = async () => {
    if (!jobId) {
      showAlert('Not Ready', 'This plan is not payable yet. Please try again in a moment.');
      return;
    }
    setPaying(true);
    try {
      const result = await payBill('ticket', jobId, 'stripe', false).unwrap();
      if (result.checkoutUrl) {
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId });
      } else {
        // Paid outright (no checkout step) — mark paid and go straight to chat.
        setPaid(true);
        goBackPaid();
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
      if (session?.paymentId) await verifyPayment({ paymentId: session.paymentId, sessionId }).unwrap();
      // Verified — no confirmation modal; disable Pay and return to the chat,
      // flagging this proposal reply as paid so its "Pay Now" button is gone.
      setPaid(true);
      goBackPaid();
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Complete Payment" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Icon name="info" size={18} color="#4F46E5" style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            Your service request {ticketNumber ? <Text style={styles.infoBold}>{ticketNumber}</Text> : 'has'} has been logged. Please complete the invoice settlement below to proceed with task assignment.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="receipt-long" size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Charges Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base: Custom Plan</Text>
            <Text style={styles.summaryValue}>{formatUsd(base)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST (18%)</Text>
            <Text style={styles.summaryValue}>{formatUsd(gstAmount)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.payableLabel}>Amount Payable</Text>
            <Text style={styles.payableValue}>{formatUsd(amountPayable)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="credit-card" size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Choose Payment Method</Text>
          </View>

          <View style={styles.methodRow}>
            <View style={styles.methodIconBox}>
              <Icon name="credit-card" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>Card (Stripe)</Text>
              <Text style={styles.methodSub}>Recommended for international cards (Visa, Mastercard, Amex)</Text>
            </View>
            <View style={styles.radioOuter}>
              <View style={styles.radioInner} />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.payBtn, (paying || paid) && styles.payBtnDisabled]} onPress={handlePay} disabled={paying || paid} activeOpacity={0.85}>
              {paying ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                <>
                  <Icon name="lock" size={15} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Pay {formatUsd(amountPayable)}</Text>
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

          <Text style={styles.footNote}>
            You can also settle this invoice later from your Billing page. The request will remain on hold until payment verification is completed.
          </Text>
        </View>
      </ScrollView>

      <StripeCheckoutModal
        visible={!!checkoutSession}
        checkoutUrl={checkoutSession?.url}
        title="Pay with Stripe"
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

  infoBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#EEF2FF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 19 },
  infoBold: { fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700' },

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
  divider: { height: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  payableLabel: { fontSize: 16, color: '#4F46E5', fontFamily: typography.h4.fontFamily, fontWeight: '700' },
  payableValue: { fontSize: 18, color: '#4F46E5', fontFamily: typography.h4.fontFamily, fontWeight: '700' },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#C7D2FE', borderRadius: 14, padding: 14, backgroundColor: '#FBFBFE' },
  methodIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  methodSub: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14, minWidth: 140 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  payLaterBtn: { borderWidth: 1.5, borderColor: '#C7D2FE', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  payLaterBtnText: { color: '#4F46E5', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  secureRow: { flexDirection: 'row', gap: 18 },
  secureItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secureText: { fontSize: 12, color: '#059669', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  footNote: { fontSize: 12, color: '#94A3B8', lineHeight: 17 },
});

export default CustomPlanPayment;
