import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmRequestsApi from '../../Api/RM/rmRequestsApi';

export const fetchRmEscalations = createAsyncThunk('rmEscalations/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    return await rmRequestsApi.getRmEscalations(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  escalations: [],
  meta: null,
  status: 'idle',
  error: null,
};

const rmEscalationsSlice = createSlice({
  name: 'rmEscalations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmEscalations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmEscalations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.escalations = action.payload.escalations;
        state.meta = action.payload.meta;
      })
      .addCase(fetchRmEscalations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default rmEscalationsSlice.reducer;
