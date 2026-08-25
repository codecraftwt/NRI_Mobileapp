import apiClient, { normalizeApiError, postMultipart } from './client';
import { mapPendingRecurringBundle } from './paymentsApi';

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
  // is_base_service/is_addon/category_id are now returned inline on every
  // cart line (backend fix) — same flags as the catalog. Needed to route a
  // service into service_id/extra_services vs addons for POST
  // /customer/tickets/quote; mixing them up now 422s instead of silently
  // mispricing/dropping the service from the ticket.
  const categoryId = raw.category_id ?? svc.category?.id ?? raw.category?.id ?? null;
  const billingMode = raw.billing_mode ?? null;
  const isRecurringLine = billingMode === 'recurring';
  // For a recurring line, prefer the recurring-specific price fields FIRST —
  // same precedence useCartPriceSync uses for the guest cart
  // (`item.isRecurring ? recurringPrice : customerPrice`). The previous fixed
  // order checked `pricing.customer_price` (one-time) before
  // `pricing.recurring_price`, so a recurring cart line with no top-level
  // `price`/`customer_price` (only `pricing.*`) silently priced itself off
  // the one-time amount instead of the subscription amount.
  const price = isRecurringLine
    ? (raw.recurring_price ?? pricing.recurring_price ?? raw.price ?? raw.customer_price ?? pricing.customer_price ?? svc.customer_price ?? 0)
    : (raw.price ?? raw.customer_price ?? pricing.customer_price ?? svc.customer_price ?? 0);
  const serviceId = raw.service_id ?? svc.id ?? raw.id;
  if (serviceId == null) return null;
  return {
    cartItemId: raw.cart_item_id ?? raw.item_id ?? raw.id ?? null,
    serviceId,
    name: svc.name ?? raw.name ?? 'Service',
    categoryName,
    categoryId,
    isBaseService: !!(raw.is_base_service ?? svc.is_base_service),
    isAddon: !!(raw.is_addon ?? svc.is_addon),
    price: Number(price) || 0,
    base: raw.base != null ? Number(raw.base) : null,
    gstAmount: raw.gst_amount != null ? Number(raw.gst_amount) : null,
    // 'one_time' | 'recurring' | null (older cart rows before this field existed).
    billingMode: raw.billing_mode ?? null,
    // 'city' → price/base/gstAmount above are the real, final charge (priced
    // against the account's saved service-location city, see priced_city on
    // the cart response below). 'nationwide' → no saved city yet, so this is
    // only an average reference figure that CAN differ from what's actually
    // charged at checkout. null → quoted service, no fixed price at all.
    pricingBasis: raw.pricing_basis ?? null,
    // Only present on addon-type lines. false → this item's category has no
    // live vendor for its base service in the customer's city right now, so
    // even a correctly-shaped request can't be quoted/booked yet — surface
    // this before checkout. null when absent (base items, or older backend).
    categoryBaseBookable: raw.category_base_bookable ?? null,
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
  // The account's saved service-location city that any 'city'-basis item
  // above was priced against — null until GET/POST /customer/service-location
  // has one saved. Absent on mutation responses (POST/DELETE only return
  // count), so callers should keep the last known value rather than clobber it.
  return { items, count: d.count ?? items.length, pricedCity: d.priced_city ?? null };
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
// billingMode ('one_time' | 'recurring') only matters for a dual-mode
// service — the backend forces the correct mode regardless for a
// single-mode one, so it's safe to always send whichever mode the item was
// added under.
export async function addCartItem(serviceId, billingMode) {
  try {
    const response = await apiClient.post('/customer/cart/items', {
      service_id: serviceId,
      billing_mode: billingMode || undefined,
    });
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

// Clear selected services from the authenticated server cart. Backends differ
// on whether DELETE expects the service id or the cart-line id, so for each row
// try the identifiers in order and stop at the first that succeeds. Rows are
// deleted in parallel so clearing a multi-item cart is a single round-trip.
export async function clearCartItems(itemsOrIds = []) {
  try {
    const deleteRow = async (item) => {
      if (item == null) return;
      const ids = typeof item !== 'object'
        ? [item]
        : [item.serviceId, item.cartItemId, item.id].filter(id => id != null);
      for (const id of ids) {
        try {
          await apiClient.delete(`/customer/cart/items/${id}`);
          return; // first identifier that works wins — skip the fallbacks.
        } catch (e) {
          // Try the next possible identifier shape.
        }
      }
    };
    await Promise.all((itemsOrIds || []).map(deleteRow));
    return await getCart();
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// A created-from-checkout ticket row — tolerant/light mapping since only the
// name + amount are shown in the confirmation, not the full ticket detail
// shape (that's fetched separately from the Requests tab).
function mapCheckoutTicket(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    serviceName: raw.service?.name || raw.service_name || raw.name || null,
    totalAmount: raw.pricing?.total_amount ?? raw.total_amount ?? null,
  };
}

// POST /customer/cart/checkout — turns the cart into service request(s) and
// starts payment for them. `gateway` only matters when the cart has a
// recurring item (PayPal is rejected with a 422 there — surface
// error.message as-is, no client-side gateway filtering needed). An
// all-one-time cart behaves like the old single-ticket submit: one ticket,
// `payment_required`/`amount_due` for it, `pending_recurring_bundle: null`.
// A pure-recurring cart comes back with `tickets: []`, `ticket_id: null`,
// `payment_required: false`, and the recurring subscription surfaced only via
// `pending_recurring_bundle` (see mapPendingRecurringBundle in paymentsApi.js) —
// pay it via billingApi.subscribeRecurringBundle, same as everywhere else
// a pending bundle shows up (dashboard, membership-combined checkout).
// family_member_name/family_member_relationship are raw strings here, not a
// resolved family_member_id — confirmed live (a family_member_id payload
// 422'd with "family member name/relationship/pincode field is required").
// Same shape as membershipApi.checkoutMembership's combined-cart checkout.
export async function checkoutCart({
  gateway, couponCode, familyMemberName, familyMemberRelationship, stateId,
  cityId, talukaId, address, pincode, urgency, preferredDate, customerNotes, documents,
}) {
  try {
    const fields = {
      gateway,
      coupon_code: couponCode || undefined,
      family_member_name: familyMemberName || undefined,
      family_member_relationship: familyMemberRelationship || undefined,
      state_id: stateId,
      city_id: cityId || undefined,
      taluka_id: talukaId || undefined,
      address,
      pincode: pincode || undefined,
      urgency,
      preferred_date: preferredDate || undefined,
      customer_notes: customerNotes || undefined,
    };
    // `documents[{docId}]` (plural) — the one convention consistently used
    // everywhere else this backend takes required-document uploads:
    // ticketApi.createTicket, membershipApi.checkoutMembership, AND
    // serviceSubscriptionApi's own subscription-creation endpoints. Neither
    // the written spec's `attachments[]` nor a singular `document[{docId}]`
    // changed the "document.10 field is required" error when tried live —
    // consistent with both having been wrong, since the backend reports the
    // same "still missing" message regardless of what unrecognized field
    // name the file actually arrived under.
    const docEntries = Object.entries(documents || {}).filter(([, file]) => !!file);
    let response;
    if (docEntries.length > 0) {
      const uploadFiles = docEntries.map(([docId, file]) => ({
        field: `documents[${docId}]`, uri: file.uri, name: file.name, type: file.type,
      }));
      response = await postMultipart('/customer/cart/checkout', fields, uploadFiles);
    } else {
      response = await apiClient.post('/customer/cart/checkout', fields);
    }
    const data = response.data?.data || {};
    // Confirmed live: this response never carries checkout_url/order/
    // payment_id — /cart/checkout only creates the ticket(s) + validates the
    // recurring/PayPal restriction. Payment is started separately via
    // POST /customer/billing/ticket/{id}/pay (billingApi.payBillableItem,
    // see SubmitRequest.js) using the ticket_id returned here.
    return {
      tickets: (data.tickets || []).map(mapCheckoutTicket).filter(Boolean),
      ticketId: data.ticket_id ?? null,
      paymentRequired: !!data.payment_required,
      amountDue: data.amount_due,
      paymentId: data.payment_id ?? null,
      // Same checkoutUrl/order shape as every other gateway checkout in the
      // app (StripeCheckoutModal / runRazorpayPayment).
      checkoutUrl: data.checkout_url || null,
      order: data.order || null,
      pendingRecurringBundle: mapPendingRecurringBundle(data.pending_recurring_bundle),
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
