import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as serviceSubscriptionApi from '../../Api/serviceSubscriptionApi';

// Transient state for the recurring-subscription flow in CreateTicket: the
// create/cancel actions and the customer's existing subscriptions.
export const fetchServiceSubscriptions = createAsyncThunk(
  'serviceSubscription/fetchList',
  async (_, { rejectWithValue }) => {
    try {
      return await serviceSubscriptionApi.getServiceSubscriptions();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createServiceSubscription = createAsyncThunk(
  'serviceSubscription/create',
  async (params, { rejectWithValue }) => {
    try {
      return await serviceSubscriptionApi.createServiceSubscription(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const finalizeServiceSubscription = createAsyncThunk(
  'serviceSubscription/finalize',
  async ({ paymentId, ...params }, { rejectWithValue }) => {
    try {
      return await serviceSubscriptionApi.finalizeServiceSubscription(paymentId, params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const cancelServiceSubscription = createAsyncThunk(
  'serviceSubscription/cancel',
  async (subscriptionId, { rejectWithValue }) => {
    try {
      return await serviceSubscriptionApi.cancelServiceSubscription(subscriptionId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  subscriptions: [],
  listStatus: 'idle',
  listError: null,
  createStatus: 'idle',
  createError: null,
  finalizeStatus: 'idle',
  finalizeError: null,
  cancelStatus: 'idle',
  cancelError: null,
};

const serviceSubscriptionSlice = createSlice({
  name: 'serviceSubscription',
  initialState,
  reducers: {
    resetServiceSubscription: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceSubscriptions.pending, (state) => {
        state.listStatus = 'loading';
        state.listError = null;
      })
      .addCase(fetchServiceSubscriptions.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.subscriptions = action.payload;
      })
      .addCase(fetchServiceSubscriptions.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.listError = action.payload;
      })
      .addCase(createServiceSubscription.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createServiceSubscription.fulfilled, (state) => {
        state.createStatus = 'succeeded';
      })
      .addCase(createServiceSubscription.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      })
      .addCase(finalizeServiceSubscription.pending, (state) => {
        state.finalizeStatus = 'loading';
        state.finalizeError = null;
      })
      .addCase(finalizeServiceSubscription.fulfilled, (state) => {
        state.finalizeStatus = 'succeeded';
      })
      .addCase(finalizeServiceSubscription.rejected, (state, action) => {
        state.finalizeStatus = 'failed';
        state.finalizeError = action.payload;
      })
      .addCase(cancelServiceSubscription.pending, (state) => {
        state.cancelStatus = 'loading';
        state.cancelError = null;
      })
      .addCase(cancelServiceSubscription.fulfilled, (state, action) => {
        state.cancelStatus = 'succeeded';
        const sub = state.subscriptions.find(s => s.id === action.meta.arg);
        if (sub) sub.autoRenew = false;
      })
      .addCase(cancelServiceSubscription.rejected, (state, action) => {
        state.cancelStatus = 'failed';
        state.cancelError = action.payload;
      });
  },
});

export const { resetServiceSubscription } = serviceSubscriptionSlice.actions;
export default serviceSubscriptionSlice.reducer;
