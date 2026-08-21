import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCartItems, updateCartItemPrices } from '../Redux/slices/cartSlice';
import { getServices } from '../Api/catalogApi';

// Guest cart price binding. Re-fetches the EXACT vendor price for every cart
// line from the live GET /services?city_id=<id> response (keyed per city) and
// writes it back into the local cart, so a persisted/stale cart shows the same
// amount the backend charges at checkout.
//
// Used only by the guest cart flow (Cart + OnboardingPayment). It is a no-op
// unless `enabled` is true and the cart has items, so the authenticated cart
// (SubmitRequest) and plain membership registration are untouched — no network
// call is made for them.
export function useCartPriceSync(enabled = true) {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const savedCityId = useSelector(s => s.serviceLocation?.cityId);
  // Re-run only when the set of services changes (not on price writes, which
  // keep serviceIds identical — avoids a refetch loop).
  const idsKey = items.map(i => i.serviceId).join(',');

  useEffect(() => {
    if (!enabled || !items.length) return;
    let cancelled = false;
    (async () => {
      const cityIds = [...new Set(
        items.map(i => i.cityId || savedCityId).filter(Boolean)
      )];
      if (!cityIds.length) return;
      const priceMap = {};
      for (const cityId of cityIds) {
        try {
          const services = await getServices({ cityId });
          const byId = new Map(services.map(s => [s.id, s]));
          // Bind whichever price the item was actually added under (one-time
          // vs recurring) — a service can offer both, so picking "whichever is
          // present" would silently swap a recurring line back to its one-time
          // price (or vice versa) on refresh.
          for (const item of items) {
            if ((item.cityId || savedCityId) !== cityId) continue;
            const s = byId.get(item.serviceId);
            if (!s) continue;
            const price = item.isRecurring ? s.pricing?.recurringPrice : s.pricing?.customerPrice;
            if (price != null) {
              priceMap[item.serviceId] = { price: Number(price), currency: s.pricing?.currency || 'USD' };
            }
          }
        } catch (e) {
          // Leave this city's items on their stored price if the fetch fails.
        }
      }
      if (!cancelled && Object.keys(priceMap).length) {
        dispatch(updateCartItemPrices(priceMap));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idsKey]);
}
