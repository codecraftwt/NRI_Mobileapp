import apiClient, { API_BASE_URL, normalizeApiError } from './client';

// Generic payment confirmation endpoint — shared across every payable type
// (membership, ticket, add-on package subscription). Razorpay: pass
// razorpayOrderId/razorpayPaymentId/razorpaySignature for a one-time order,
// or razorpaySubscriptionId for a recurring subscription. Stripe: pass sessionId.
export async function verifyPayment(paymentId, { razorpayOrderId, razorpayPaymentId, razorpaySignature, razorpaySubscriptionId, sessionId } = {}) {
  try {
    const response = await apiClient.post(`/customer/payments/${paymentId}/verify`, {
      razorpay_order_id: razorpayOrderId || undefined,
      razorpay_payment_id: razorpayPaymentId || undefined,
      razorpay_signature: razorpaySignature || undefined,
      razorpay_subscription_id: razorpaySubscriptionId || undefined,
      session_id: sessionId || undefined,
    });
    return { message: response.data?.message, data: response.data?.data || null };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapPayment(raw) {
  return {
    id: raw.id,
    receiptNumber: raw.receipt_number,
    amount: raw.amount,
    currency: raw.currency,
    gateway: raw.gateway,
    status: raw.status,
    paidAt: raw.paid_at,
    createdAt: raw.created_at,
  };
}

export async function getPaymentHistory({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/customer/payments', { params });
    const list = response.data?.data || [];
    return {
      payments: list.map(mapPayment),
      meta: {
        currentPage: response.data?.meta?.current_page ?? 1,
        lastPage: response.data?.meta?.last_page ?? 1,
        perPage: response.data?.meta?.per_page ?? list.length,
        total: response.data?.meta?.total ?? list.length,
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export function getReceiptDownloadUrl(paymentId) {
  return `${API_BASE_URL}/customer/payments/${paymentId}/receipt`;
}
