// Formats an amount that came back from a payment-endpoint response, in
// whichever currency was actually charged. Not for catalog/quote numbers —
// those endpoints are USD-only and keep their own local formatters.
export function formatAmount(value, currency = 'USD') {
  const symbol = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return `${symbol}${Number(value || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
