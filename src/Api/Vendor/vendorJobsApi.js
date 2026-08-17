import apiClient, { normalizeApiError, API_BASE_URL, postMultipart } from '../client';
import { mapSupportTicket, mapSupportReply } from '../supportTicketApi';

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
    service: raw.service_name || raw.service?.name || (typeof raw.service === 'string' ? raw.service : '') || '',
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
  const reportMedia = Array.isArray(report?.media)
    ? report.media.filter(Boolean)
    : (report?.media ? [report.media] : []);
  const tracking = raw.tracking || {};
  const history = raw.status_logs || raw.status_history || raw.timeline || raw.history || [];
  return {
    id: raw.id ?? raw.ticket_id,
    ticket: raw.ticket_number || (raw.id ? `#${raw.id}` : '—'),
    service: raw.service_name || raw.service?.name || (typeof raw.service === 'string' ? raw.service : '') || '',
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
      ? raw.addons
          .map(a => {
            if (typeof a === 'string') return a;
            if (!a) return '';
            // Tolerate the several shapes an addon comes in: {name}, {service_name},
            // {service: 'x'} or {service: {name: 'x'}} — never fall through to the
            // raw object (React can't render it).
            return a.name || a.service_name || a.service?.name || (typeof a.service === 'string' ? a.service : '') || '';
          })
          .filter(Boolean)
      : [],
    // Documents the customer attached to the request (viewable by the vendor).
    customerDocuments: (raw.customer_documents || []).map(d => ({
      id: d.id,
      name: d.name || 'Document',
      url: d.url || null,
    })),
    committedEta: formatDateTime(raw.committed_eta || raw.vendor_eta || raw.committed_at),
    report: report?.report_text || report?.note || report?.text || report?.summary || report?.description || null,
    reportFile: reportMedia[0] || report?.file_url || report?.file || report?.attachment_url || null,
    reportMedia,
    // The report is "shared" once it's been sent to the customer; the backend
    // also returns an explicit can_add_attachments flag (false once shared or
    // reviewed) — prefer it, falling back to the sent timestamp.
    sharedWithCustomer: !!report?.sent_to_customer_at || (report?.shared_with_customer ?? report?.shared ?? false),
    canAddAttachments: report?.can_add_attachments ?? (report ? !report?.sent_to_customer_at : false),
    reportSubmittedAt: formatDateTime(report?.submitted_at || report?.created_at),
    tracking: {
      number: raw.tracking_number ?? tracking.number ?? tracking.tracking_number ?? '',
      url: raw.tracking_url ?? tracking.url ?? tracking.tracking_url ?? '',
    },
    timeline: (history || []).map(h => ({
      status: statusLabel(h.to || h.status),
      date: formatDateTime(h.at || h.created_at || h.date),
      note: h.note || h.description || h.message || '',
    })),
  };
}

// GET /vendor/jobs?status=&page=&search= — "Job queue". Paginated; meta.counts
// has assigned / in_progress / completed totals. `search` matches ticket number
// or service name (used by the dispute "Related Job" typeahead).
export async function getVendorJobs({ status, page, search } = {}) {
  try {
    const params = {};
    if (status) params.status = status;
    if (page) params.page = page;
    if (search) params.search = search;
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

// Up to 8 proof files for the completion/report endpoints, under `media_files[]`.
// Files are RN picker objects: { uri, name, type }.
function buildReportFiles(files) {
  return (files || []).map(f => ({ field: 'media_files[]', uri: f.uri, name: f.name, type: f.type }));
}

// POST /vendor/jobs/{ticket}/accept — accept with an ETA commitment; moves the
// job to In Progress. `vendorEta` is an ISO 8601 datetime string. 422 if the
// job isn't in the Assigned state.
export async function acceptVendorJob(ticket, { vendorEta }) {
  try {
    const response = await apiClient.post(`/vendor/jobs/${ticket}/accept`, { vendor_eta: vendorEta });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/jobs/{ticket}/reject — reject with a mandatory reason (tracked);
// returns the job to the assignment queue. 422 if the job isn't Assigned.
export async function rejectVendorJob(ticket, { reason }) {
  try {
    const response = await apiClient.post(`/vendor/jobs/${ticket}/reject`, { reason });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/jobs/{ticket}/complete — submit the completion report
// (report_text required) with optional proof files; closes the job and notifies
// the RM. 422 if the job is not in progress.
// Uses postMultipart (react-native-blob-util) rather than axios/FormData —
// axios's multipart body stalls against this backend until the request times
// out, surfacing as a "Network error" (same issue fixed for other uploads).
export async function completeVendorJob(ticket, { reportText, files }) {
  try {
    const fields = {};
    if (reportText != null) fields.report_text = reportText;
    const response = await postMultipart(`/vendor/jobs/${ticket}/complete`, fields, buildReportFiles(files));
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/jobs/{ticket}/report/attachments — append proof files to an
// already-submitted report; allowed only while it hasn't been shared with the
// customer. 403 if the job is another vendor's; 422 if there's no report yet or
// it's already been sent.
export async function addVendorJobReportAttachments(ticket, { files }) {
  try {
    const response = await postMultipart(`/vendor/jobs/${ticket}/report/attachments`, {}, buildReportFiles(files));
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/jobs/{ticket}/tracking — add/edit shipment tracking (available
// once the job is accepted). Empty strings clear a field; callable repeatedly.
// 403 if another vendor's job; 422 if not yet accepted or the URL is invalid.
export async function saveVendorJobTracking(ticket, { trackingNumber, trackingUrl }) {
  try {
    const response = await apiClient.post(`/vendor/jobs/${ticket}/tracking`, {
      tracking_number: trackingNumber ?? '',
      tracking_url: trackingUrl ?? '',
    });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /vendor/jobs/{ticket}/support-chat — the job's support chat + its reply
// thread (chat is null if the customer/RM hasn't started one). Opening marks it
// read. 403 if the job is assigned to another vendor.
export async function getVendorJobSupportChat(ticket) {
  try {
    const response = await apiClient.get(`/vendor/jobs/${ticket}/support-chat`);
    const data = response.data?.data || {};
    const chat = data.chat || null;
    const rawReplies = chat?.replies || chat?.messages || data.replies || [];
    return {
      chat: chat ? mapSupportTicket(chat) : null,
      replies: rawReplies.map(mapSupportReply),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/jobs/{ticket}/support-chat — reply on an already-started chat.
// A vendor cannot start one. 422 if no chat exists yet or it's resolved.
export async function sendVendorJobSupportChat(ticket, message) {
  try {
    const response = await apiClient.post(`/vendor/jobs/${ticket}/support-chat`, { message });
    const data = response.data?.data || {};
    const chat = data.chat || null;
    const rawReply = data.reply || data.message || null;
    return {
      chat: chat ? mapSupportTicket(chat) : null,
      // This endpoint is the vendor sending, so force the reply to our side.
      reply: rawReply ? { ...mapSupportReply(rawReply), fromVendor: true } : null,
    };
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
