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
      .addCase(reviewRmReport.fulfilled, (state) => {
        state.reviewingId = null;
      })
      .addCase(reviewRmReport.rejected, (state) => {
        state.reviewingId = null;
      })
      .addCase(sendRmReport.pending, (state, action) => {
        state.sendingId = action.meta.arg.report;
      })
      .addCase(sendRmReport.fulfilled, (state) => {
        state.sendingId = null;
      })
      .addCase(sendRmReport.rejected, (state) => {
        state.sendingId = null;
      });
  },
});

export default rmReportsSlice.reducer;
