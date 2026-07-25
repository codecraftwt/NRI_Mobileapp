import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorJobsApi from '../../Api/vendorJobsApi';

export const fetchVendorJobs = createAsyncThunk('vendorJobs/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await vendorJobsApi.getVendorJobs(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchVendorJobDetail = createAsyncThunk('vendorJobs/fetchDetail', async (ticket, { rejectWithValue }) => {
  try {
    return await vendorJobsApi.getVendorJobDetail(ticket);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  jobs: [],
  counts: { assigned: 0, in_progress: 0, completed: 0 },
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,

  detail: null,
  detailStatus: 'idle',
  detailError: null,
};

const vendorJobsSlice = createSlice({
  name: 'vendorJobs',
  initialState,
  reducers: {
    clearJobDetail: (state) => {
      state.detail = null;
      state.detailStatus = 'idle';
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorJobs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.jobs = action.payload.jobs;
        state.counts = action.payload.counts;
        state.meta = action.payload.meta;
      })
      .addCase(fetchVendorJobs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchVendorJobDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchVendorJobDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchVendorJobDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      });
  },
});

export const { clearJobDetail } = vendorJobsSlice.actions;
export default vendorJobsSlice.reducer;
