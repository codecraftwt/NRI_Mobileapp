import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as adminCustomersApi from '../../Api/Admin/adminCustomersApi';

export const fetchAdminCustomers = createAsyncThunk('adminCustomers/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    return await adminCustomersApi.getAdminCustomers(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  customers: [],
  meta: null,
  status: 'idle',
  error: null,
};

const adminCustomersSlice = createSlice({
  name: 'adminCustomers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminCustomers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAdminCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const isAppend = action.meta.arg?.page > 1;
        if (isAppend) {
          state.customers = [...state.customers, ...action.payload.customers];
        } else {
          state.customers = action.payload.customers;
        }
        state.meta = action.payload.meta;
      })
      .addCase(fetchAdminCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default adminCustomersSlice.reducer;
