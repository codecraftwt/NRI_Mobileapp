import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as cartApi from '../../Api/cartApi';

// Guest-browsable shopping cart. A service is added from the ServiceInfo
// screen once a location has been chosen; the cart is persisted (see store.js
// whitelist) and preserved across the auth-identity reset so a guest who
// signs in / registers at checkout keeps everything they added ("your cart is
// saved"). Line items are keyed by serviceId — adding the same service twice
// is a no-op rather than a duplicate row.
//
// `items` is the local cart used for display + the guest/onboarding flow
// (unchanged). `serverCount` mirrors the backend cart count (GET/POST/DELETE
// /customer/cart) and is ONLY used for authenticated users — see useCart().
const initialState = {
  items: [], // [{ serviceId, name, categoryName, price, currency, durationLabel, stateName, cityName, cityId, pincode }]
  serverCount: 0,
  // Tracks the one-time guest→authenticated cart sync (see mergeGuestCart). It
  // stays 'idle' for a guest (the cart is preserved across sign-in by the store
  // reset), flips to 'loading'/'succeeded' the first time a signed-in session
  // uploads the guest cart, so useCart never re-runs the merge on later mounts.
  guestMergeStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  checkoutStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  checkoutError: null,
  coupons: [],
  couponsStatus: 'idle',
  couponsError: null,
  appliedCoupon: null,
  couponApplyStatus: 'idle',
  couponApplyError: null,
  // The account's saved service-location city that a 'city'-basis cart item
  // was priced against (see pricingBasis on each item) — null until one's
  // saved. Only ever updated from a full GET /customer/cart response.
  pricedCity: null,
};

// Adopt the authoritative server cart rows into the local display list while
// keeping the fields the guest already resolved that the cart API omits:
// location (stateName/cityName/cityId/pincode) AND the exact per-city price.
// GET /customer/cart returns no per-line pricing, so a plain `...si` spread
// would overwrite the guest's bound price with 0 and zero out the cart total —
// keep the existing price/currency whenever the server row has no real price.
function mergeServerIntoLocal(state, serverItems) {
  const indexById = new Map(state.items.map((i, idx) => [String(i.serviceId), idx]));
  state.items = serverItems.map((si) => {
    const idx = indexById.get(String(si.serviceId));
    if (idx != null) {
      const existing = state.items[idx];
      return {
        ...existing,
        ...si,
        price: Number(si.price) > 0 ? si.price : existing.price,
        currency: Number(si.price) > 0 ? si.currency : (existing.currency ?? si.currency),
        stateName: existing.stateName ?? si.stateName,
        cityName: existing.cityName ?? si.cityName,
        cityId: existing.cityId ?? si.cityId,
        pincode: existing.pincode ?? si.pincode,
        // The server's billing_mode is authoritative once synced — corrects
        // the guest-set isRecurring flag (e.g. after a "switch to recurring"
        // re-add from another device/session).
        isRecurring: si.billingMode ? si.billingMode === 'recurring' : existing.isRecurring,
      };
    }
    return si;
  });
}

// Authenticated-only server cart thunks. These never run for guests (the
// useCart hook gates them behind isAuthenticated), so the onboarding flow is
// untouched.
export const fetchServerCart = createAsyncThunk('cart/fetchServer', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const result = await cartApi.getCart();
    const user = state.user?.user || {};
    const userId = user.id ?? user.email ?? null;
    const onboardingRecord = userId != null ? state.onboarding?.completedByUser?.[userId] : undefined;
    const onboardingIncomplete = onboardingRecord === false || user.onboarded === false;
    const hasCarriedGuestCart = (state.cart?.items || []).length > 0 && (state.cart?.serverCount || 0) === 0;
    return {
      ...result,
      preserveLocalOnEmpty: result.items.length === 0 && hasCarriedGuestCart && onboardingIncomplete,
    };
  } catch (error) {
    return rejectWithValue(error);
  }
});

// One-time guest→authenticated sync: push every service the guest added while
// onboarding (the local `items`) to the backend cart, then return the
// authoritative server cart. Adding a service that's already in the server cart
// is a no-op (the cart is keyed by service), so this is safe to run once per
// sign-in. Individual add failures are swallowed so one bad row can't abort the
// whole merge — the final GET reflects whatever made it in.
export const mergeGuestCart = createAsyncThunk('cart/mergeGuest', async (_, { getState, rejectWithValue }) => {
  try {
    const localItems = getState().cart?.items || [];
    for (const item of localItems) {
      if (item?.serviceId != null) {
        try {
          await cartApi.addCartItem(item.serviceId, item.isRecurring ? 'recurring' : 'one_time');
        } catch (e) {
          // Keep syncing the rest; the closing GET reports the real state.
        }
      }
    }
    return await cartApi.getCart();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addServerCartItem = createAsyncThunk('cart/addServer', async ({ serviceId, billingMode }, { rejectWithValue }) => {
  try {
    return await cartApi.addCartItem(serviceId, billingMode);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const removeServerCartItem = createAsyncThunk('cart/removeServer', async (serviceId, { rejectWithValue }) => {
  try {
    return await cartApi.removeCartItem(serviceId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const clearServerCart = createAsyncThunk('cart/clearServer', async (serviceIds, { rejectWithValue }) => {
  try {
    return await cartApi.clearCartItems(serviceIds);
  } catch (error) {
    return rejectWithValue(error);
  }
});

// Turns the authenticated cart into service request(s) + starts payment for
// them — see cartApi.checkoutCart for the response shape.
export const checkoutCart = createAsyncThunk('cart/checkout', async (params, { rejectWithValue }) => {
  try {
    return await cartApi.checkoutCart(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchCartCoupons = createAsyncThunk('cart/fetchCoupons', async (params, { rejectWithValue }) => {
  try {
    return await cartApi.getCartCoupons(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const applyCartCoupon = createAsyncThunk('cart/applyCoupon', async (params, { rejectWithValue }) => {
  try {
    return await cartApi.validateCartCoupon(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Re-adding a service already in the cart under a different mode (e.g.
    // one-time → recurring) switches that line in place — matches the server
    // contract (POST /customer/cart/items with a new billing_mode switches
    // rather than duplicates). A same-mode re-add is a no-op, as before.
    addToCart: (state, action) => {
      const item = action.payload;
      const idx = state.items.findIndex(i => i.serviceId === item.serviceId);
      if (idx === -1) {
        state.items.push(item);
      } else if (state.items[idx].isRecurring !== item.isRecurring) {
        state.items[idx] = item;
      }
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(i => i.serviceId !== action.payload);
    },
    // Refresh the stored per-service prices from the authoritative
    // /services?city_id=<id> response (keyed by serviceId), so a persisted cart
    // whose prices went stale shows the exact vendor price the backend charges.
    // payload: { [serviceId]: { price, currency } }
    updateCartItemPrices: (state, action) => {
      const map = action.payload || {};
      state.items = state.items.map((it) => {
        const next = map[it.serviceId];
        if (next == null || next.price == null) return it;
        return { ...it, price: next.price, currency: next.currency || it.currency };
      });
    },
    clearCart: () => initialState,
    clearAppliedCartCoupon: (state) => {
      state.appliedCoupon = null;
      state.couponApplyStatus = 'idle';
      state.couponApplyError = null;
    },
  },
  extraReducers: (builder) => {
    // POST/DELETE return only the authoritative count — keep it in sync (the
    // local `items` list was already updated optimistically by the hook).
    const applyCount = (state, action) => {
      if (action.payload?.count != null) state.serverCount = action.payload.count;
    };
    builder
      // GET returns the full authoritative server cart for signed-in users.
      // Replace the local display list with server rows so purchased/removed
      // services do not survive from persisted Redux state, while preserving
      // local location fields for matching rows because the cart API omits them.
      .addCase(fetchServerCart.fulfilled, (state, action) => {
        const serverItems = action.payload?.items || [];
        if (action.payload?.preserveLocalOnEmpty) {
          state.serverCount = action.payload?.count ?? 0;
          return;
        }
        mergeServerIntoLocal(state, serverItems);
        if (action.payload?.count != null) state.serverCount = action.payload.count;
        state.pricedCity = action.payload?.pricedCity ?? null;
      })
      // Guest cart uploaded on sign-in — adopt the merged server cart. If the
      // server came back empty (every push failed), keep the local guest items
      // so nothing the user selected is lost.
      .addCase(mergeGuestCart.pending, (state) => {
        state.guestMergeStatus = 'loading';
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.guestMergeStatus = 'succeeded';
        const serverItems = action.payload?.items || [];
        if (serverItems.length > 0) mergeServerIntoLocal(state, serverItems);
        if (action.payload?.count != null) state.serverCount = action.payload.count;
        state.pricedCity = action.payload?.pricedCity ?? null;
      })
      .addCase(mergeGuestCart.rejected, (state) => {
        state.guestMergeStatus = 'failed';
      })
      .addCase(addServerCartItem.fulfilled, applyCount)
      .addCase(removeServerCartItem.fulfilled, applyCount)
      .addCase(clearServerCart.fulfilled, (state) => {
        state.items = [];
        state.serverCount = 0;
      })
      .addCase(checkoutCart.pending, (state) => {
        state.checkoutStatus = 'loading';
        state.checkoutError = null;
      })
      .addCase(checkoutCart.fulfilled, (state) => {
        state.checkoutStatus = 'succeeded';
      })
      .addCase(checkoutCart.rejected, (state, action) => {
        state.checkoutStatus = 'failed';
        state.checkoutError = action.payload;
      })
      .addCase(fetchCartCoupons.pending, (state) => {
        state.couponsStatus = 'loading';
        state.couponsError = null;
      })
      .addCase(fetchCartCoupons.fulfilled, (state, action) => {
        state.couponsStatus = 'succeeded';
        state.coupons = action.payload;
      })
      .addCase(fetchCartCoupons.rejected, (state, action) => {
        state.couponsStatus = 'failed';
        state.couponsError = action.payload;
      })
      .addCase(applyCartCoupon.pending, (state) => {
        state.couponApplyStatus = 'loading';
        state.couponApplyError = null;
      })
      .addCase(applyCartCoupon.fulfilled, (state, action) => {
        state.couponApplyStatus = 'succeeded';
        state.appliedCoupon = action.payload;
      })
      .addCase(applyCartCoupon.rejected, (state, action) => {
        state.couponApplyStatus = 'failed';
        state.couponApplyError = action.payload;
        state.appliedCoupon = null;
      });
  },
});

export const { addToCart, removeFromCart, updateCartItemPrices, clearCart, clearAppliedCartCoupon } = cartSlice.actions;

// Selectors
export const selectCartItems = (s) => s.cart.items;
export const selectCartCount = (s) => s.cart.items.length;
export const selectServerCartCount = (s) => s.cart.serverCount;
export const selectPricedCity = (s) => s.cart.pricedCity;
// Count for the header badges: the server count once signed in (authoritative,
// fetched from GET /customer/cart), the local item count for guests.
export const selectCartBadgeCount = (s) =>
  s.user?.isAuthenticated ? s.cart.serverCount : s.cart.items.length;
export const selectCartSubtotal = (s) =>
  s.cart.items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
export const selectIsInCart = (serviceId) => (s) =>
  s.cart.items.some(i => i.serviceId === serviceId);

export default cartSlice.reducer;
