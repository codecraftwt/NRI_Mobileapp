import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorDashboardApi from '../../Api/Vendor/vendorDashboardApi';

export const fetchVendorDashboard = createAsyncThunk('vendorDashboard/fetch', async (_, { rejectWithValue }) => {
  try {
    return await vendorDashboardApi.getVendorDashboard();
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  counts: null,
  pendingPayout: 0,
  recentJobs: [],
  vendorStatus: null,
  status: 'idle',
  error: null,
};

const vendorDashboardSlice = createSlice({
  name: 'vendorDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.counts = action.payload.counts;
        state.pendingPayout = action.payload.pendingPayout;
        state.recentJobs = action.payload.recentJobs;
        state.vendorStatus = action.payload.vendorStatus;
      })
      .addCase(fetchVendorDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default vendorDashboardSlice.reducer;
