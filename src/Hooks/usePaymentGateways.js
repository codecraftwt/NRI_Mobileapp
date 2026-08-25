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

// Used only as the initial/failure state before the first successful fetch —
// NOT force-injected into the list. Stripe, like Razorpay/PayPal, is now
// admin-toggleable server-side, so an empty/errored fetch must not assume
// Stripe is available.
const EMPTY_GATEWAYS = [];

// Fetches the payment gateways currently available to the customer. Call this
// on any screen with a gateway picker and build the buttons from `gateways`
// instead of hardcoding — the backend already applies NRI + admin-toggle
// gating (Stripe/PayPal/Razorpay all included), so a disabled/ineligible
// gateway simply won't be in the list.
export function usePaymentGateways() {
  const [gateways, setGateways] = useState(EMPTY_GATEWAYS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getPaymentGateways()
      .then(list => { setGateways(list || EMPTY_GATEWAYS); setError(null); })
      .catch(err => { setGateways(EMPTY_GATEWAYS); setError(err); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { gateways, loading, error, retry: load };
}
