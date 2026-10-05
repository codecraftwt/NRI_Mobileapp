import apiClient, { normalizeApiError } from '../client';

function num(v) {
  if (v == null || isNaN(v)) return 0;
  return Number(v);
}

function titleCase(s) {
  return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function mapTelecallerServiceRequest(raw = {}) {
  const customer = raw.customer || {};
  const service = raw.service || {};
  const vendor = raw.assigned_vendor || raw.vendor || {};
  const location = raw.location || {};

  const priorityObj = raw.priority || raw.urgency;
  const prioritySlug = typeof priorityObj === 'object' && priorityObj ? (priorityObj.slug || priorityObj.name) : String(priorityObj || 'standard');
  const priorityLabel = typeof priorityObj === 'object' && priorityObj ? (priorityObj.name || priorityObj.slug) : titleCase(prioritySlug);

  const rawPricing = raw.pricing || {};
  const customerPrice = num(rawPricing.customer_price ?? raw.customer_price ?? raw.amount ?? raw.total_amount);
  const vendorCost = num(rawPricing.vendor_cost ?? raw.vendor_cost ?? raw.cost);
  const expressSurcharge = num(rawPricing.express_surcharge ?? raw.express_surcharge ?? raw.surcharge);
  const gstAmount = num(rawPricing.gst_amount ?? raw.gst_amount ?? raw.gst ?? raw.tax);
  const gstRate = num(rawPricing.gst_rate ?? raw.gst_rate ?? raw.gst_percent ?? 18);
  const totalAmount = num(rawPricing.total ?? raw.total ?? raw.total_amount ?? (customerPrice + gstAmount));
  const margin = num(rawPricing.margin ?? (customerPrice - vendorCost));
  const amountDueNow = num(rawPricing.amount_due_now ?? raw.amount_due_now);
  const pendingCharge = rawPricing.pending_additional_charge || raw.pending_additional_charge || null;
  const requiresPriceConfirmation = Boolean(rawPricing.requires_price_confirmation ?? raw.requires_price_confirmation);
  const canProposePrice = Boolean(rawPricing.can_propose_price ?? raw.can_propose_price);

  const additionalPaymentRequests = Array.isArray(raw.additional_payment_requests || raw.additional_charges || raw.payment_requests)
    ? (raw.additional_payment_requests || raw.additional_charges || raw.payment_requests).map(p => ({
        id: p.id || String(Math.random()),
        amount: num(p.amount),
        displayAmount: p.display_amount,
        displayCurrency: p.display_currency || 'USD',
        status: p.status || 'pending',
        reason: p.reason || p.description || p.note || 'Extra price',
        createdAt: p.created_at || null,
      }))
    : (pendingCharge ? [{
        id: 'pending-charge',
        amount: num(pendingCharge.amount),
        displayAmount: pendingCharge.display_amount,
        displayCurrency: pendingCharge.display_currency || 'USD',
        status: 'pending',
        reason: pendingCharge.reason || pendingCharge.description || pendingCharge.note || 'Extra price',
        createdAt: null,
      }] : []);

  const rawVendorChat = raw.vendor_chat || {};
  const vendorChatMessages = Array.isArray(rawVendorChat)
    ? rawVendorChat
    : (Array.isArray(rawVendorChat.messages) ? rawVendorChat.messages : []);
  const vendorChatVendor = rawVendorChat.vendor || raw.assigned_vendor || raw.vendor || {};

  const vendorChat = vendorChatMessages.map(m => {
    const senderSide = (m.sender_side || m.sender_role || (m.is_vendor ? 'vendor' : 'staff')).toLowerCase();
    return {
      id: m.id || String(Math.random()),
      senderSide,
      senderRole: senderSide,
      senderName: m.user?.name || m.sender_name || (senderSide === 'vendor' ? (vendorChatVendor.business_name || vendorChatVendor.name || 'Vendor') : 'Staff'),
      message: m.message || m.text || '',
      readAt: m.read_at || null,
      createdAt: m.created_at || m.sent_at || null,
    };
  });

  return {
    id: raw.id,
    ticketNumber: raw.ticket_number || raw.ticket || raw.reference_number || (raw.id ? `NRI-${raw.id}` : ''),
    status: (raw.status || 'new').toLowerCase(),
    statusLabel: raw.status_label || titleCase(raw.status || 'New'),
    urgency: prioritySlug.toLowerCase(),
    urgencyLabel: priorityLabel,
    priority: prioritySlug.toLowerCase(),
    priorityLabel,
    createdAt: raw.created_at || null,
    preferredDate: raw.preferred_date || null,
    serviceName: service.name || raw.service_name || raw.title || 'Service Request',
    serviceCategory: raw.category?.name || raw.service_category || null,
    customer: {
      id: customer.id || raw.customer_id,
      name: customer.name || raw.customer_name || 'Customer',
      email: customer.email || raw.customer_email || null,
      phone: customer.phone || raw.customer_phone || null,
    },
    vendor: vendor.id || raw.vendor_id ? {
      id: vendor.id || raw.vendor_id,
      name: vendor.business_name || vendor.name || raw.vendor_name || 'Assigned Vendor',
      businessName: vendor.business_name || vendor.name || null,
      phone: vendor.phone || null,
      email: vendor.email || null,
      rating: vendor.rating != null ? Number(vendor.rating) : null,
      assignedAt: raw.vendor_assigned_at || vendor.assigned_at || null,
    } : null,
    telecaller: (raw.assigned_telecaller || raw.telecaller) ? {
      id: (raw.assigned_telecaller || raw.telecaller)?.id || null,
      name: (raw.assigned_telecaller || raw.telecaller)?.name || (typeof (raw.assigned_telecaller || raw.telecaller) === 'string' ? (raw.assigned_telecaller || raw.telecaller) : null),
      email: (raw.assigned_telecaller || raw.telecaller)?.email || null,
      phone: (raw.assigned_telecaller || raw.telecaller)?.phone || null,
    } : (raw.telecaller_name ? { name: raw.telecaller_name } : null),
    location: {
      address: raw.address || location.address || null,
      cityName: location.city?.name || raw.city_name || (typeof raw.city === 'string' ? raw.city : raw.city?.name) || null,
      districtName: location.district?.name || raw.district_name || (typeof raw.district === 'string' ? raw.district : raw.district?.name) || null,
      stateName: location.state?.name || raw.state_name || (typeof raw.state === 'string' ? raw.state : raw.state?.name) || null,
      pincode: raw.pincode || location.pincode || null,
    },
    familyMember: raw.family_member?.name || raw.family_member_name || (typeof raw.family_member === 'string' ? raw.family_member : null),
    property: raw.property?.name || raw.property_name || null,
    pricing: {
      customerPrice,
      vendorCost,
      expressSurcharge,
      gst: gstAmount,
      gstPercent: gstRate,
      margin,
      totalAmount,
      amountDueNow,
      pendingAdditionalCharge: pendingCharge ? {
        amount: num(pendingCharge.amount),
        displayAmount: pendingCharge.display_amount,
        displayCurrency: pendingCharge.display_currency || 'USD',
        reason: pendingCharge.reason || pendingCharge.description || pendingCharge.note || 'Extra price',
      } : null,
      requiresPriceConfirmation,
      currency: raw.currency || 'INR',
    },
    additionalPaymentRequests,
    chatId: raw.chat_id || raw.support_chat_id || null,
    chatUnread: Boolean(raw.chat_unread ?? raw.unread_chat),
    canProposePrice,
    canGiveFeedback: Boolean(raw.can_give_feedback),
    statusHistory: Array.isArray(raw.status_history || raw.timeline || raw.history)
      ? (raw.status_history || raw.timeline || raw.history).map(h => ({
          status: h.status || '',
          label: h.label || titleCase(h.status),
          changedAt: h.created_at || h.changed_at || h.date,
          changedBy: h.changed_by || h.user_name || h.author || '',
          comment: h.comment || h.note || null,
          isCompleted: Boolean(h.completed ?? true),
        }))
      : [],
    vendorChat,
    callLogs: Array.isArray(raw.call_logs || raw.calls)
      ? (raw.call_logs || raw.calls).map(c => ({
          id: c.id,
          title: c.party_name || c.title || c.subject || `${c.party_type_label || c.target_type || 'Vendor'} call`,
          partyType: c.party_type || c.target_type || (c.is_vendor ? 'vendor' : 'customer'),
          partyTypeLabel: c.party_type_label || (c.party_type ? titleCase(c.party_type) : null),
          partyName: c.party_name || c.target_name || c.contact_name || '',
          by: c.by ? { id: c.by.id, name: c.by.name } : (c.caller ? { name: c.caller.name } : null),
          byName: c.by?.name || c.caller?.name || c.user_name || '',
          purpose: c.purpose || '',
          purposeLabel: c.purpose_label || (c.purpose ? titleCase(c.purpose) : ''),
          outcome: c.outcome || c.status || '',
          outcomeLabel: c.outcome_label || (c.outcome ? titleCase(c.outcome) : ''),
          direction: c.direction || 'outbound',
          duration: c.duration ? `${c.duration}s` : null,
          createdAt: c.created_at || c.date || null,
          note: c.notes || c.note || c.summary || null,
        }))
      : [],
    internalNotes: Array.isArray(raw.internal_notes || raw.notes)
      ? (raw.internal_notes || raw.notes).map(n => ({
          id: n.id,
          author: n.author || n.user_name || 'Staff',
          note: typeof n === 'string' ? n : (n.note || n.message || ''),
          createdAt: n.created_at || null,
        }))
      : [],
    feedback: raw.feedback || raw.customer_feedback || null,
    report: raw.report ? {
      id: raw.report.id,
      reportText: raw.report.report_text || raw.report.text || '',
      vendor: raw.report.vendor ? {
        id: raw.report.vendor.id,
        businessName: raw.report.vendor.business_name || raw.report.vendor.name || '',
      } : null,
      media: Array.isArray(raw.report.media) ? raw.report.media : [],
      submittedAt: raw.report.submitted_at || null,
      reviewedAt: raw.report.reviewed_at || null,
      sentToCustomerAt: raw.report.sent_to_customer_at || null,
    } : null,
    raw,
  };
}

/**
 * GET /api/v1/telecaller/service-requests
 * Fetch paginated telecaller service requests with tabs & filters
 */
export async function getTelecallerServiceRequests(params = {}) {
  try {
    const cleanParams = {};
    if (params.view && params.view !== 'all') cleanParams.view = params.view;
    if (params.search) cleanParams.search = params.search;
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.urgency && params.urgency !== 'all') cleanParams.urgency = params.urgency;
    if (params.category_id) cleanParams.category_id = params.category_id;
    if (params.state_id) cleanParams.state_id = params.state_id;
    if (params.district_id) cleanParams.district_id = params.district_id;
    if (params.date_from) cleanParams.date_from = params.date_from;
    if (params.date_to) cleanParams.date_to = params.date_to;
    if (params.mine) cleanParams.mine = 1;
    if (params.unread) cleanParams.unread = 1;
    if (params.page) cleanParams.page = params.page;

    const response = await apiClient.get('/telecaller/service-requests', { params: cleanParams });
    const data = response.data?.data || response.data || {};
    const itemsRaw = Array.isArray(data) ? data : (data.requests || data.data || data.items || []);
    const metaRaw = response.data?.meta || data.meta || {};

    return {
      requests: itemsRaw.map(mapTelecallerServiceRequest),
      meta: {
        currentPage: num(metaRaw.current_page || 1),
        lastPage: num(metaRaw.last_page || 1),
        total: num(metaRaw.total || itemsRaw.length),
        perPage: num(metaRaw.per_page || 15),
        tabCounts: {
          all: num(metaRaw.tab_counts?.all ?? metaRaw.tabCounts?.all),
          needsVendor: num(metaRaw.tab_counts?.needs_vendor ?? metaRaw.tabCounts?.needs_vendor),
          open: num(metaRaw.tab_counts?.open ?? metaRaw.tabCounts?.open),
          needsReview: num(metaRaw.tab_counts?.needs_review ?? metaRaw.tabCounts?.needs_review),
          closed: num(metaRaw.tab_counts?.closed ?? metaRaw.tabCounts?.closed),
        },
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * GET /api/v1/telecaller/service-requests/{ticket}
 * Fetch detailed request info
 */
export async function getTelecallerServiceRequestDetail(ticketId) {
  try {
    const response = await apiClient.get(`/telecaller/service-requests/${ticketId}`);
    const raw = response.data?.data?.request || response.data?.data || response.data?.request || response.data || {};
    return mapTelecallerServiceRequest(raw);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/service-requests
 * Create a new service request on behalf of a customer
 */
export async function createTelecallerServiceRequest(payload) {
  try {
    const response = await apiClient.post('/telecaller/service-requests', {
      customer_id: payload.customer_id || payload.customerId,
      service_id: payload.service_id || payload.serviceId,
      urgency: payload.urgency || 'standard',
      customer_price: payload.customer_price != null ? Number(payload.customer_price) : undefined,
      vendor_cost: payload.vendor_cost != null ? Number(payload.vendor_cost) : undefined,
      express_surcharge: payload.express_surcharge != null ? Number(payload.express_surcharge) : 0,
      preferred_date: payload.preferred_date || payload.preferredDate || null,
      vendor_completion_deadline: payload.vendor_completion_deadline || payload.vendorCompletionDeadline || null,
      vendor_id: payload.vendor_id || payload.vendorId || null,
      family_member_id: payload.family_member_id || payload.familyMemberId || null,
      property_id: payload.property_id || payload.propertyId || null,
      state_id: payload.state_id || payload.stateId || null,
      city_id: payload.city_id || payload.cityId || null,
      taluka_id: payload.taluka_id || payload.talukaId || null,
      address: payload.address || '',
      customer_notes: payload.customer_notes || payload.customerNotes || '',
      internal_notes: payload.internal_notes || payload.internalNotes || '',
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/service-requests/price
 * Preview pricing for a new request
 */
export async function getTelecallerServiceRequestPrice(payload) {
  try {
    const response = await apiClient.post('/telecaller/service-requests/price', {
      service_id: payload.service_id || payload.serviceId,
      city_id: payload.city_id || payload.cityId,
      urgency: payload.urgency || 'standard',
    });
    return response.data?.data?.quote || response.data?.quote || response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/service-requests/{ticket}/notes
 * Add an internal note
 */
export async function addTelecallerRequestNote(ticketId, note) {
  try {
    const response = await apiClient.post(`/telecaller/service-requests/${ticketId}/notes`, { note });
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/service-requests/{ticket}/vendor-chat
 * Message the assigned vendor privately
 */
export async function sendTelecallerVendorChatMessage(ticketId, message) {
  try {
    const response = await apiClient.post(`/telecaller/service-requests/${ticketId}/vendor-chat`, { message });
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/service-requests/{ticket}/propose-quoted-price
 * Propose price for quote-only service
 */
export async function proposeTelecallerQuotedPrice(ticketId, payload) {
  try {
    const response = await apiClient.post(`/telecaller/service-requests/${ticketId}/propose-quoted-price`, {
      amount: Number(payload.amount),
      reason: payload.reason || '',
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/service-requests/{ticket}/feedback
 * Rate the customer on this request
 */
export async function submitTelecallerCustomerFeedback(ticketId, payload) {
  try {
    const response = await apiClient.post(`/telecaller/service-requests/${ticketId}/feedback`, {
      rating: Number(payload.rating || 5),
      note: payload.note || '',
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
