import apiClient, { normalizeApiError } from './client';
import { mapReport } from './reportApi';

function mapCoupon(raw) {
  return {
    code: raw.code,
    description: raw.description,
    valueLabel: raw.value_label,
    minOrder: raw.min_order,
    validUntil: raw.valid_until,
    eligible: raw.eligible,
    reason: raw.reason,
    savings: raw.savings,
  };
}

function mapQuoteLine(raw) {
  return {
    serviceId: raw.service_id,
    name: raw.name,
    customerPrice: raw.customer_price,
  };
}

function mapQuote(raw) {
  return {
    customerPrice: raw.customer_price,
    addonsSubtotal: raw.addons_subtotal,
    expressSurcharge: raw.express_surcharge,
    expressWaived: raw.express_waived,
    discount: raw.discount,
    // Line items are GST-exclusive; GST is added once and baked into
    // total_amount only. gst_rate is a fraction (e.g. 0.18 for 18%).
    gstRate: raw.gst_rate,
    gstAmount: raw.gst_amount,
    totalAmount: raw.total_amount,
    lines: (raw.lines || []).map(mapQuoteLine),
  };
}

export async function getTicketCoupons({ addons, stateId }) {
  try {
    const response = await apiClient.post('/customer/tickets/coupons', { addons, state_id: stateId });
    const list = response.data?.data || response.data || [];
    return list.map(mapCoupon);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function validateTicketCoupon({ code, addons, stateId }) {
  try {
    const response = await apiClient.post('/customer/tickets/validate-coupon', {
      coupon_code: code,
      addons,
      state_id: stateId,
    });
    const data = response.data?.data || {};
    return { code: data.code, discount: data.discount, message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getTicketQuote({ serviceId, extraServices, addons, stateId, urgency, couponCode }) {
  try {
    const response = await apiClient.post('/customer/tickets/quote', {
      service_id: serviceId,
      extra_services: extraServices || [],
      addons: addons || [],
      state_id: stateId,
      urgency,
      coupon_code: couponCode || undefined,
    });
    if (__DEV__) console.log('[tickets/quote] raw response:', JSON.stringify(response.data));
    return mapQuote(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapTicketPricing(raw) {
  if (!raw) return null;
  return {
    customerPrice: raw.customer_price,
    expressSurcharge: raw.express_surcharge,
    expressWaived: raw.express_waived,
    discountAmount: raw.discount_amount,
    couponCode: raw.coupon_code,
    totalAmount: raw.total_amount,
    amountDueNow: raw.amount_due_now,
    isPaid: raw.is_paid,
  };
}

function mapTimelineEvent(raw) {
  return { from: raw.from, to: raw.to, note: raw.note, at: raw.at };
}

// Verified live via the backend's OpenAPI spec (POST /customer/tickets/{id}/rate
// takes {rating: 1-5, note?}) — but the shape of an ALREADY-submitted rating
// as it comes back embedded in ticket detail (`raw.rating`) was never
// observed live for the same reason as report above.
function mapRating(raw) {
  if (!raw) return null;
  return {
    value: raw.rating ?? raw.value ?? raw.stars ?? null,
    note: raw.note || raw.feedback || null,
    createdAt: raw.created_at || null,
  };
}

// Tolerant across the three shapes this backend returns a ticket in:
// the create-response (id/service/addons/pricing), the paginated list item
// (id/service/status/urgency/total_amount/is_paid/has_report/vendor — no
// `pricing` object, no `addons`), and the full detail payload (adds
// location/family_member/property/vendor/timeline/report/rating/sla_deadline).
function mapTicket(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    ticketNumber: raw.ticket_number,
    serviceName: raw.service?.name || null,
    addons: (raw.addons || []).map(a => ({ serviceId: a.service_id, name: a.name, customerPrice: a.customer_price })),
    status: raw.status,
    statusLabel: raw.status_label,
    urgency: raw.urgency,
    preferredDate: raw.preferred_date,
    pricing: mapTicketPricing(raw.pricing),
    totalAmount: raw.pricing?.total_amount ?? raw.total_amount,
    isPaid: raw.pricing?.is_paid ?? raw.is_paid,
    hasReport: !!raw.has_report,
    report: raw.report ? mapReport(raw.report) : null,
    vendorName: raw.vendor?.name || null,
    createdAt: raw.created_at,
    familyMember: raw.family_member ? { id: raw.family_member.id, name: raw.family_member.name } : null,
    property: raw.property ? { id: raw.property.id, nickname: raw.property.nickname } : null,
    location: raw.location ? {
      state: raw.location.state?.name || null,
      city: raw.location.city?.name || null,
      taluka: raw.location.taluka?.name || null,
      address: raw.location.address || null,
    } : null,
    customerNotes: raw.customer_notes || null,
    attachments: raw.attachments || [],
    timeline: (raw.timeline || []).map(mapTimelineEvent),
    rating: mapRating(raw.rating),
    slaDeadline: raw.sla_deadline || null,
    serviceStartedAt: raw.service_started_at || null,
    serviceCompletedAt: raw.service_completed_at || null,
  };
}

// Sends multipart when there are attachments (required by the API for file
// upload), plain JSON otherwise.
export async function createTicket({
  serviceId, extraServices, addons, couponCode, familyMemberId, propertyId,
  stateId, cityId, talukaId, address, urgency, preferredDate, customerNotes, files,
}) {
  try {
    const hasFiles = files && files.length > 0;
    let response;

    if (hasFiles) {
      const formData = new FormData();
      formData.append('service_id', serviceId);
      (extraServices || []).forEach(id => formData.append('extra_services[]', id));
      (addons || []).forEach(id => formData.append('addons[]', id));
      if (couponCode) formData.append('coupon_code', couponCode);
      if (familyMemberId) formData.append('family_member_id', familyMemberId);
      if (propertyId) formData.append('property_id', propertyId);
      formData.append('state_id', stateId);
      if (cityId) formData.append('city_id', cityId);
      if (talukaId) formData.append('taluka_id', talukaId);
      formData.append('address', address);
      formData.append('urgency', urgency);
      if (preferredDate) formData.append('preferred_date', preferredDate);
      if (customerNotes) formData.append('customer_notes', customerNotes);
      files.forEach(f => formData.append('attachments[]', { uri: f.uri, name: f.name, type: f.type || 'application/octet-stream' }));

      response = await apiClient.post('/customer/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      response = await apiClient.post('/customer/tickets', {
        service_id: serviceId,
        extra_services: extraServices && extraServices.length > 0 ? extraServices : undefined,
        addons: addons && addons.length > 0 ? addons : undefined,
        coupon_code: couponCode || undefined,
        family_member_id: familyMemberId || undefined,
        property_id: propertyId || undefined,
        state_id: stateId,
        city_id: cityId || undefined,
        taluka_id: talukaId || undefined,
        address,
        urgency,
        preferred_date: preferredDate || undefined,
        customer_notes: customerNotes || undefined,
      });
    }

    const data = response.data?.data || {};
    return {
      ticket: mapTicket(data.ticket),
      paymentRequired: !!data.payment_required,
      amountDue: data.amount_due,
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getTickets({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/customer/tickets', { params });
    const list = response.data?.data || [];
    const tickets = list.map(mapTicket);

    // Verified live: the list endpoint never returns a `vendor` field at all
    // (tried with `?with=vendor` / `?include=vendor` too — no effect), and
    // never returns `sla_deadline` either — both only come back on the
    // detail payload. Backfill both with a per-ticket detail fetch, but only
    // for tickets that could actually need one: a vendor can't be assigned
    // before status leaves 'new' (per the backend's own status workflow), so
    // that half is skipped for 'new' tickets to avoid a wasted detail
    // request (and its ngrok round trip) on every list load/refresh — this
    // was the main source of MyTickets' slow loading. SLA deadlines, though,
    // apply from the moment a ticket is created — verified live via GET
    // /customer/tickets/5, which came back with status "New" and an
    // already-passed sla_deadline — so that half is NOT skipped for 'new',
    // only for tickets that are already done (no further overdue risk once
    // completed/cancelled).
    const needsVendor = (t) => t.status !== 'new' && !t.vendorName;
    const needsSla = (t) => !['completed', 'cancelled'].includes(t.status) && t.slaDeadline == null;
    const ticketsNeedingDetail = tickets.filter(t => needsVendor(t) || needsSla(t));
    const detailResults = await Promise.allSettled(ticketsNeedingDetail.map(t => getTicketDetail(t.id)));
    const detailById = new Map();
    ticketsNeedingDetail.forEach((t, i) => {
      const result = detailResults[i];
      if (result.status === 'fulfilled' && result.value) detailById.set(t.id, result.value);
    });
    const ticketsEnriched = tickets.map(t => {
      const detail = detailById.get(t.id);
      if (!detail) return t;
      return {
        ...t,
        vendorName: detail.vendorName || t.vendorName,
        slaDeadline: detail.slaDeadline ?? t.slaDeadline,
      };
    });

    return {
      tickets: ticketsEnriched,
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

export async function getTicketDetail(ticketId) {
  try {
    const response = await apiClient.get(`/customer/tickets/${ticketId}`);
    return mapTicket(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Verified live via the backend's OpenAPI spec (GET /docs?api-docs.json):
// POST /customer/tickets/{ticket}/rate, body {rating: 1-5, note?}, 422s with
// "Ticket not completed yet" if rated before the service is done.
export async function rateTicket(ticketId, { rating, note }) {
  try {
    const response = await apiClient.post(`/customer/tickets/${ticketId}/rate`, {
      rating,
      note: note || undefined,
    });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
