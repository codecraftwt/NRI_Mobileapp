import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorSupportApi from '../../Api/Vendor/vendorSupportApi';

export const fetchVendorDisputes = createAsyncThunk('vendorSupport/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await vendorSupportApi.getVendorDisputes(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const raiseVendorDispute = createAsyncThunk('vendorSupport/raise', async ({ ticketId, reason, amount }, { rejectWithValue }) => {
  try {
    return await vendorSupportApi.raiseVendorDispute({ ticketId, reason, amount });
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  disputes: [],
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,

  raiseStatus: 'idle',
  raiseError: null,
};

const vendorSupportSlice = createSlice({
  name: 'vendorSupport',
  initialState,
  reducers: {
    resetRaiseStatus: (state) => {
      state.raiseStatus = 'idle';
      state.raiseError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorDisputes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorDisputes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.disputes = action.payload.disputes;
        state.meta = action.payload.meta;
      })
      .addCase(fetchVendorDisputes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(raiseVendorDispute.pending, (state) => {
        state.raiseStatus = 'loading';
        state.raiseError = null;
      })
      .addCase(raiseVendorDispute.fulfilled, (state, action) => {
        state.raiseStatus = 'succeeded';
        if (action.payload.dispute) {
          state.disputes = [action.payload.dispute, ...state.disputes];
          state.meta.total += 1;
        }
      })
      .addCase(raiseVendorDispute.rejected, (state, action) => {
        state.raiseStatus = 'failed';
        state.raiseError = action.payload;
      });
  },
});

export const { resetRaiseStatus } = vendorSupportSlice.actions;
export default vendorSupportSlice.reducer;
