import apiClient, { normalizeApiError, API_BASE_URL } from './client';

// Response field names aren't fully pinned in the backend's OpenAPI schema, so
// these mappers stay tolerant across a few plausible snake_case shapes —
// consistent with the other vendor mappers.

function statusLabel(s) {
  const k = String(s || '').toLowerCase();
  if (k === 'in_progress' || k === 'in progress') return 'In Progress';
  if (k === 'completed') return 'Completed';
  if (k === 'assigned') return 'Assigned';
  if (k === 'new') return 'New';
  if (k === 'cancelled' || k === 'canceled') return 'Cancelled';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'New';
}

function capitalize(s) {
  if (!s) return 'Standard';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildLocation(loc, raw = {}) {
  if (!loc) return [raw.city, raw.state].filter(Boolean).join(', ');
  if (typeof loc === 'string') return loc;
  return [loc.city, loc.state].filter(Boolean).join(', ');
}

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// List item for the job queue.
export function mapJob(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.ticket_id,
    ticket: raw.ticket_number || raw.ticket?.ticket_number || (raw.id ? `#${raw.id}` : '—'),
    service: raw.service_name || raw.service?.name || raw.service || '',
    location: buildLocation(raw.location, raw),
    slaDeadline: formatDateTime(raw.sla_deadline || raw.deadline),
    status: statusLabel(raw.status),
    priority: capitalize(raw.priority || raw.urgency),
    price: raw.vendor_price ?? raw.price ?? raw.payout ?? null,
    notes: raw.customer_notes || raw.notes || '',
  };
}

// Full job detail.
export function mapJobDetail(raw) {
  if (!raw) return null;
  const customer = raw.customer || {};
  const loc = raw.location || {};
  const report = raw.report || raw.submitted_report || raw.vendor_report || null;
  const history = raw.status_history || raw.timeline || raw.history || [];
  return {
    id: raw.id ?? raw.ticket_id,
    ticket: raw.ticket_number || (raw.id ? `#${raw.id}` : '—'),
    service: raw.service_name || raw.service?.name || raw.service || '',
    status: statusLabel(raw.status),
    priority: capitalize(raw.priority || raw.urgency),
    completeBy: formatDateTime(raw.sla_deadline || raw.deadline) || '—',
    payout: Number(raw.vendor_price ?? raw.price ?? raw.payout ?? 0),
    customer: {
      name: customer.name || raw.customer_name || '—',
      phone: customer.phone || raw.customer_phone || '',
    },
    address: {
      line: loc.address || loc.line || raw.address || '—',
      city: buildLocation(loc, raw),
    },
    addons: Array.isArray(raw.addons)
      ? raw.addons.map(a => a?.name || a?.service_name || a).filter(Boolean)
      : [],
    committedEta: formatDateTime(raw.committed_eta || raw.vendor_eta || raw.committed_at),
    report: report?.note || report?.text || report?.summary || report?.description || null,
    reportFile: report?.file_url || report?.file || report?.attachment_url || null,
    sharedWithCustomer: report?.shared_with_customer ?? report?.shared ?? false,
    reportSubmittedAt: formatDateTime(report?.submitted_at || report?.created_at),
    timeline: (history || []).map(h => ({
      status: statusLabel(h.to || h.status),
      date: formatDateTime(h.at || h.created_at || h.date),
      note: h.note || h.description || h.message || '',
    })),
  };
}

// GET /vendor/jobs?status=&page= — "Job queue". Paginated; meta.counts has
// assigned / in_progress / completed totals.
export async function getVendorJobs({ status, page } = {}) {
  try {
    const params = {};
    if (status) params.status = status;
    if (page) params.page = page;
    const response = await apiClient.get('/vendor/jobs', { params });
    const list = response.data?.data || [];
    const rawMeta = response.data?.meta || {};
    const counts = rawMeta.counts || {};
    return {
      jobs: list.map(mapJob).filter(Boolean),
      counts: {
        assigned: counts.assigned ?? 0,
        in_progress: counts.in_progress ?? counts.inProgress ?? 0,
        completed: counts.completed ?? 0,
      },
      meta: {
        currentPage: rawMeta.current_page ?? 1,
        lastPage: rawMeta.last_page ?? 1,
        perPage: rawMeta.per_page ?? list.length,
        total: rawMeta.total ?? list.length,
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /vendor/jobs/{ticket} — job detail. 403 if assigned to another vendor.
export async function getVendorJobDetail(ticket) {
  try {
    const response = await apiClient.get(`/vendor/jobs/${ticket}`);
    const data = response.data?.data || response.data || {};
    return mapJobDetail(data.job || data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Absolute URL for the auto-generated invoice PDF — passed to the auth-aware
// downloader (react-native-blob-util) so the Bearer token is attached.
// GET /vendor/jobs/{ticket}/invoice returns a PDF (422 if not completed).
export function getVendorJobInvoiceUrl(ticket) {
  const base = String(API_BASE_URL || '').replace(/\/$/, '');
  return `${base}/vendor/jobs/${ticket}/invoice`;
}
