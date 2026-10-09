import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as stateAdminCustomersApi from '../../Api/StateAdmin/stateAdminCustomersApi';

export const fetchStateAdminCustomers = createAsyncThunk(
  'stateAdminCustomers/fetch',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await stateAdminCustomersApi.getStateAdminCustomers(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchNextStateAdminCustomers = createAsyncThunk(
  'stateAdminCustomers/fetchNext',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().stateAdminCustomers;
      const nextPage = (state.meta?.currentPage || 1) + 1;
      if (nextPage > (state.meta?.lastPage || 1)) {
        return null;
      }
      return await stateAdminCustomersApi.getStateAdminCustomers({ ...params, page: nextPage });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  customers: [],
  meta: {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15,
  },
  status: 'idle', // 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed'
  error: null,
};

const stateAdminCustomersSlice = createSlice({
  name: 'stateAdminCustomers',
  initialState,
  reducers: {
    resetStateAdminCustomers: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStateAdminCustomers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStateAdminCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.customers = action.payload?.customers || [];
        state.meta = action.payload?.meta || state.meta;
      })
      .addCase(fetchStateAdminCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchNextStateAdminCustomers.pending, (state) => {
        state.status = 'loadingMore';
      })
      .addCase(fetchNextStateAdminCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          const newCustomers = action.payload.customers || [];
          const existingIds = new Set(state.customers.map(c => c.id));
          const uniqueNew = newCustomers.filter(c => !existingIds.has(c.id));
          state.customers = [...state.customers, ...uniqueNew];
          state.meta = action.payload.meta;
        }
      })
      .addCase(fetchNextStateAdminCustomers.rejected, (state, action) => {
        state.status = 'succeeded'; // Don't block UI on load-more failure
        state.error = action.payload;
      });
  },
});

export const { resetStateAdminCustomers } = stateAdminCustomersSlice.actions;
export default stateAdminCustomersSlice.reducer;
