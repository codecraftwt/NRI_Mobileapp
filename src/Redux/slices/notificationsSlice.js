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
  // Ids flipped read by an in-flight "mark all read" — used to roll back if it fails.
  pendingAllReadIds: [],
  // Ids the user read this session. Kept so a focus-refetch that hasn't caught
  // up server-side (eventual consistency) doesn't resurrect them as unread.
  readIds: [],
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
        const page = action.payload.meta?.currentPage || 1;
        if (page > 1) {
          // Load-more: append the next page, skipping ids we already hold.
          const seen = new Set(state.items.map(n => n.id));
          state.items = [...state.items, ...action.payload.notifications.filter(n => !seen.has(n.id))];
        } else {
          // First page / refresh: replace.
          state.items = action.payload.notifications;
        }
        // Re-apply this session's reads the server list may not reflect yet, and
        // discount them from the server's unread total so the badge stays right.
        const readSet = new Set(state.readIds);
        let stillUnreadServerSide = 0;
        state.items.forEach(n => {
          if (readSet.has(n.id) && !n.read) { n.read = true; stillUnreadServerSide += 1; }
        });
        state.unreadCount = Math.max(0, (action.payload.unreadCount || 0) - stillUnreadServerSide);
        state.meta = action.payload.meta;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Optimistically flip read state the moment the request fires so the dot
      // and unread count clear instantly; roll back if the request fails.
      .addCase(markNotificationRead.pending, (state, action) => {
        const id = action.meta.arg;
        if (!state.readIds.includes(id)) state.readIds.push(id);
        const item = state.items.find(n => n.id === id);
        if (item && !item.read) {
          item.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        const id = action.meta.arg;
        state.readIds = state.readIds.filter(x => x !== id);
        const item = state.items.find(n => n.id === id);
        if (item && item.read) {
          item.read = false;
          state.unreadCount += 1;
        }
      })
      // "Mark all read" — optimistic, remembering which ids we flipped so a
      // failure restores exactly those (leaving already-read items untouched).
      .addCase(markAllNotificationsRead.pending, (state) => {
        state.pendingAllReadIds = state.items.filter(n => !n.read).map(n => n.id);
        state.items.forEach(n => { n.read = true; });
        state.pendingAllReadIds.forEach(id => { if (!state.readIds.includes(id)) state.readIds.push(id); });
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.pendingAllReadIds = [];
      })
      .addCase(markAllNotificationsRead.rejected, (state) => {
        const ids = new Set(state.pendingAllReadIds);
        state.items.forEach(n => { if (ids.has(n.id)) n.read = false; });
        state.readIds = state.readIds.filter(x => !ids.has(x));
        state.unreadCount = ids.size;
        state.pendingAllReadIds = [];
      });
  },
});

export default notificationsSlice.reducer;
