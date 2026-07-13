import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as addonSubscriptionApi from '../../Api/addonSubscriptionApi';
import { verifyPayment } from '../../Api/paymentsApi';

export const fetchMyAddonPackages = createAsyncThunk('addonSubscription/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await addonSubscriptionApi.getMyAddonPackages();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const subscribeAddonPackage = createAsyncThunk('addonSubscription/subscribe', async ({ packageId, gateway }, { rejectWithValue }) => {
  try {
    return await addonSubscriptionApi.subscribeAddonPackage(packageId, { gateway });
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const cancelAddonSubscription = createAsyncThunk('addonSubscription/cancel', async (subscriptionId, { rejectWithValue }) => {
  try {
    await addonSubscriptionApi.cancelAddonSubscription(subscriptionId);
    return subscriptionId;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const verifyAddonPayment = createAsyncThunk(
  'addonSubscription/verifyPayment',
  async ({ paymentId, ...params }, { rejectWithValue }) => {
    try {
      return await verifyPayment(paymentId, params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  packages: [],
  status: 'idle',
  error: null,
  mutationStatus: 'idle',
  mutationError: null,
  verifyStatus: 'idle',
  verifyError: null,
};

const addonSubscriptionSlice = createSlice({
  name: 'addonSubscription',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAddonPackages.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyAddonPackages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.packages = action.payload;
      })
      .addCase(fetchMyAddonPackages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(subscribeAddonPackage.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(subscribeAddonPackage.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
      })
      .addCase(subscribeAddonPackage.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      })
      .addCase(cancelAddonSubscription.fulfilled, (state, action) => {
        const pkg = state.packages.find(p => p.mySubscription?.id === action.payload);
        if (pkg) pkg.mySubscription = null;
      })
      .addCase(verifyAddonPayment.pending, (state) => {
        state.verifyStatus = 'loading';
        state.verifyError = null;
      })
      .addCase(verifyAddonPayment.fulfilled, (state) => {
        state.verifyStatus = 'succeeded';
      })
      .addCase(verifyAddonPayment.rejected, (state, action) => {
        state.verifyStatus = 'failed';
        state.verifyError = action.payload;
      });
  },
});

export default addonSubscriptionSlice.reducer;
