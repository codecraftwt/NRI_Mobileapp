import { useState, useEffect, useCallback } from 'react';
import { getPaymentGateways } from '../Api/paymentsApi';

// Cosmetic per-gateway icon/description. The gateway LIST is always driven by
// the backend (GET /customer/payment-gateways) — this only supplies an icon
// and a friendly sub-label for known values (label text itself comes from the
// API response). Unknown values fall back to a generic icon and no desc.
export const GATEWAY_META = {
  stripe: { icon: 'credit-card', desc: 'Credit / Debit Card' },
  paypal: { icon: 'account-balance-wallet', desc: 'Pay with your PayPal account' },
  razorpay: { icon: 'payment', desc: 'UPI, cards & netbanking' },
};

export function gatewayIcon(value) {
  return GATEWAY_META[value]?.icon || 'payment';
}

// Stripe is always enabled server-side (only PayPal/Razorpay can be toggled
// off by admin), so it must always be offered — used both as the failure
// fallback and to guarantee Stripe is present in every list.
const STRIPE_FALLBACK = [{ value: 'stripe', label: 'Card (Stripe)' }];

// Guarantee Stripe is always available and first, then the admin-toggled
// gateways (Razorpay/PayPal) exactly as the endpoint returned them. So Razorpay
// enabling/disabling flows straight through, but Stripe never disappears.
function withStripe(list) {
  const others = (list || []).filter(g => g.value !== 'stripe');
  const stripe = (list || []).find(g => g.value === 'stripe') || STRIPE_FALLBACK[0];
  return [stripe, ...others];
}

// Fetches the payment gateways currently available to the customer. Call this
// on any screen with a gateway picker and build the buttons from `gateways`
// instead of hardcoding — the backend already applies NRI + admin-toggle
// gating, so a disabled/ineligible gateway simply won't be in the list.
export function usePaymentGateways() {
  const [gateways, setGateways] = useState(STRIPE_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getPaymentGateways()
      // Stripe is always kept in the list; Razorpay/PayPal appear only if the
      // endpoint returned them (i.e. admin-enabled + eligible).
      .then(list => { setGateways(withStripe(list)); setError(null); })
      .catch(err => { setGateways(STRIPE_FALLBACK); setError(err); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { gateways, loading, error, retry: load };
}
