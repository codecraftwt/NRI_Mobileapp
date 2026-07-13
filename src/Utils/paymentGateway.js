import { Linking } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

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
    throw new Error(error?.description || 'The payment was not completed.');
  }
}

export function extractStripeSessionId(checkoutUrl) {
  const match = checkoutUrl?.match(/\/pay\/([^#]+)/);
  return match ? match[1] : null;
}

export function openStripeCheckout(checkoutUrl) {
  return Linking.openURL(checkoutUrl);
}
