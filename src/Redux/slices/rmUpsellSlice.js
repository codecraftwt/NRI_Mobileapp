import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmUpsellApi from '../../Api/RM/rmUpsellApi';

export const fetchRmUpsell = createAsyncThunk('rmUpsell/fetch', async (_, { rejectWithValue }) => {
  try {
    return await rmUpsellApi.getRmUpsell();
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  opportunities: [],
  totalValue: null,
  status: 'idle',
  error: null,
};

const rmUpsellSlice = createSlice({
  name: 'rmUpsell',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmUpsell.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmUpsell.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.opportunities = action.payload.opportunities;
        state.totalValue = action.payload.totalValue;
      })
      .addCase(fetchRmUpsell.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default rmUpsellSlice.reducer;
