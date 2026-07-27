import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as notificationApi from '../../Api/notificationApi';

// Notification routes are role-scoped — pick the base from the signed-in role.
const baseFor = (state) => notificationApi.notifBaseForRole(state?.user?.user?.role);

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (params, { getState, rejectWithValue }) => {
  try {
    return await notificationApi.getNotifications({ ...params, base: baseFor(getState()) });
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id, { getState, rejectWithValue }) => {
  try {
    await notificationApi.markNotificationRead(id, baseFor(getState()));
    return id;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async (_, { getState, rejectWithValue }) => {
  try {
    await notificationApi.markAllNotificationsRead(baseFor(getState()));
    return true;
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  items: [],
  unreadCount: 0,
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.meta = action.payload.meta;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Optimistically flip local read state so the UI updates instantly.
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find(n => n.id === action.payload);
        if (item && !item.read) {
          item.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach(n => { n.read = true; });
        state.unreadCount = 0;
      });
  },
});

export default notificationsSlice.reducer;
