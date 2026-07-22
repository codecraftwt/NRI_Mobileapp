import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as serviceSubscriptionApi from '../../Api/serviceSubscriptionApi';

// Transient state for the recurring-subscription flow in CreateTicket:
// the documents a selection requires and the create/cancel actions.
export const fetchRequiredDocuments = createAsyncThunk(
  'serviceSubscription/fetchRequiredDocuments',
  async (serviceIds, { rejectWithValue }) => {
    try {
      return await serviceSubscriptionApi.getRequiredDocuments(serviceIds);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

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
  requiredDocuments: [],
  requiredDocsStatus: 'idle',
  requiredDocsError: null,
  subscriptions: [],
  listStatus: 'idle',
  listError: null,
  createStatus: 'idle',
  createError: null,
  cancelStatus: 'idle',
  cancelError: null,
};

const serviceSubscriptionSlice = createSlice({
  name: 'serviceSubscription',
  initialState,
  reducers: {
    clearRequiredDocuments: (state) => {
      state.requiredDocuments = [];
      state.requiredDocsStatus = 'idle';
      state.requiredDocsError = null;
    },
    resetServiceSubscription: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRequiredDocuments.pending, (state) => {
        state.requiredDocsStatus = 'loading';
        state.requiredDocsError = null;
      })
      .addCase(fetchRequiredDocuments.fulfilled, (state, action) => {
        state.requiredDocsStatus = 'succeeded';
        state.requiredDocuments = action.payload;
      })
      .addCase(fetchRequiredDocuments.rejected, (state, action) => {
        state.requiredDocsStatus = 'failed';
        state.requiredDocsError = action.payload;
      })
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
      .addCase(cancelServiceSubscription.pending, (state) => {
        state.cancelStatus = 'loading';
        state.cancelError = null;
      })
      .addCase(cancelServiceSubscription.fulfilled, (state) => {
        state.cancelStatus = 'succeeded';
      })
      .addCase(cancelServiceSubscription.rejected, (state, action) => {
        state.cancelStatus = 'failed';
        state.cancelError = action.payload;
      });
  },
});

export const { clearRequiredDocuments, resetServiceSubscription } = serviceSubscriptionSlice.actions;
export default serviceSubscriptionSlice.reducer;
