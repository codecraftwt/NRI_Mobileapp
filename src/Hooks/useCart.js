import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToCart,
  removeFromCart,
  fetchServerCart,
  addServerCartItem,
  removeServerCartItem,
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

  const count = isAuthenticated ? serverCount : items.length;

  // Fetch the authoritative server cart once when a signed-in user lands on a
  // cart-aware screen, so the badge count is accurate on entry.
  useEffect(() => {
    if (autoFetch && isAuthenticated) dispatch(fetchServerCart());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, isAuthenticated]);

  const add = (item) => {
    // Local add drives the display list in both flows.
    dispatch(addToCart(item));
    // Signed-in: sync to the backend cart; the returned count updates the badge.
    if (isAuthenticated && item?.serviceId != null) dispatch(addServerCartItem(item.serviceId));
  };

  const remove = (serviceId) => {
    dispatch(removeFromCart(serviceId));
    if (isAuthenticated) dispatch(removeServerCartItem(serviceId));
  };

  const refresh = () => {
    if (isAuthenticated) dispatch(fetchServerCart());
  };

  return { items, count, isAuthenticated, add, remove, refresh };
}
