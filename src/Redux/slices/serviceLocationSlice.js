import { createSlice } from '@reduxjs/toolkit';

// The customer's chosen service location (state + city). Persisted so it's
// remembered across sessions — set once, reused for every category instead of
// asking again on each. Cleared on auth-identity change by the root reducer.
const initialState = {
  stateName: null,
  cityName: null,
  cityId: null,
  pincode: null,
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
    clearServiceLocation: () => initialState,
  },
});

export const { setServiceLocation, clearServiceLocation } = serviceLocationSlice.actions;
export default serviceLocationSlice.reducer;
