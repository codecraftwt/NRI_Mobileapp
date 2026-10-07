import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import { useBilling } from '../../Hooks/useBilling';
import { useCustomPlanDetail } from '../../Hooks/useCustomPlanDetail';
import { gatewayIcon, GATEWAY_META } from '../../Hooks/usePaymentGateways';
import { useCurrencyGateways } from '../../Hooks/useCurrencyGateways';
import CurrencyToggle from '../../Components/CurrencyToggle';
import { runRazorpayPayment } from '../../Utils/paymentGateway';
import { formatAmount } from '../../Utils/currency';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// Invoice-settlement screen shown after a customer accepts a Custom Plan
// proposal, before the chosen gateway's checkout opens. Base price comes from
// the accepted proposal (proposed_price for USD, proposed_price_inr for
// INR — the backend quotes both up front, no live conversion needed); GST
// is added at 18% (matching the web invoice) in whichever currency is picked.
function CustomPlanPayment({ route, navigation }) {
  const { ticketNumber, ticketSubject, proposalMessage, basePrice, basePriceInr, replyId, supportTicketId, kind } = route.params || {};
  const { verifyPayment } = useBilling();
  const { payPlan, rejectPlan } = useCustomPlanDetail(supportTicketId);
  const { showAlert, alertProps } = useAppAlert();
  const user = useSelector(s => s.user.user);
  // Gateway list is backend-driven (already NRI + admin-toggle gated) — this
  // screen used to hardcode Stripe, so a customer whose account/region had
  // Stripe disabled server-side hit a dead-end "Stripe payments are currently
  // unavailable" error with no way to pick a different gateway.
  const { currency, setCurrency, gateways } = useCurrencyGateways();
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  useEffect(() => {
    if (gateways.length && !gateways.some(g => g.value === paymentMethod)) {
      setPaymentMethod(gateways[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateways]);

  // Return to the support/custom-plan chat, flagging this proposal reply as
  // paid so its "Pay Now" button is removed. Navigate with the ticket id
  // explicitly (not a bare merge:true) so we always land on the correct
  // thread — this screen lives in the Dashboard stack, so the chat opened
  // from another tab isn't in this stack for merge to find, and a fresh
  // instance needs the id (and kind, so it fetches from the right API) to load.
  const goBackPaid = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (supportTicketId != null) {
      navigation.replace('SupportTicketChat', { ticketId: supportTicketId, paidReplyId: replyId, kind });
    } else {
      navigation.goBack();
    }
  };

  const handleBackToChat = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (supportTicketId != null) {
      navigation.replace('SupportTicketChat', { ticketId: supportTicketId, kind });
    } else {
      navigation.goBack();
    }
  };

  const handleDecline = () => {
    showAlert(
      'Decline Proposal',
      'Are you sure you want to decline this proposal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectPlan(replyId).unwrap();
              handleBackToChat();
            } catch (error) {
              showAlert('Could Not Decline', error?.message || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const base = Number((currency === 'INR' ? basePriceInr : basePrice)) || 0;
  const gstRate = 0.18;
  const gstAmount = Math.round(base * gstRate * 100) / 100;
  const amountPayable = Math.round((base + gstAmount) * 100) / 100;

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(null);

  const handlePay = async () => {
    setPaying(true);
    try {
      const result = await payPlan(replyId, { gateway: paymentMethod, currency }).unwrap();
      if (result.checkoutUrl) {
        // Stripe / PayPal — hosted checkout page.
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId });
      } else if (result.order) {
        // Razorpay — no hosted page; drive the native SDK then verify inline.
        await runRazorpayPayment({
          order: result.order,
          paymentId: result.paymentId,
          name: 'NRI Circle',
          description: 'Custom plan payment',
          user,
          verify: (params) => verifyPayment(params).unwrap(),
        });
        setPaid(true);
        goBackPaid();
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
        <View style={styles.card}>
          {(ticketNumber || ticketSubject || proposalMessage) && (
            <View style={styles.proposalBox}>
              <View style={styles.proposalHeader}>
                <Icon name="description" size={16} color="#15803D" />
                <Text style={styles.proposalTitle}>Custom Plan Proposal</Text>
              </View>
              {!!(ticketNumber || ticketSubject) && (
                <Text style={styles.proposalMeta}>
                  {[ticketNumber, ticketSubject].filter(Boolean).join(' · ')}
                </Text>
              )}
              {!!proposalMessage && <Text style={styles.proposalMessage}>{proposalMessage}</Text>}
              <View style={styles.divider} />
            </View>
          )}

          <View style={styles.fieldSection}>
            <Text style={styles.sectionLabel}>Currency</Text>
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.sectionLabel}>Payment Method</Text>
            {gateways.map(g => {
              const active = paymentMethod === g.value;
              return (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.methodRow, active && styles.methodRowActive]}
                  activeOpacity={0.8}
                  onPress={() => setPaymentMethod(g.value)}
                >
                  <View style={[styles.methodIconBox, active && styles.methodIconBoxActive]}>
                    <Icon name={gatewayIcon(g.value)} size={20} color={active ? '#20304C' : '#64748B'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodTitle}>{g.label}</Text>
                    {!!GATEWAY_META[g.value]?.desc && <Text style={styles.methodSub}>{GATEWAY_META[g.value].desc}</Text>}
                  </View>
                  <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Services</Text>
              <Text style={styles.summaryValue}>1</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Services total</Text>
              <Text style={styles.summaryValue}>{formatAmount(base, currency)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Services GST (18%)</Text>
              <Text style={styles.summaryValue}>{formatAmount(gstAmount, currency)}</Text>
            </View>
          </View>

          <View style={styles.youPayBox}>
            <Text style={styles.youPayLabel}>You'll pay</Text>
            <Text style={styles.youPayValue}>{formatAmount(amountPayable, currency)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (paying || paid || !paymentMethod) && styles.submitBtnDisabled]}
            onPress={handlePay}
            disabled={paying || paid || !paymentMethod}
            activeOpacity={0.85}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Pay & start my service</Text>
                <Icon name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={handleBackToChat} disabled={paying} activeOpacity={0.7}>
            <Text style={styles.backLinkText}>Back to chat</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.declineLink} onPress={handleDecline} disabled={paying} activeOpacity={0.7}>
          <Icon name="cancel" size={15} color="#EF4444" />
          <Text style={styles.declineLinkText}>I've changed my mind — decline this proposal</Text>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 14 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },

  proposalBox: { gap: 6 },
  proposalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proposalTitle: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#15803D', fontWeight: '700' },
  proposalMeta: { fontSize: 11.5, color: '#64748B' },
  proposalMessage: { fontSize: 13.5, color: '#0F172A', lineHeight: 19 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 6 },

  fieldSection: { gap: 8 },
  sectionLabel: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700' },

  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  methodRowActive: {
    borderColor: '#20304C',
    borderWidth: 1.5,
    backgroundColor: '#F8FAFC',
  },
  methodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconBoxActive: {
    backgroundColor: '#EEF2F6',
  },
  methodTitle: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  methodSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: '#20304C' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#20304C' },

  summarySection: { gap: 8, paddingTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#64748B' },
  summaryValue: { fontSize: 14.5, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  youPayBox: {
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  youPayLabel: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A', fontWeight: '700' },
  youPayValue: { fontSize: 20, fontFamily: typography.h4.fontFamily, color: '#0F172A', fontWeight: '700' },

  submitBtn: {
    backgroundColor: '#D94625',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: '#D94625',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  backLink: { alignItems: 'center', paddingVertical: 4 },
  backLinkText: { fontSize: 13.5, color: '#64748B', fontFamily: typography.labelMedium.fontFamily },

  declineLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  declineLinkText: { fontSize: 13, color: '#EF4444', fontFamily: typography.labelMedium.fontFamily, fontWeight: '600', textDecorationLine: 'underline' },
});

export default CustomPlanPayment;
