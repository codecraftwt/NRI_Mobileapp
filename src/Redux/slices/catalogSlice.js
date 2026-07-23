import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as catalogApi from '../../Api/catalogApi';

// Reference data — cached for the app session, same rationale as geoSlice.
export const fetchServiceCategories = createAsyncThunk(
  'catalog/fetchServiceCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await catalogApi.getServiceCategories();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Reference data — one-time request priority tiers, cached for the session.
export const fetchPriorities = createAsyncThunk(
  'catalog/fetchPriorities',
  async (_, { rejectWithValue }) => {
    try {
      return await catalogApi.getPriorities();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Not cached long-term like categories — re-fetched whenever the filter
// (category/type/state/search) changes, since pricing is state-dependent.
// `type` ('base' | 'addon') is stored in its own bucket below so fetching
// both for the same category/state doesn't clobber one another.
export const fetchServices = createAsyncThunk(
  'catalog/fetchServices',
  async ({ categoryId, type, stateId, search } = {}, { rejectWithValue }) => {
    try {
      return await catalogApi.getServices({ categoryId, type, stateId, search });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Category services split into one-time / recurring buckets (ServiceDetail).
export const fetchServiceGroups = createAsyncThunk(
  'catalog/fetchServiceGroups',
  async ({ categoryId, stateId, search } = {}, { rejectWithValue }) => {
    try {
      return await catalogApi.getServiceGroups({ categoryId, stateId, search });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  categories: [], // [{ id, name, slug, icon, description, baseServicesCount, addonServicesCount }]
  categoriesStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  categoriesError: null,
  priorities: [], // [{ id, name, slug, description, surcharge, isDefault }]
  prioritiesStatus: 'idle',
  prioritiesError: null,
  base: { services: [], status: 'idle', error: null, filterKey: null },
  addon: { services: [], status: 'idle', error: null, filterKey: null },
  groups: { oneTime: [], recurring: [], status: 'idle', error: null, filterKey: null },
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceCategories.pending, (state) => {
        state.categoriesStatus = 'loading';
        state.categoriesError = null;
      })
      .addCase(fetchServiceCategories.fulfilled, (state, action) => {
        state.categoriesStatus = 'succeeded';
        state.categories = action.payload;
      })
      .addCase(fetchServiceCategories.rejected, (state, action) => {
        state.categoriesStatus = 'failed';
        state.categoriesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchPriorities.pending, (state) => {
        state.prioritiesStatus = 'loading';
        state.prioritiesError = null;
      })
      .addCase(fetchPriorities.fulfilled, (state, action) => {
        state.prioritiesStatus = 'succeeded';
        state.priorities = action.payload;
      })
      .addCase(fetchPriorities.rejected, (state, action) => {
        state.prioritiesStatus = 'failed';
        state.prioritiesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchServices.pending, (state, action) => {
        const bucket = state[action.meta.arg.type];
        bucket.status = 'loading';
        bucket.error = null;
        bucket.filterKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        const bucket = state[action.meta.arg.type];
        bucket.status = 'succeeded';
        bucket.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        const bucket = state[action.meta.arg.type];
        bucket.status = 'failed';
        bucket.error = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchServiceGroups.pending, (state, action) => {
        state.groups.status = 'loading';
        state.groups.error = null;
        state.groups.filterKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchServiceGroups.fulfilled, (state, action) => {
        state.groups.status = 'succeeded';
        state.groups.oneTime = action.payload.oneTime;
        state.groups.recurring = action.payload.recurring;
      })
      .addCase(fetchServiceGroups.rejected, (state, action) => {
        state.groups.status = 'failed';
        state.groups.error = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      });
  },
});

export default catalogSlice.reducer;
