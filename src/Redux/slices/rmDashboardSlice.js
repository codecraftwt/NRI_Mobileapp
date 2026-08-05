import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmDashboardApi from '../../Api/RM/rmDashboardApi';

export const fetchRmDashboard = createAsyncThunk('rmDashboard/fetch', async (_, { rejectWithValue }) => {
  try {
    return await rmDashboardApi.getRmDashboard();
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  stats: null,
  pendingRequests: [],
  upcomingBirthdays: [],
  todayEvents: [],
  status: 'idle',
  error: null,
};

const rmDashboardSlice = createSlice({
  name: 'rmDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.stats = action.payload.stats;
        state.pendingRequests = action.payload.pendingRequests;
        state.upcomingBirthdays = action.payload.upcomingBirthdays;
        state.todayEvents = action.payload.todayEvents;
      })
      .addCase(fetchRmDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default rmDashboardSlice.reducer;
