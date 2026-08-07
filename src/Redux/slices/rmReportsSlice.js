import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmReportsApi from '../../Api/RM/rmReportsApi';

export const fetchRmReports = createAsyncThunk('rmReports/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    return await rmReportsApi.getRmReports(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const reviewRmReport = createAsyncThunk('rmReports/review', async ({ report, comment }, { rejectWithValue }) => {
  try {
    return await rmReportsApi.reviewRmReport(report, comment);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const sendRmReport = createAsyncThunk('rmReports/send', async ({ report }, { rejectWithValue }) => {
  try {
    return await rmReportsApi.sendRmReport(report);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  reports: [],
  meta: null,
  status: 'idle',
  error: null,
  reviewingId: null,
  sendingId: null,
};

const rmReportsSlice = createSlice({
  name: 'rmReports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmReports.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmReports.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.reports = action.payload.reports;
        state.meta = action.payload.meta;
      })
      .addCase(fetchRmReports.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(reviewRmReport.pending, (state, action) => {
        state.reviewingId = action.meta.arg.report;
      })
      .addCase(reviewRmReport.fulfilled, (state, action) => {
        state.reviewingId = null;
        // Update the shared list item in place so both Reports and TicketDetail
        // reflect it. Prefer the server's returned report; fall back to flags.
        const id = action.meta.arg.report;
        const idx = state.reports.findIndex(r => String(r.id) === String(id));
        if (idx !== -1) {
          const srv = action.payload?.report;
          if (srv) {
            state.reports[idx] = { ...state.reports[idx], ...srv };
          } else {
            state.reports[idx].reviewed = true;
            if (action.meta.arg.comment != null) state.reports[idx].reviewComment = action.meta.arg.comment;
            if ((state.reports[idx].statusLabel || '').toLowerCase() === 'pending') state.reports[idx].statusLabel = 'Reviewed';
          }
        }
      })
      .addCase(reviewRmReport.rejected, (state) => {
        state.reviewingId = null;
      })
      .addCase(sendRmReport.pending, (state, action) => {
        state.sendingId = action.meta.arg.report;
      })
      .addCase(sendRmReport.fulfilled, (state, action) => {
        state.sendingId = null;
        // Reflect "sent" right away (from either screen). Prefer the server's
        // returned report so sent/sentAt/statusLabel match the API exactly;
        // fall back to setting the flags so the Pending filter drops it.
        const id = action.meta.arg.report;
        const idx = state.reports.findIndex(r => String(r.id) === String(id));
        if (idx !== -1) {
          const srv = action.payload?.report;
          state.reports[idx] = srv
            ? { ...state.reports[idx], ...srv, sent: true }
            : { ...state.reports[idx], sent: true, sentAt: state.reports[idx].sentAt || new Date().toISOString(), statusLabel: 'Sent' };
        }
      })
      .addCase(sendRmReport.rejected, (state) => {
        state.sendingId = null;
      });
  },
});

export default rmReportsSlice.reducer;
