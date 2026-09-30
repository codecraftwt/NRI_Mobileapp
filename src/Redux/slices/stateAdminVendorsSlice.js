import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as stateAdminVendorsApi from '../../Api/StateAdmin/stateAdminVendorsApi';

export const fetchStateAdminVendors = createAsyncThunk(
  'stateAdminVendors/fetch',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await stateAdminVendorsApi.getStateAdminVendors(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchNextStateAdminVendors = createAsyncThunk(
  'stateAdminVendors/fetchNext',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().stateAdminVendors;
      const nextPage = (state.meta?.currentPage || 1) + 1;
      if (nextPage > (state.meta?.lastPage || 1)) {
        return null;
      }
      return await stateAdminVendorsApi.getStateAdminVendors({ ...params, page: nextPage });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createStateAdminVendor = createAsyncThunk(
  'stateAdminVendors/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await stateAdminVendorsApi.createStateAdminVendor(payload);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  vendors: [],
  meta: {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15,
  },
  status: 'idle', // 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed'
  error: null,
  createStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  createError: null,
};

const stateAdminVendorsSlice = createSlice({
  name: 'stateAdminVendors',
  initialState,
  reducers: {
    resetStateAdminVendors: () => initialState,
    resetCreateStatus: (state) => {
      state.createStatus = 'idle';
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStateAdminVendors.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStateAdminVendors.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.vendors = action.payload?.vendors || [];
        state.meta = action.payload?.meta || state.meta;
      })
      .addCase(fetchStateAdminVendors.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchNextStateAdminVendors.pending, (state) => {
        state.status = 'loadingMore';
      })
      .addCase(fetchNextStateAdminVendors.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          const newVendors = action.payload.vendors || [];
          const existingIds = new Set(state.vendors.map(v => v.id));
          const uniqueNew = newVendors.filter(v => !existingIds.has(v.id));
          state.vendors = [...state.vendors, ...uniqueNew];
          state.meta = action.payload.meta;
        }
      })
      .addCase(fetchNextStateAdminVendors.rejected, (state, action) => {
        state.status = 'succeeded'; // Don't block UI on load-more failure
        state.error = action.payload;
      })
      .addCase(createStateAdminVendor.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createStateAdminVendor.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.createError = null;
        if (action.payload?.vendor) {
          const newVendor = stateAdminVendorsApi.mapStateAdminVendor(action.payload.vendor);
          state.vendors = [newVendor, ...state.vendors];
          if (state.meta) state.meta.total = (state.meta.total || 0) + 1;
        }
      })
      .addCase(createStateAdminVendor.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      });
  },
});

export const { resetStateAdminVendors, resetCreateStatus } = stateAdminVendorsSlice.actions;
export default stateAdminVendorsSlice.reducer;
