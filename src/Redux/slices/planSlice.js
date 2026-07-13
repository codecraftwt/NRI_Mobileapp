import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as planApi from '../../Api/planApi';

// Reference data — cached for the app session, same rationale as geoSlice/catalogSlice.
export const fetchPlans = createAsyncThunk(
  'plan/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      return await planApi.getPlans();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchAddonPackages = createAsyncThunk(
  'plan/fetchAddonPackages',
  async (_, { rejectWithValue }) => {
    try {
      return await planApi.getAddonPackages();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// On-demand single-plan refresh (e.g. the "View details" sheet) — not cached
// by id, always re-fetches the freshest detail for whichever plan is open.
export const fetchPlanDetail = createAsyncThunk(
  'plan/fetchPlanDetail',
  async (planId, { rejectWithValue }) => {
    try {
      return await planApi.getPlan(planId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  plans: [], // [{ id, name, slug, description, price, isCustomPricing, durationDays, isPopular, features }]
  plansStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  plansError: null,
  addonPackages: [], // [{ id, name, slug, description, priceMonthly, inclusions }]
  addonPackagesStatus: 'idle',
  addonPackagesError: null,
  planDetail: null,
  planDetailStatus: 'idle',
  planDetailError: null,
};

const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.pending, (state) => {
        state.plansStatus = 'loading';
        state.plansError = null;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.plansStatus = 'succeeded';
        state.plans = action.payload;
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.plansStatus = 'failed';
        state.plansError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchAddonPackages.pending, (state) => {
        state.addonPackagesStatus = 'loading';
        state.addonPackagesError = null;
      })
      .addCase(fetchAddonPackages.fulfilled, (state, action) => {
        state.addonPackagesStatus = 'succeeded';
        state.addonPackages = action.payload;
      })
      .addCase(fetchAddonPackages.rejected, (state, action) => {
        state.addonPackagesStatus = 'failed';
        state.addonPackagesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchPlanDetail.pending, (state) => {
        state.planDetailStatus = 'loading';
        state.planDetailError = null;
      })
      .addCase(fetchPlanDetail.fulfilled, (state, action) => {
        state.planDetailStatus = 'succeeded';
        state.planDetail = action.payload;
      })
      .addCase(fetchPlanDetail.rejected, (state, action) => {
        state.planDetailStatus = 'failed';
        state.planDetailError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      });
  },
});

export default planSlice.reducer;
