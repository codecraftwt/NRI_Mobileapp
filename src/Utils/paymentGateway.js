import { Linking } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

// On some failure paths (e.g. bank/network declines), Razorpay's native SDK
// puts a JSON-stringified error object — {"error":{"code","description",
// "reason",...}} — into the `description` field instead of a plain
// sentence, so it shows up verbatim as raw JSON in the failure alert.
// Unwrap it to the human-readable message when that happens.
function extractRazorpayMessage(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed?.error?.description || parsed?.description || parsed?.error?.reason || null;
  } catch {
    return trimmed;
  }
}

// A gateway `order` from the backend is either a one-time order
// ({ order_id, amount, currency }) or a recurring subscription
// ({ subscription_id }) — e.g. membership checkout returns the former,
// add-on package subscriptions return the latter. Razorpay's SDK takes
// slightly different options for each, so this branches accordingly.
export async function openRazorpayCheckout({ order, name, description, user }) {
  const options = {
    key: order.key,
    name,
    description,
    prefill: { name: user?.name, email: user?.email, contact: user?.phone },
    theme: { color: '#007AFF' },
  };

  if (order.subscription_id) {
    options.subscription_id = order.subscription_id;
    // Required on Razorpay's native Android/iOS SDKs (react-native-razorpay
    // wraps these directly) alongside subscription_id — without it the
    // native checkout falls back to a plain one-time card-entry screen that
    // then gets declined as "does not support recurring payments" instead
    // of running the proper e-mandate authorization flow. Not needed on the
    // web/JS checkout, where subscription_id alone is sufficient.
    options.recurring = '1';
  } else {
    options.order_id = order.order_id;
    options.amount = order.amount;
    options.currency = order.currency;
  }

  try {
    const data = await RazorpayCheckout.open(options);
    return {
      razorpayOrderId: data.razorpay_order_id,
      razorpayPaymentId: data.razorpay_payment_id,
      razorpaySignature: data.razorpay_signature,
      razorpaySubscriptionId: data.razorpay_subscription_id,
    };
  } catch (error) {
    // react-native-razorpay rejects with { code, description } on
    // cancel/failure rather than an Error — normalize it so callers can
    // just read `error.message`.
    throw new Error(extractRazorpayMessage(error?.description) || 'The payment was not completed.');
  }
}

export function extractStripeSessionId(checkoutUrl) {
  const match = checkoutUrl?.match(/\/pay\/([^#]+)/);
  return match ? match[1] : null;
}

export function openStripeCheckout(checkoutUrl) {
  return Linking.openURL(checkoutUrl);
}
