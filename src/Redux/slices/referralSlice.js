import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as referralApi from '../../Api/referralApi';

export const fetchReferralOverview = createAsyncThunk(
  'referral/fetchOverview',
  async (_, { rejectWithValue }) => {
    try {
      return await referralApi.getReferralOverview();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  referralCode: null,
  shareLink: null,
  totals: { signups: 0, earned: 0, pending: 0 },
  referred: [],
  rewards: [],
  leaderboard: [],
  status: 'idle',
  error: null,
};

const referralSlice = createSlice({
  name: 'referral',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReferralOverview.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReferralOverview.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.referralCode = action.payload.referralCode;
        state.shareLink = action.payload.shareLink;
        state.totals = action.payload.totals;
        state.referred = action.payload.referred;
        state.rewards = action.payload.rewards;
        state.leaderboard = action.payload.leaderboard;
      })
      .addCase(fetchReferralOverview.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default referralSlice.reducer;
