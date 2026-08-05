import apiClient, { normalizeApiError } from '../client';

// Tolerant mappers — response field names aren't fully pinned in the schema.
export function mapPlannerEvent(raw = {}) {
  return {
    id: raw.id,
    title: raw.title || '',
    type: raw.type || 'follow_up',
    dueAt: raw.due_at || raw.due || null,
    customerId: raw.customer_id ?? raw.customer?.id ?? null,
    customer: raw.customer?.name || raw.customer_name || null,
    notes: raw.notes || null,
    done: raw.done === true || raw.completed === true || String(raw.status || '').toLowerCase() === 'done' || raw.completed_at != null,
  };
}

// GET /rm/planner — events grouped into overdue / today / upcoming / recently done.
export async function getRmPlanner() {
  try {
    const response = await apiClient.get('/rm/planner');
    const d = response.data?.data || response.data || {};
    const grp = (arr) => (arr || []).map(mapPlannerEvent);
    return {
      overdue: grp(d.overdue),
      today: grp(d.today),
      upcoming: grp(d.upcoming),
      recentlyDone: grp(d.recently_done || d.recentlyDone || d.done),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/planner — add a visit / follow-up / renewal pitch. 422 on validation error.
export async function addRmPlannerEvent({ title, type, dueAt, customerId, notes }) {
  try {
    const response = await apiClient.post('/rm/planner', {
      title,
      type,
      due_at: dueAt,
      customer_id: customerId || undefined,
      notes: notes || undefined,
    });
    const data = response.data?.data || response.data || {};
    return { event: mapPlannerEvent(data.event || data), message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/planner/{event}/complete — mark done.
export async function completeRmPlannerEvent(event) {
  try {
    const response = await apiClient.post(`/rm/planner/${event}/complete`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// DELETE /rm/planner/{event} — remove an event.
export async function deleteRmPlannerEvent(event) {
  try {
    const response = await apiClient.delete(`/rm/planner/${event}`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
