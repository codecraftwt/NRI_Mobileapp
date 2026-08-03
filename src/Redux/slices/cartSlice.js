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
};

// Authenticated-only server cart thunks. These never run for guests (the
// useCart hook gates them behind isAuthenticated), so the onboarding flow is
// untouched.
export const fetchServerCart = createAsyncThunk('cart/fetchServer', async (_, { rejectWithValue }) => {
  try {
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
    clearCart: () => initialState,
  },
  extraReducers: (builder) => {
    // POST/DELETE return only the authoritative count — keep it in sync (the
    // local `items` list was already updated optimistically by the hook).
    const applyCount = (state, action) => {
      if (action.payload?.count != null) state.serverCount = action.payload.count;
    };
    builder
      // GET returns the full server cart. Merge in anything added elsewhere
      // (e.g. the web) that we don't already have locally, so it shows up in the
      // app. Union (not replace) so an in-app add that's still syncing isn't
      // dropped if this GET resolves first; local copies are kept as-is because
      // in-app adds carry location + live pricing the server line may not echo.
      .addCase(fetchServerCart.fulfilled, (state, action) => {
        const serverItems = action.payload?.items || [];
        const have = new Set(state.items.map(i => String(i.serviceId)));
        serverItems.forEach((si) => {
          if (!have.has(String(si.serviceId))) {
            state.items.push(si);
            have.add(String(si.serviceId));
          }
        });
        if (action.payload?.count != null) state.serverCount = action.payload.count;
      })
      .addCase(addServerCartItem.fulfilled, applyCount)
      .addCase(removeServerCartItem.fulfilled, applyCount);
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;

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
