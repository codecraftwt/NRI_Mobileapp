import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as reportApi from '../../Api/reportApi';

export const fetchReports = createAsyncThunk('reports/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await reportApi.getReports(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchAnnualSummary = createAsyncThunk('reports/fetchAnnualSummary', async (params, { rejectWithValue }) => {
  try {
    return await reportApi.getAnnualSummary(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  reports: [],
  reportsMeta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  reportsStatus: 'idle',
  reportsError: null,
  annualSummary: null,
  annualSummaryStatus: 'idle',
  annualSummaryError: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.reportsStatus = 'loading';
        state.reportsError = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.reportsStatus = 'succeeded';
        state.reports = action.payload.reports;
        state.reportsMeta = action.payload.meta;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.reportsStatus = 'failed';
        state.reportsError = action.payload;
      })
      .addCase(fetchAnnualSummary.pending, (state) => {
        state.annualSummaryStatus = 'loading';
        state.annualSummaryError = null;
      })
      .addCase(fetchAnnualSummary.fulfilled, (state, action) => {
        state.annualSummaryStatus = 'succeeded';
        state.annualSummary = action.payload;
      })
      .addCase(fetchAnnualSummary.rejected, (state, action) => {
        state.annualSummaryStatus = 'failed';
        state.annualSummaryError = action.payload;
      });
  },
});

export default reportsSlice.reducer;
