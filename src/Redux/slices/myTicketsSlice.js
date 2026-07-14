import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as ticketApi from '../../Api/ticketApi';

export const fetchMyTickets = createAsyncThunk('myTickets/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await ticketApi.getTickets(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchTicketDetail = createAsyncThunk('myTickets/fetchDetail', async (ticketId, { rejectWithValue }) => {
  try {
    return await ticketApi.getTicketDetail(ticketId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const rateTicket = createAsyncThunk('myTickets/rate', async ({ ticketId, rating, note }, { rejectWithValue }) => {
  try {
    await ticketApi.rateTicket(ticketId, { rating, note });
    return { ticketId, rating, note };
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  tickets: [],
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,
  detail: null,
  detailStatus: 'idle',
  detailError: null,
  rateStatus: 'idle',
  rateError: null,
};

const myTicketsSlice = createSlice({
  name: 'myTickets',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload.tickets;
        state.meta = action.payload.meta;
      })
      .addCase(fetchMyTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchTicketDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchTicketDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchTicketDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      })
      .addCase(rateTicket.pending, (state) => {
        state.rateStatus = 'loading';
        state.rateError = null;
      })
      .addCase(rateTicket.fulfilled, (state, action) => {
        state.rateStatus = 'succeeded';
        // Optimistically reflect the submitted rating on the currently
        // loaded detail (the backend doesn't echo the stored rating back in
        // the /rate response, only a confirmation message).
        if (state.detail && state.detail.id === action.payload.ticketId) {
          state.detail.rating = {
            value: action.payload.rating,
            note: action.payload.note || null,
            createdAt: new Date().toISOString(),
          };
        }
      })
      .addCase(rateTicket.rejected, (state, action) => {
        state.rateStatus = 'failed';
        state.rateError = action.payload;
      });
  },
});

export default myTicketsSlice.reducer;
