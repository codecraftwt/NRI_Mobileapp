import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getTelecallerDashboard } from '../../Api/Telecaller/telecallerDashboardApi';

export const fetchTelecallerDashboard = createAsyncThunk(
  'telecallerDashboard/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await getTelecallerDashboard();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  stats: null,
  calls: null,
  unreadChats: 0,
  area: null,
  awaitingChats: [],
  linkedRequests: [],
  status: 'idle',
  error: null,
};

const telecallerDashboardSlice = createSlice({
  name: 'telecallerDashboard',
  initialState,
  reducers: {
    resetTelecallerDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTelecallerDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTelecallerDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.stats = action.payload.stats;
        state.calls = action.payload.calls;
        state.unreadChats = action.payload.unreadChats;
        state.area = action.payload.area;
        state.awaitingChats = action.payload.awaitingChats;
        state.linkedRequests = action.payload.linkedRequests;
      })
      .addCase(fetchTelecallerDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { resetTelecallerDashboard } = telecallerDashboardSlice.actions;
export default telecallerDashboardSlice.reducer;
