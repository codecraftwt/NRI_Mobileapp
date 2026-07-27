import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorEarningsApi from '../../Api/vendorEarningsApi';

export const fetchVendorEarnings = createAsyncThunk('vendorEarnings/fetch', async (params, { rejectWithValue }) => {
  try {
    return await vendorEarningsApi.getVendorEarnings(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchVendorPayoutDetail = createAsyncThunk('vendorEarnings/fetchDetail', async (payoutId, { rejectWithValue }) => {
  try {
    return await vendorEarningsApi.getVendorPayoutDetail(payoutId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  totals: null,
  payouts: [],
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,

  detail: null,
  detailStatus: 'idle',
  detailError: null,
};

const vendorEarningsSlice = createSlice({
  name: 'vendorEarnings',
  initialState,
  reducers: {
    clearPayoutDetail: (state) => {
      state.detail = null;
      state.detailStatus = 'idle';
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorEarnings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorEarnings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.totals = action.payload.totals;
        state.payouts = action.payload.payouts;
        state.meta = action.payload.meta;
      })
      .addCase(fetchVendorEarnings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchVendorPayoutDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchVendorPayoutDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchVendorPayoutDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      });
  },
});

export const { clearPayoutDetail } = vendorEarningsSlice.actions;
export default vendorEarningsSlice.reducer;
