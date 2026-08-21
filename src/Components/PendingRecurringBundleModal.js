import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StripeCheckoutModal from './StripeCheckoutModal';
import { runRazorpayPayment } from '../Utils/paymentGateway';
import { useBilling } from '../Hooks/useBilling';
import { lightColors as colors, typography, radius, spacing } from '../theme';

function formatBundleAmount(bundle) {
  const symbol = bundle?.displayCurrency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(bundle?.displayAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Surfaces a membership checkout's pending recurring service — priced and
// shown up front but left unpaid because a checkout session can only ever
// produce one subscription (the membership itself). "Complete Payment" starts
// a fresh, standalone gateway checkout for just this bundle via
// POST /billing/checkout-bundles/{bundle}/subscribe-recurring, then reuses the
// same Stripe/Razorpay handling every other checkout in the app already uses.
export default function PendingRecurringBundleModal({ visible, bundle, onClose, onSuccess }) {
  const user = useSelector(s => s.user.user);
  const { subscribeRecurring, subscribeRecurringLoading, verifyPayment } = useBilling();
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const handleCompletePayment = async () => {
    if (!bundle?.bundleId) return;
    setError(null);
    try {
      const result = await subscribeRecurring(bundle.bundleId).unwrap();
      if (result.checkoutUrl) {
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId });
      } else if (result.order) {
        await runRazorpayPayment({
          order: result.order,
          paymentId: result.paymentId,
          name: 'NRI Circle Subscription',
          description: bundle.serviceNames,
          user,
          verify: (params) => verifyPayment(params).unwrap(),
        });
        onSuccess?.();
      }
    } catch (err) {
      // A subscription for this bundle is already active (e.g. a retried
      // tap) — nothing to do, treat it as success rather than an error.
      if (err?.status === 409) {
        onSuccess?.();
        return;
      }
      setError(err?.message || 'Could not start payment. Please try again.');
    }
  };

  const handleCheckoutSuccess = async (sessionId) => {
    const paymentId = checkoutSession?.paymentId;
    setCheckoutSession(null);
    setVerifying(true);
    try {
      await verifyPayment({ paymentId, sessionId }).unwrap();
      onSuccess?.();
    } catch (err) {
      setError(err?.message || 'Could not confirm this payment yet. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const busy = subscribeRecurringLoading || verifying;

  return (
    <>
      <Modal visible={visible && !checkoutSession} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon name="autorenew" size={30} color={colors.warning} />
            </View>
            <Text style={styles.title}>Complete Your Subscription</Text>
            <Text style={styles.desc}>
              {bundle?.serviceNames} is billed {bundle?.interval} and wasn't included in your last payment — it needs its own checkout.
            </Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Amount due</Text>
              <Text style={styles.amountValue}>{formatBundleAmount(bundle)}</Text>
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {busy ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <>
                <TouchableOpacity style={styles.payBtn} onPress={handleCompletePayment} activeOpacity={0.85}>
                  <Icon name="lock" size={16} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Complete Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
                  <Text style={styles.laterBtnText}>Maybe Later</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <StripeCheckoutModal
        visible={!!checkoutSession}
        checkoutUrl={checkoutSession?.url}
        onSuccess={handleCheckoutSuccess}
        onCancel={() => setCheckoutSession(null)}
        title="Secure Payment"
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h4, color: '#0F172A', textAlign: 'center' },
  desc: { ...typography.body, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  amountLabel: { ...typography.small, color: '#64748B' },
  amountValue: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  errorText: { ...typography.small, color: '#EF4444', textAlign: 'center', marginTop: spacing.sm },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radius.full,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.h2.fontFamily },
  laterBtn: { paddingVertical: 12, marginTop: 4 },
  laterBtnText: { ...typography.labelMedium, color: '#64748B' },
});
