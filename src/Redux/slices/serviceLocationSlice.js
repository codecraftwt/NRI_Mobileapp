import { createSlice } from '@reduxjs/toolkit';
import { loginUser, registerUser, login } from './userSlice';

// The customer's chosen service location (state + city). Persisted so it's
// remembered across sessions — set once, reused for every category instead of
// asking again on each.
//
// Two layers:
//   - The top-level fields are the ACTIVE location used by every services
//     screen. They're cleared for a fresh guest on the onboarding All Services
//     screen (see Services.js) and by the user's "Clear" in LocationPickerModal.
//   - `savedByUser` remembers each signed-in user's last location, keyed by
//     user id (email fallback). It's snapshotted on logout (store.js) and
//     restored on that user's next login (below), so a member keeps their city
//     across logout/login even though the guest reset wipes the active copy.
//     There is no backend endpoint for the service pincode/city, so this
//     client-side map is what "saves the location under the account".
const initialState = {
  stateName: null,
  cityName: null,
  cityId: null,
  pincode: null,
  savedByUser: {}, // { [userId]: { stateName, cityName, cityId, pincode } }
};

const serviceLocationSlice = createSlice({
  name: 'serviceLocation',
  initialState,
  reducers: {
    setServiceLocation: (state, action) => {
      state.stateName = action.payload.stateName;
      state.cityName = action.payload.cityName;
      state.cityId = action.payload.cityId;
      state.pincode = action.payload.pincode ?? null;
    },
    clearServiceLocation: (state) => {
      // Clear only the ACTIVE location — keep each user's remembered city
      // (savedByUser) so the guest reset on All Services can't wipe a signed-in
      // member's saved location.
      state.stateName = null;
      state.cityName = null;
      state.cityId = null;
      state.pincode = null;
    },
  },
  extraReducers: (builder) => {
    // Restore this user's remembered location on sign-in / register. Only acts
    // when we actually have a snapshot for them — otherwise the active location
    // is left as-is (e.g. a brand-new registrant keeps the city they picked as
    // a guest, which the store carries across the auth reset).
    const restore = (state, action) => {
      const user = action.payload?.user;
      const userId = user?.id ?? user?.email ?? null;
      if (userId == null) return;
      const saved = state.savedByUser?.[userId];
      if (saved === undefined) return;
      state.stateName = saved?.stateName ?? null;
      state.cityName = saved?.cityName ?? null;
      state.cityId = saved?.cityId ?? null;
      state.pincode = saved?.pincode ?? null;
    };
    builder
      .addCase(loginUser.fulfilled, restore)
      .addCase(registerUser.fulfilled, restore)
      .addCase(login, restore);
  },
});

export const { setServiceLocation, clearServiceLocation } = serviceLocationSlice.actions;
export default serviceLocationSlice.reducer;
