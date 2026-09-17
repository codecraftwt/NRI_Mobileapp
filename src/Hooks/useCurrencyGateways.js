import { useMemo, useState } from 'react';
import { usePaymentGateways } from './usePaymentGateways';

// Wraps usePaymentGateways with a $ / ₹ currency choice. PayPal is USD-only
// server-side (gateway=paypal + currency=INR returns a 422) so it's filtered
// out of `gateways` whenever INR is selected — screens that already reset
// their selected gateway when it drops out of the list (nearly all of them)
// get correct PayPal-deselection for free.
export function useCurrencyGateways() {
  const { gateways: allGateways, loading, error, retry } = usePaymentGateways();
  const [currency, setCurrency] = useState('USD');

  const gateways = useMemo(
    () => allGateways.filter(g => !(currency === 'INR' && g.value === 'paypal')),
    [allGateways, currency]
  );

  return { currency, setCurrency, gateways, allGateways, loading, error, retry };
}
