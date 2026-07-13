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

const initialState = {
  categories: [], // [{ id, name, slug, icon, description, baseServicesCount, addonServicesCount }]
  categoriesStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  categoriesError: null,
  base: { services: [], status: 'idle', error: null, filterKey: null },
  addon: { services: [], status: 'idle', error: null, filterKey: null },
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
      });
  },
});

export default catalogSlice.reducer;
