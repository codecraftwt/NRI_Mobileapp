import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as adminTicketsApi from '../../Api/Admin/adminTicketsApi';

export const fetchAdminTickets = createAsyncThunk('adminTickets/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    return await adminTicketsApi.getAdminTickets(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  tickets: [],
  meta: null,
  status: 'idle',
  error: null,
};

const adminTicketsSlice = createSlice({
  name: 'adminTickets',
  initialState,
  reducers: {
    clearAdminTickets: (state) => {
      state.tickets = [];
      state.meta = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAdminTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const isAppend = action.meta.arg?.page > 1;
        if (isAppend) {
          state.tickets = [...state.tickets, ...action.payload.tickets];
        } else {
          state.tickets = action.payload.tickets;
        }
        state.meta = action.payload.meta;
      })
      .addCase(fetchAdminTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearAdminTickets } = adminTicketsSlice.actions;
export default adminTicketsSlice.reducer;
