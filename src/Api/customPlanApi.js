import apiClient, { normalizeApiError } from './client';
import { mapSupportTicket, mapSupportReply } from './supportTicketApi';

// Custom Plan is now its own resource — POST /customer/support-tickets no
// longer accepts category: "custom_plan" (breaking change), and this
// endpoint family replaces that path entirely. Detail/reply/escalate/
// accept-plan response shapes are identical to the old support-ticket ones,
// so mapSupportTicket/mapSupportReply are reused as-is.

export async function getCustomPlans({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/customer/custom-plans', { params });
    const list = response.data?.data || [];
    return {
      tickets: list.map(mapSupportTicket),
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

// Three possible outcomes, distinguished by the response shape:
//  - 201 { ticket }: created immediately (no service_id, or no fee owed).
//  - 200 { requires_payment: true, ... }: fee owed, has active membership —
//    same shape as POST /billing/{payableType}/{id}/pay; confirm via the
//    generic POST /customer/payments/{payment}/verify (paymentsApi.verifyPayment).
//  - 200 { requires_membership: true, ... }: fee owed, no membership yet —
//    nothing created; the caller must send the user through membership
//    checkout with custom_quote_service_id/subject/message attached instead.
// serviceId is the quoted catalog service (pricing.is_quoted === true) that
// carries the consultation fee — the "describe what you need" form now
// always attaches the shared "Custom Task" quoted service (see
// CustomPlanNew.js) so every request goes through the fee-bearing branch,
// while still sending state/city (needed for vendor availability regardless
// of which service is attached).
export async function createCustomPlan({ subject, message, serviceId, stateId, cityId, gateway }) {
  try {
    const response = await apiClient.post('/customer/custom-plans', {
      subject,
      message,
      service_id: serviceId || undefined,
      state_id: stateId || undefined,
      city_id: cityId || undefined,
      gateway: gateway || undefined,
    });
    const data = response.data?.data || {};
    if (data.requires_payment) {
      return {
        requiresPayment: true,
        paymentId: data.payment_id,
        checkoutUrl: data.checkout_url || null,
        order: data.order || null,
        amount: data.amount,
        currency: data.currency,
      };
    }
    if (data.requires_membership) {
      return {
        requiresMembership: true,
        serviceId: data.service_id,
        subject: data.subject,
        message: data.message,
        fee: data.fee ? { amount: data.fee.amount, currency: data.fee.currency } : null,
      };
    }
    return {
      ticket: mapSupportTicket(data.ticket || data),
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getCustomPlanDetail(ticketId) {
  try {
    const response = await apiClient.get(`/customer/custom-plans/${ticketId}`);
    const data = response.data?.data || response.data || {};
    const rawReplies = data.replies || data.messages || [];
    return {
      ticket: mapSupportTicket(data.ticket || data),
      replies: rawReplies.map(mapSupportReply),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function replyCustomPlan(ticketId, message) {
  try {
    const response = await apiClient.post(`/customer/custom-plans/${ticketId}/reply`, { message });
    const data = response.data?.data || {};
    return { ...mapSupportReply(data.reply || data.message || data), fromCustomer: true };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function escalateCustomPlan(ticketId) {
  try {
    const response = await apiClient.post(`/customer/custom-plans/${ticketId}/escalate`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function acceptCustomPlanProposal(ticketId, replyId) {
  try {
    const response = await apiClient.post(`/customer/custom-plans/${ticketId}/replies/${replyId}/accept-plan`);
    const data = response.data?.data || {};
    return { ...data, message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
