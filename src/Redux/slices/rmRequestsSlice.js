import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmRequestsApi from '../../Api/RM/rmRequestsApi';

export const fetchRmRequests = createAsyncThunk('rmRequests/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    return await rmRequestsApi.getRmRequests(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  requests: [],
  meta: null,
  status: 'idle',
  error: null,
};

const rmRequestsSlice = createSlice({
  name: 'rmRequests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmRequests.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmRequests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const isAppend = action.meta.arg?.page > 1;
        if (isAppend) {
          state.requests = [...state.requests, ...action.payload.requests];
        } else {
          state.requests = action.payload.requests;
        }
        state.meta = action.payload.meta;
      })
      .addCase(fetchRmRequests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default rmRequestsSlice.reducer;
