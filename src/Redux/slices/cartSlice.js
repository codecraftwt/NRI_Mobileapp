import { createSlice } from '@reduxjs/toolkit';

// Guest-browsable shopping cart. A service is added from the ServiceInfo
// screen once a location has been chosen; the cart is persisted (see store.js
// whitelist) and preserved across the auth-identity reset so a guest who
// signs in / registers at checkout keeps everything they added ("your cart is
// saved"). Line items are keyed by serviceId — adding the same service twice
// is a no-op rather than a duplicate row.
const initialState = {
  items: [], // [{ serviceId, name, categoryName, price, currency, durationLabel, stateName, cityName, cityId }]
};

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
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;

// Selectors
export const selectCartItems = (s) => s.cart.items;
export const selectCartCount = (s) => s.cart.items.length;
export const selectCartSubtotal = (s) =>
  s.cart.items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
export const selectIsInCart = (serviceId) => (s) =>
  s.cart.items.some(i => i.serviceId === serviceId);

export default cartSlice.reducer;
