import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as stateAdminUsersApi from '../../Api/StateAdmin/stateAdminUsersApi';

export const fetchStateAdminUsers = createAsyncThunk(
  'stateAdminUsers/fetch',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.getStateAdminUsers(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchNextStateAdminUsers = createAsyncThunk(
  'stateAdminUsers/fetchNext',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().stateAdminUsers;
      const nextPage = (state.meta?.currentPage || 1) + 1;
      if (nextPage > (state.meta?.lastPage || 1)) {
        return null;
      }
      return await stateAdminUsersApi.getStateAdminUsers({ ...params, page: nextPage });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchAssignableRoles = createAsyncThunk(
  'stateAdminUsers/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.getUserAssignableRoles();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchUserRegionScope = createAsyncThunk(
  'stateAdminUsers/fetchScope',
  async (_, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.getUserRegionScope();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchStateAdminUserDetail = createAsyncThunk(
  'stateAdminUsers/fetchDetail',
  async (userId, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.getStateAdminUserDetail(userId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createStateAdminUser = createAsyncThunk(
  'stateAdminUsers/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.createStateAdminUser(payload);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateStateAdminUser = createAsyncThunk(
  'stateAdminUsers/update',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.updateStateAdminUser(userId, data);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deleteStateAdminUser = createAsyncThunk(
  'stateAdminUsers/delete',
  async (userId, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.deleteStateAdminUser(userId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const restoreStateAdminUser = createAsyncThunk(
  'stateAdminUsers/restore',
  async (userId, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.restoreStateAdminUser(userId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const toggleStateAdminUserStatus = createAsyncThunk(
  'stateAdminUsers/toggleStatus',
  async (userId, { rejectWithValue }) => {
    try {
      return await stateAdminUsersApi.toggleStateAdminUserStatus(userId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  users: [],
  meta: {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15,
  },
  status: 'idle', // 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed'
  error: null,

  assignableRoles: [],
  rolesStatus: 'idle',

  regionScope: null,
  scopeStatus: 'idle',

  selectedUser: null,
  detailStatus: 'idle',

  actionStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  actionError: null,
};

const stateAdminUsersSlice = createSlice({
  name: 'stateAdminUsers',
  initialState,
  reducers: {
    resetStateAdminUsers: () => initialState,
    resetUserActionStatus: (state) => {
      state.actionStatus = 'idle';
      state.actionError = null;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
      state.detailStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchStateAdminUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStateAdminUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.users = action.payload?.users || [];
        state.meta = action.payload?.meta || state.meta;
      })
      .addCase(fetchStateAdminUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Next Page
      .addCase(fetchNextStateAdminUsers.pending, (state) => {
        state.status = 'loadingMore';
      })
      .addCase(fetchNextStateAdminUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          const newUsers = action.payload.users || [];
          const existingIds = new Set(state.users.map(u => u.id));
          const uniqueNew = newUsers.filter(u => !existingIds.has(u.id));
          state.users = [...state.users, ...uniqueNew];
          state.meta = action.payload.meta;
        }
      })
      .addCase(fetchNextStateAdminUsers.rejected, (state, action) => {
        state.status = 'succeeded';
        state.error = action.payload;
      })

      // Fetch Roles
      .addCase(fetchAssignableRoles.fulfilled, (state, action) => {
        state.rolesStatus = 'succeeded';
        state.assignableRoles = action.payload || [];
      })

      // Fetch Region Scope
      .addCase(fetchUserRegionScope.fulfilled, (state, action) => {
        state.scopeStatus = 'succeeded';
        state.regionScope = action.payload || null;
      })

      // Fetch Detail
      .addCase(fetchStateAdminUserDetail.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(fetchStateAdminUserDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.selectedUser = action.payload;
      })
      .addCase(fetchStateAdminUserDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
      })

      // Create
      .addCase(createStateAdminUser.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(createStateAdminUser.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.actionError = null;
        if (action.payload?.user) {
          state.users = [action.payload.user, ...state.users];
          if (state.meta) state.meta.total = (state.meta.total || 0) + 1;
        }
      })
      .addCase(createStateAdminUser.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      })

      // Update
      .addCase(updateStateAdminUser.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(updateStateAdminUser.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.actionError = null;
        if (action.payload?.user) {
          const updated = action.payload.user;
          state.users = state.users.map(u => (u.id === updated.id ? updated : u));
          if (state.selectedUser?.id === updated.id) {
            state.selectedUser = updated;
          }
        }
      })
      .addCase(updateStateAdminUser.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      })

      // Delete
      .addCase(deleteStateAdminUser.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(deleteStateAdminUser.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        const deletedId = action.payload?.userId;
        if (deletedId) {
          state.users = state.users.filter(u => u.id !== deletedId);
          if (state.meta) state.meta.total = Math.max(0, (state.meta.total || 1) - 1);
        }
      })
      .addCase(deleteStateAdminUser.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      })

      // Restore
      .addCase(restoreStateAdminUser.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(restoreStateAdminUser.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.actionError = null;
        const { userId, user } = action.payload || {};
        if (user) {
          state.users = state.users.map(u => (u.id === user.id ? user : u));
          if (state.selectedUser?.id === user.id) state.selectedUser = user;
        } else if (userId != null) {
          state.users = state.users.map(u => (u.id === userId ? { ...u, status: 'active' } : u));
        }
      })
      .addCase(restoreStateAdminUser.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      })

      // Toggle Active/Inactive
      .addCase(toggleStateAdminUserStatus.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(toggleStateAdminUserStatus.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.actionError = null;
        const { userId, user } = action.payload || {};
        if (user) {
          state.users = state.users.map(u => (u.id === user.id ? user : u));
          if (state.selectedUser?.id === user.id) state.selectedUser = user;
        } else if (userId != null) {
          state.users = state.users.map(u => (u.id === userId ? { ...u, isActive: !u.isActive } : u));
          if (state.selectedUser?.id === userId) {
            state.selectedUser = { ...state.selectedUser, isActive: !state.selectedUser.isActive };
          }
        }
      })
      .addCase(toggleStateAdminUserStatus.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      });
  },
});

export const { resetStateAdminUsers, resetUserActionStatus, clearSelectedUser } = stateAdminUsersSlice.actions;
export default stateAdminUsersSlice.reducer;
