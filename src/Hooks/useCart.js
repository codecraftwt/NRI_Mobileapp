import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToCart,
  removeFromCart,
  fetchServerCart,
  mergeGuestCart,
  addServerCartItem,
  removeServerCartItem,
  checkoutCart,
  selectCartItems,
  selectServerCartCount,
} from '../Redux/slices/cartSlice';

// Cart access that binds the server cart APIs ONLY for authenticated users.
//
// - Guests / onboarding: unchanged — the local redux cart is the single source
//   (count = items.length), no network calls.
// - Signed-in users: every add/remove also hits the backend (POST/DELETE
//   /customer/cart/items) and the badge count comes from the server response
//   (GET /customer/cart on mount, then the count each mutation returns). The
//   local `items` list is still maintained for the rich cart/checkout display.
export function useCart({ autoFetch = true } = {}) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.user?.isAuthenticated);
  const items = useSelector(selectCartItems);
  const serverCount = useSelector(selectServerCartCount);
  const guestMergeStatus = useSelector((s) => s.cart.guestMergeStatus);
  const checkoutLoading = useSelector((s) => s.cart.checkoutStatus === 'loading');
  // A guest cart carried into a signed-in session: local items exist but the
  // server cart is still empty, so they were never uploaded.
  const hasUnsyncedGuestCart = items.length > 0 && serverCount === 0;

  const count = isAuthenticated ? serverCount : items.length;

  // On the guest→authenticated transition, push the onboarding cart to the
  // backend (mergeGuestCart) the first time a signed-in user lands on a
  // cart-aware screen, so the services added while onboarding show up in the
  // server cart. Otherwise just fetch the authoritative cart so the badge count
  // is accurate on entry.
  useEffect(() => {
    if (!autoFetch || !isAuthenticated) return;
    if (hasUnsyncedGuestCart && guestMergeStatus === 'idle') {
      dispatch(mergeGuestCart());
    } else if (!hasUnsyncedGuestCart && guestMergeStatus !== 'loading') {
      dispatch(fetchServerCart());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, isAuthenticated, hasUnsyncedGuestCart, guestMergeStatus]);

  const add = (item) => {
    // Local add drives the display list in both flows.
    dispatch(addToCart(item));
    // Signed-in: sync to the backend cart; the returned count updates the badge.
    // billing_mode only matters for a dual-mode service — safe to always send
    // whichever mode the item was added under (see cartApi.addCartItem).
    if (isAuthenticated && item?.serviceId != null) {
      dispatch(addServerCartItem({ serviceId: item.serviceId, billingMode: item.isRecurring ? 'recurring' : 'one_time' }));
    }
  };

  const remove = (serviceId) => {
    dispatch(removeFromCart(serviceId));
    if (isAuthenticated) dispatch(removeServerCartItem(serviceId));
  };

  const refresh = () => {
    if (isAuthenticated) dispatch(fetchServerCart());
  };

  // Turns the authenticated cart into service request(s) + starts payment —
  // see cartApi.checkoutCart for params/response shape.
  const checkout = (params) => dispatch(checkoutCart(params));

  return { items, count, isAuthenticated, add, remove, refresh, checkout, checkoutLoading };
}
