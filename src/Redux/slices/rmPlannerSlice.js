import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmPlannerApi from '../../Api/RM/rmPlannerApi';

export const fetchRmPlanner = createAsyncThunk('rmPlanner/fetch', async (_, { rejectWithValue }) => {
  try {
    return await rmPlannerApi.getRmPlanner();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addRmPlannerEvent = createAsyncThunk('rmPlanner/add', async (payload, { rejectWithValue }) => {
  try {
    return await rmPlannerApi.addRmPlannerEvent(payload);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const completeRmPlannerEvent = createAsyncThunk('rmPlanner/complete', async (event, { rejectWithValue }) => {
  try {
    return await rmPlannerApi.completeRmPlannerEvent(event);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const deleteRmPlannerEvent = createAsyncThunk('rmPlanner/delete', async (event, { rejectWithValue }) => {
  try {
    return await rmPlannerApi.deleteRmPlannerEvent(event);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  overdue: [],
  today: [],
  upcoming: [],
  recentlyDone: [],
  status: 'idle',
  error: null,
  adding: false,
};

const rmPlannerSlice = createSlice({
  name: 'rmPlanner',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmPlanner.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmPlanner.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.overdue = action.payload.overdue;
        state.today = action.payload.today;
        state.upcoming = action.payload.upcoming;
        state.recentlyDone = action.payload.recentlyDone;
      })
      .addCase(fetchRmPlanner.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addRmPlannerEvent.pending, (state) => { state.adding = true; })
      .addCase(addRmPlannerEvent.fulfilled, (state) => { state.adding = false; })
      .addCase(addRmPlannerEvent.rejected, (state) => { state.adding = false; });
  },
});

export default rmPlannerSlice.reducer;
