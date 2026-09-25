import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as adminVendorsApi from '../../Api/Admin/adminVendorsApi';

export const fetchAdminVendors = createAsyncThunk('adminVendors/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    return await adminVendorsApi.getAdminVendors(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  vendors: [],
  meta: null,
  status: 'idle',
  error: null,
};

const adminVendorsSlice = createSlice({
  name: 'adminVendors',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminVendors.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAdminVendors.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const isAppend = action.meta.arg?.page > 1;
        if (isAppend) {
          state.vendors = [...state.vendors, ...action.payload.vendors];
        } else {
          state.vendors = action.payload.vendors;
        }
        state.meta = action.payload.meta;
      })
      .addCase(fetchAdminVendors.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default adminVendorsSlice.reducer;
