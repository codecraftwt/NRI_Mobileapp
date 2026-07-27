import apiClient, { normalizeApiError } from './client';

function mapGeoRef(raw) {
  if (!raw) return null;
  return { id: raw.id, name: raw.name };
}

// GET /vendor/profile — full vendor profile (contact, bank, services,
// availability, documents, KYC, subscription, coverage).
function mapVendorProfile(raw) {
  if (!raw) return null;
  const bank = raw.bank || {};
  const kyc = raw.kyc || {};
  const sub = raw.subscription || {};
  const avail = raw.availability || {};
  return {
    id: raw.id,
    businessName: raw.business_name || '',
    vendorType: raw.vendor_type || '',
    status: raw.status || '',
    contactPhone: raw.contact_phone || '',
    contactEmail: raw.contact_email || '',
    address: raw.address || '',
    gstNumber: raw.gst_number || '',
    rating: {
      score: raw.rating?.score ?? null,
      label: raw.rating?.label || '',
    },
    totalJobs: raw.total_jobs ?? 0,
    bank: {
      bankName: bank.bank_name || '',
      accountName: bank.account_name || '',
      accountNumber: bank.account_number || '',
      ifsc: bank.ifsc || '',
      upiId: bank.upi_id || '',
    },
    kyc: {
      panVerified: !!kyc.pan_verified,
      aadhaarVerified: !!kyc.aadhaar_verified,
    },
    subscription: {
      plan: sub.plan || null,
      expiresAt: sub.expires_at || null,
      trialEnds: sub.trial_ends || null,
    },
    services: (raw.services || []).map(s => ({ id: s.id, name: s.name })),
    availability: {
      isAvailable: avail.is_available !== false,
      unavailableFrom: avail.unavailable_from || null,
      unavailableTo: avail.unavailable_to || null,
      reason: avail.reason || '',
    },
    geoCoverage: (raw.geo_coverage || []).map(g => ({
      id: g.id,
      state: mapGeoRef(g.state),
      city: mapGeoRef(g.city),
      taluka: mapGeoRef(g.taluka),
    })),
    documents: (raw.documents || []).map(d => ({
      id: d.id,
      documentType: d.document_type || '',
      status: d.status || '',
      rejectionReason: d.rejection_reason || null,
      url: d.url || null,
      uploadedAt: d.uploaded_at || null,
    })),
  };
}

export async function getVendorProfile() {
  try {
    const response = await apiClient.get('/vendor/profile');
    return mapVendorProfile(response.data?.data?.vendor || response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// PUT /vendor/profile — update contact/bank details + offered categories.
// `fields` is a snake_case-ready object; undefined keys are dropped so callers
// can send only what changed.
export async function updateVendorProfile(fields) {
  try {
    const body = {};
    Object.entries(fields || {}).forEach(([k, v]) => {
      if (v !== undefined) body[k] = v;
    });
    const response = await apiClient.put('/vendor/profile', body);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /vendor/profile/rates — read-only admin-set rates + rate-change requests.
function mapServiceRate(raw) {
  return {
    id: raw.id,
    state: mapGeoRef(raw.state),
    city: mapGeoRef(raw.city),
    service: mapGeoRef(raw.service),
    rate: raw.rate ?? null,
    recurringRate: raw.recurring_rate ?? null,
  };
}

function mapRateChangeRequest(raw) {
  return {
    id: raw.id,
    message: raw.message || '',
    status: raw.status || '',
    adminNotes: raw.admin_notes || null,
    createdAt: raw.created_at || null,
    reviewedAt: raw.reviewed_at || null,
  };
}

export async function getVendorRates() {
  try {
    const response = await apiClient.get('/vendor/profile/rates');
    const data = response.data?.data || response.data || {};
    return {
      ratesLocked: !!data.rates_locked,
      serviceRates: (data.service_rates || []).map(mapServiceRate),
      rateChangeRequests: (data.rate_change_requests || []).map(mapRateChangeRequest),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/profile/availability — available / unavailable (with date range
// + reason when going unavailable). Dates are 'YYYY-MM-DD' strings.
export async function updateVendorAvailability({ isAvailable, unavailableFrom, unavailableTo, reason }) {
  try {
    const response = await apiClient.post('/vendor/profile/availability', {
      is_available: isAvailable,
      unavailable_from: unavailableFrom || undefined,
      unavailable_to: unavailableTo || undefined,
      reason: reason || undefined,
    });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Nice display label for a document-type enum value (pan → "PAN Card").
function prettifyDocType(v) {
  const known = {
    pan: 'PAN Card',
    aadhaar: 'Aadhaar Card',
    gst: 'GST Certificate',
    passport: 'Passport',
    license: 'License',
    registration: 'Registration Certificate',
    cancelled_cheque: 'Cancelled Cheque',
  };
  const k = String(v || '').toLowerCase();
  return known[k] || k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// GET /vendor/profile/document-types — valid enum values for the upload picker.
// Tolerates a flat string array or objects ({value|key|type, label|name}).
export async function getVendorDocumentTypes() {
  try {
    const response = await apiClient.get('/vendor/profile/document-types');
    const list = response.data?.data || response.data || [];
    return list.map((item) => {
      if (typeof item === 'string') return { value: item, label: prettifyDocType(item) };
      const value = item.value ?? item.key ?? item.type ?? item.slug;
      return { value, label: item.label || item.name || prettifyDocType(value) };
    }).filter(t => t.value);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/profile/documents — multipart KYC/registration document upload.
// `file` is an RN picker object: { uri, name, type }.
export async function uploadVendorDocument({ documentType, file }) {
  try {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', { uri: file.uri, name: file.name, type: file.type || 'application/octet-stream' });
    const response = await apiClient.post('/vendor/profile/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// DELETE /vendor/profile/documents/{document}
export async function deleteVendorDocument(documentId) {
  try {
    const response = await apiClient.delete(`/vendor/profile/documents/${documentId}`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
