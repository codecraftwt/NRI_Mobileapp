import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as adminDashboardApi from '../../Api/Admin/adminDashboardApi';

export const fetchAdminDashboard = createAsyncThunk('adminDashboard/fetch', async (_, { rejectWithValue }) => {
  try {
    return await adminDashboardApi.getAdminDashboard();
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  stats: null,
  stateBreakdown: [],
  rolesSummary: [],
  status: 'idle',
  error: null,
};

const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAdminDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.stats = action.payload.stats;
        state.stateBreakdown = action.payload.stateBreakdown;
        state.rolesSummary = action.payload.rolesSummary;
      })
      .addCase(fetchAdminDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default adminDashboardSlice.reducer;
