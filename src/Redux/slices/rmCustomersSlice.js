import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmCustomersApi from '../../Api/RM/rmCustomersApi';

export const fetchRmCustomers = createAsyncThunk('rmCustomers/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    return await rmCustomersApi.getRmCustomers(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  customers: [],
  meta: null,
  status: 'idle',
  error: null,
};

const rmCustomersSlice = createSlice({
  name: 'rmCustomers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmCustomers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.customers = action.payload.customers;
        state.meta = action.payload.meta;
      })
      .addCase(fetchRmCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default rmCustomersSlice.reducer;
