import apiClient, { normalizeApiError } from './client';

// A server cart line → the local display shape the app uses everywhere. The
// exact payload shape isn't fixed in the API docs, so pull fields tolerantly
// from either a nested `service` object or the item itself.
function mapCartItem(raw) {
  if (!raw) return null;
  const svc = raw.service || raw;
  const pricing = raw.pricing || svc.pricing || {};
  const categoryName = svc.category?.name ?? raw.category?.name ?? raw.category_name
    ?? (typeof raw.category === 'string' ? raw.category : null)
    ?? (typeof svc.category === 'string' ? svc.category : null)
    ?? '';
  const price = raw.price ?? raw.customer_price ?? pricing.customer_price
    ?? pricing.recurring_price ?? svc.customer_price ?? 0;
  const serviceId = raw.service_id ?? svc.id ?? raw.id;
  if (serviceId == null) return null;
  return {
    serviceId,
    name: svc.name ?? raw.name ?? 'Service',
    categoryName,
    price: Number(price) || 0,
    currency: pricing.currency ?? raw.currency ?? 'USD',
    durationLabel: pricing.turnaround_label ?? svc.pricing?.turnaround_label ?? raw.duration ?? svc.duration ?? '',
    imageUrl: svc.image_url ?? raw.image_url ?? null,
  };
}

// The server cart endpoints (authenticated customers only). Responses are
// shaped `{ data: { items: [...], count } }` for GET and `{ data: { count } }`
// for mutations — normalize both to `{ items, count }` so callers don't care.
function mapCart(data) {
  const d = data?.data || data || {};
  const items = (Array.isArray(d.items) ? d.items : []).map(mapCartItem).filter(Boolean);
  return { items, count: d.count ?? items.length };
}

// GET /customer/cart — current cart items + count.
export async function getCart() {
  try {
    const response = await apiClient.get('/customer/cart');
    return mapCart(response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /customer/cart/items — add a service; returns the updated count.
export async function addCartItem(serviceId) {
  try {
    const response = await apiClient.post('/customer/cart/items', { service_id: serviceId });
    return mapCart(response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// DELETE /customer/cart/items/{serviceId} — remove a service; returns the
// updated count.
export async function removeCartItem(serviceId) {
  try {
    const response = await apiClient.delete(`/customer/cart/items/${serviceId}`);
    return mapCart(response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
