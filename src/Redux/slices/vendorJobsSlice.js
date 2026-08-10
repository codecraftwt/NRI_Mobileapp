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

// Job mutations — each refreshes the detail on success so the UI reflects the
// new status/report/tracking without a manual reload.
export const acceptJob = createAsyncThunk('vendorJobs/accept', async ({ ticket, vendorEta }, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorJobsApi.acceptVendorJob(ticket, { vendorEta });
    await dispatch(fetchVendorJobDetail(ticket));
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const rejectJob = createAsyncThunk('vendorJobs/reject', async ({ ticket, reason }, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorJobsApi.rejectVendorJob(ticket, { reason });
    await dispatch(fetchVendorJobDetail(ticket));
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const completeJob = createAsyncThunk('vendorJobs/complete', async ({ ticket, reportText, files }, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorJobsApi.completeVendorJob(ticket, { reportText, files });
    await dispatch(fetchVendorJobDetail(ticket));
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addReportAttachments = createAsyncThunk('vendorJobs/addAttachments', async ({ ticket, files }, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorJobsApi.addVendorJobReportAttachments(ticket, { files });
    await dispatch(fetchVendorJobDetail(ticket));
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const saveTracking = createAsyncThunk('vendorJobs/saveTracking', async ({ ticket, trackingNumber, trackingUrl }, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorJobsApi.saveVendorJobTracking(ticket, { trackingNumber, trackingUrl });
    await dispatch(fetchVendorJobDetail(ticket));
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  jobs: [],
  counts: { assigned: 0, in_progress: 0, completed: 0 },
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  // Separate flag for appending later pages (infinite scroll) so the visible
  // list isn't replaced by the full-screen loader while page 2+ loads.
  loadingMore: false,
  error: null,

  detail: null,
  detailStatus: 'idle',
  detailError: null,

  // Shared status for the accept/reject/complete/attachments/tracking mutations.
  actionStatus: 'idle',
  actionError: null,
};

const vendorJobsSlice = createSlice({
  name: 'vendorJobs',
  initialState,
  reducers: {
    clearJobDetail: (state) => {
      state.detail = null;
      state.detailStatus = 'idle';
      state.detailError = null;
      state.actionStatus = 'idle';
      state.actionError = null;
    },
    resetJobAction: (state) => {
      state.actionStatus = 'idle';
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorJobs.pending, (state, action) => {
        // page > 1 is a "load more" — keep the current list on screen and only
        // flip the footer spinner; page 1 (or unspecified) is a fresh load.
        const page = action.meta.arg?.page ?? 1;
        if (page > 1) state.loadingMore = true;
        else state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.loadingMore = false;
        const page = action.payload.meta?.currentPage ?? 1;
        if (page > 1) {
          // Append, skipping any ids already in the list (defensive against
          // overlap between pages).
          const seen = new Set(state.jobs.map(j => j.id));
          state.jobs = [...state.jobs, ...action.payload.jobs.filter(j => !seen.has(j.id))];
        } else {
          state.jobs = action.payload.jobs;
        }
        state.counts = action.payload.counts;
        state.meta = action.payload.meta;
      })
      .addCase(fetchVendorJobs.rejected, (state, action) => {
        state.status = state.loadingMore ? 'succeeded' : 'failed';
        state.loadingMore = false;
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

    // Shared pending/fulfilled/rejected handling for every job mutation.
    [acceptJob, rejectJob, completeJob, addReportAttachments, saveTracking].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.actionStatus = 'loading';
          state.actionError = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.actionStatus = 'succeeded';
        })
        .addCase(thunk.rejected, (state, action) => {
          state.actionStatus = 'failed';
          state.actionError = action.payload;
        });
    });
  },
});

export const { clearJobDetail, resetJobAction } = vendorJobsSlice.actions;
export default vendorJobsSlice.reducer;
