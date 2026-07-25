import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorRatingsApi from '../../Api/vendorRatingsApi';

export const fetchVendorRatings = createAsyncThunk('vendorRatings/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await vendorRatingsApi.getVendorRatings(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  summary: null,
  ratings: [],
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,
};

const vendorRatingsSlice = createSlice({
  name: 'vendorRatings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorRatings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorRatings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.summary = action.payload.summary;
        state.ratings = action.payload.ratings;
        state.meta = action.payload.meta;
      })
      .addCase(fetchVendorRatings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default vendorRatingsSlice.reducer;
