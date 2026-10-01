import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as stateAdminTicketsApi from '../../Api/StateAdmin/stateAdminTicketsApi';

export const fetchStateAdminTickets = createAsyncThunk(
  'stateAdminTickets/fetch',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await stateAdminTicketsApi.getStateAdminTickets(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchNextStateAdminTickets = createAsyncThunk(
  'stateAdminTickets/fetchNext',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().stateAdminTickets;
      const nextPage = (state.meta?.currentPage || 1) + 1;
      if (nextPage > (state.meta?.lastPage || 1)) {
        return null;
      }
      return await stateAdminTicketsApi.getStateAdminTickets({ ...params, page: nextPage });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  tickets: [],
  meta: {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
    statusCounts: {},
  },
  status: 'idle', // 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed'
  error: null,
};

const stateAdminTicketsSlice = createSlice({
  name: 'stateAdminTickets',
  initialState,
  reducers: {
    resetStateAdminTickets: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStateAdminTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStateAdminTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload?.tickets || [];
        state.meta = action.payload?.meta || state.meta;
      })
      .addCase(fetchStateAdminTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchNextStateAdminTickets.pending, (state) => {
        state.status = 'loadingMore';
      })
      .addCase(fetchNextStateAdminTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          const newTickets = action.payload.tickets || [];
          const existingIds = new Set(state.tickets.map(t => t.id));
          const uniqueNew = newTickets.filter(t => !existingIds.has(t.id));
          state.tickets = [...state.tickets, ...uniqueNew];
          state.meta = action.payload.meta;
        }
      })
      .addCase(fetchNextStateAdminTickets.rejected, (state, action) => {
        state.status = 'succeeded'; // Don't block UI on load-more failure
        state.error = action.payload;
      });
  },
});

export const { resetStateAdminTickets } = stateAdminTicketsSlice.actions;
export default stateAdminTicketsSlice.reducer;
