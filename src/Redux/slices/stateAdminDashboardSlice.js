import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as stateAdminDashboardApi from '../../Api/StateAdmin/stateAdminDashboardApi';

export const fetchStateAdminDashboard = createAsyncThunk(
  'stateAdminDashboard/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await stateAdminDashboardApi.getStateAdminDashboard();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  scope: null,
  stats: null,
  recentTickets: [],
  slaBreakdown: null,
  monthlyRevenueTrend: [],
  districtBreakdown: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const stateAdminDashboardSlice = createSlice({
  name: 'stateAdminDashboard',
  initialState,
  reducers: {
    resetStateAdminDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStateAdminDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStateAdminDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.scope = action.payload.scope;
        state.stats = action.payload.stats;
        state.recentTickets = action.payload.recentTickets;
        state.slaBreakdown = action.payload.slaBreakdown;
        state.monthlyRevenueTrend = action.payload.monthlyRevenueTrend;
        state.districtBreakdown = action.payload.districtBreakdown;
      })
      .addCase(fetchStateAdminDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { resetStateAdminDashboard } = stateAdminDashboardSlice.actions;
export default stateAdminDashboardSlice.reducer;
