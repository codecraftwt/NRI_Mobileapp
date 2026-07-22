import apiClient, { normalizeApiError } from './client';

// Recurring per-service subscriptions (Service.allows_recurring). A single
// subscription can bundle several services that share one billing interval.

function mapRequiredDocument(raw) {
  return {
    id: raw.id ?? raw.document_id ?? raw.key ?? raw.slug ?? raw.type,
    name: raw.name || raw.label || raw.title || raw.document_name || raw.type || 'Document',
    description: raw.description || raw.help || null,
    required: raw.required ?? raw.is_required ?? raw.mandatory ?? true,
  };
}

// The required-documents payload has been seen in a few shapes across this
// backend — a flat array, a { documents: [...] } / { required_documents: [...] }
// wrapper, or grouped per service (either keyed by id or as objects each
// carrying a `documents` array). Flatten whatever comes back to a single
// de-duplicated list of document definitions.
function extractDocumentList(payload) {
  const data = payload?.data ?? payload;
  let list = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (Array.isArray(data?.documents)) {
    list = data.documents;
  } else if (Array.isArray(data?.required_documents)) {
    list = data.required_documents;
  } else if (data && typeof data === 'object') {
    const values = Object.values(data);
    list = values.flatMap(v => (Array.isArray(v) ? v : Array.isArray(v?.documents) ? v.documents : []));
  }
  // A grouped array whose items each carry their own `documents` array.
  list = list.flatMap(item => (Array.isArray(item?.documents) ? item.documents : [item]));
  const seen = new Set();
  return list.filter(item => {
    const key = item?.id ?? item?.document_id ?? item?.key ?? item?.slug ?? item?.type ?? JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapSubscription(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    status: raw.status,
    statusLabel: raw.status_label || null,
    autoRenew: !!raw.auto_renew,
    billingInterval: raw.billing_interval || null,
    amount: raw.amount != null ? Number(raw.amount) : null,
    currency: raw.currency || 'USD',
    currentPeriodEndsAt: raw.current_period_ends_at || null,
    services: (raw.services || []).map(s => ({ id: s.id, name: s.name })),
  };
}

// Call before creating a subscription to know which document fields to render.
// Empty array means no documents are required for this selection.
export async function getRequiredDocuments(serviceIds = []) {
  try {
    const response = await apiClient.get('/customer/service-subscriptions/required-documents', {
      params: { service_ids: serviceIds },
    });
    if (__DEV__) console.log('[required-documents] raw response:', JSON.stringify(response.data));
    return extractDocumentList(response.data).map(mapRequiredDocument);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getServiceSubscriptions() {
  try {
    const response = await apiClient.get('/customer/service-subscriptions');
    const list = response.data?.data || response.data || [];
    return list.map(mapSubscription);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Multipart when the selection requires documents, JSON otherwise. All the
// selected services must share the same billing interval and allow recurring.
// `documents` is keyed by required-document id: { [docId]: { uri, name, type } }.
export async function createServiceSubscription({
  serviceIds, gateway, familyMemberId, propertyId, stateId, cityId, talukaId,
  address, customerNotes, documents,
}) {
  try {
    const docEntries = Object.entries(documents || {}).filter(([, file]) => !!file);
    const hasDocs = docEntries.length > 0;
    let response;

    if (hasDocs) {
      const formData = new FormData();
      (serviceIds || []).forEach(id => formData.append('service_ids[]', id));
      formData.append('gateway', gateway);
      formData.append('family_member_id', familyMemberId);
      if (propertyId) formData.append('property_id', propertyId);
      formData.append('state_id', stateId);
      if (cityId) formData.append('city_id', cityId);
      if (talukaId) formData.append('taluka_id', talukaId);
      formData.append('address', address);
      if (customerNotes) formData.append('customer_notes', customerNotes);
      docEntries.forEach(([docId, file]) => {
        formData.append(`documents[${docId}]`, { uri: file.uri, name: file.name, type: file.type || 'application/octet-stream' });
      });
      response = await apiClient.post('/customer/service-subscriptions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      response = await apiClient.post('/customer/service-subscriptions', {
        service_ids: serviceIds,
        gateway,
        family_member_id: familyMemberId,
        property_id: propertyId || undefined,
        state_id: stateId,
        city_id: cityId || undefined,
        taluka_id: talukaId || undefined,
        address,
        customer_notes: customerNotes || undefined,
      });
    }

    const data = response.data?.data || {};
    return {
      subscription: mapSubscription(data.subscription || data),
      checkoutUrl: data.checkout_url || null,
      planId: data.plan_id || null,
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Add a missing required document, or replace one already uploaded. Available
// any time the subscription isn't cancelled.
export async function addSubscriptionDocuments(subscriptionId, documents) {
  try {
    const formData = new FormData();
    Object.entries(documents || {}).forEach(([docId, file]) => {
      if (file) formData.append(`documents[${docId}]`, { uri: file.uri, name: file.name, type: file.type || 'application/octet-stream' });
    });
    const response = await apiClient.post(`/customer/service-subscriptions/${subscriptionId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Stop auto-renewal — the subscription stays active until the current period ends.
export async function cancelServiceSubscription(subscriptionId) {
  try {
    const response = await apiClient.post(`/customer/service-subscriptions/${subscriptionId}/cancel`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
