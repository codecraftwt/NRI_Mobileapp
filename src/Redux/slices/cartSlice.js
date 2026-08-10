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
};

// Adopt the authoritative server cart rows into the local display list while
// keeping the location fields (stateName/cityName/cityId/pincode) the guest
// chose — the cart API omits those, so a plain replace would lose them.
function mergeServerIntoLocal(state, serverItems) {
  const indexById = new Map(state.items.map((i, idx) => [String(i.serviceId), idx]));
  state.items = serverItems.map((si) => {
    const idx = indexById.get(String(si.serviceId));
    if (idx != null) {
      const existing = state.items[idx];
      return {
        ...existing,
        ...si,
        stateName: existing.stateName ?? si.stateName,
        cityName: existing.cityName ?? si.cityName,
        cityId: existing.cityId ?? si.cityId,
        pincode: existing.pincode ?? si.pincode,
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
          await cartApi.addCartItem(item.serviceId);
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

export const addServerCartItem = createAsyncThunk('cart/addServer', async (serviceId, { rejectWithValue }) => {
  try {
    return await cartApi.addCartItem(serviceId);
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

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      if (!state.items.some(i => i.serviceId === item.serviceId)) {
        state.items.push(item);
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
      })
      .addCase(mergeGuestCart.rejected, (state) => {
        state.guestMergeStatus = 'failed';
      })
      .addCase(addServerCartItem.fulfilled, applyCount)
      .addCase(removeServerCartItem.fulfilled, applyCount)
      .addCase(clearServerCart.fulfilled, (state) => {
        state.items = [];
        state.serverCount = 0;
      });
  },
});

export const { addToCart, removeFromCart, updateCartItemPrices, clearCart } = cartSlice.actions;

// Selectors
export const selectCartItems = (s) => s.cart.items;
export const selectCartCount = (s) => s.cart.items.length;
export const selectServerCartCount = (s) => s.cart.serverCount;
// Count for the header badges: the server count once signed in (authoritative,
// fetched from GET /customer/cart), the local item count for guests.
export const selectCartBadgeCount = (s) =>
  s.user?.isAuthenticated ? s.cart.serverCount : s.cart.items.length;
export const selectCartSubtotal = (s) =>
  s.cart.items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
export const selectIsInCart = (serviceId) => (s) =>
  s.cart.items.some(i => i.serviceId === serviceId);

export default cartSlice.reducer;
