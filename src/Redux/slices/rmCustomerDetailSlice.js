import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmCustomersApi from '../../Api/RM/rmCustomersApi';

export const fetchRmCustomerDetail = createAsyncThunk('rmCustomerDetail/fetch', async (customer, { rejectWithValue }) => {
  try {
    return await rmCustomersApi.getRmCustomerDetail(customer);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  detail: null,
  status: 'idle',
  error: null,
};

const rmCustomerDetailSlice = createSlice({
  name: 'rmCustomerDetail',
  initialState,
  reducers: {
    resetRmCustomerDetail: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmCustomerDetail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmCustomerDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchRmCustomerDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { resetRmCustomerDetail } = rmCustomerDetailSlice.actions;
export default rmCustomerDetailSlice.reducer;
