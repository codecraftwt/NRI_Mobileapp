import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from '../../Api/authApi';
import { getDeviceName } from '../../Utils/device';

// The backend doesn't currently promise an `onboarded` field on login/me
// responses — onboarding-wizard completion is tracked purely client-side via
// `setOnboarded`. So when the incoming payload doesn't say, we must NOT
// guess a fresh default; that would clobber a correctly-tracked local
// "not yet onboarded" state (e.g. refreshing the app mid-signup-wizard) with
// a wrong guess. Only fall back to `true` when there's no local history at
// all (first-ever sign-in on this device) — a pre-existing account capable
// of signing in is assumed to have already completed setup elsewhere.
function resolveOnboarded(previousOnboarded, incomingOnboarded) {
  if (incomingOnboarded !== undefined) return incomingOnboarded;
  if (previousOnboarded !== undefined) return previousOnboarded;
  return true;
}

export const registerUser = createAsyncThunk(
  'user/register',
  async ({ name, email, phone, password, passwordConfirmation, referralCode, affiliateCode }, { rejectWithValue }) => {
    try {
      return await authApi.register({
        name,
        email,
        phone,
        password,
        passwordConfirmation,
        referralCode,
        affiliateCode,
        deviceName: getDeviceName(),
      });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const loginUser = createAsyncThunk(
  'user/login',
  async ({ login, password }, { rejectWithValue }) => {
    try {
      return await authApi.login({
        login,
        password,
        deviceName: getDeviceName(),
      });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Best-effort logout: always clears the local session, even if the server
// call fails (network error, already-expired/invalid token) — the user's
// intent to leave shouldn't be blocked by a revoke call we can't complete.
export const logoutUser = createAsyncThunk(
  'user/logout',
  async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // ignore — session is cleared locally regardless
    }
    return true;
  }
);

// Fetches the authenticated user's profile (customer profile, active
// membership, RM contact) — used to validate a persisted token on app start
// and to refresh profile data. Does NOT return a new token.
export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.me();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Saves profile fields to the backend (PUT /auth/profile) — named distinctly
// from the plain local `updateProfile` reducer below (still used for fields
// this endpoint doesn't accept, like dob/gender/bio/emergency contact).
export const saveUserProfile = createAsyncThunk(
  'user/saveProfile',
  async (payload, { rejectWithValue }) => {
    try {
      return await authApi.updateProfile(payload);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Change password revokes the user's OTHER active tokens server-side but
// leaves the current session's token valid, so no user/token state needs
// updating here beyond tracking request status for the UI.
export const changeUserPassword = createAsyncThunk(
  'user/changePassword',
  async ({ currentPassword, password, passwordConfirmation }, { rejectWithValue }) => {
    try {
      await authApi.changePassword({ currentPassword, password, passwordConfirmation });
      return true;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Always resolves as a success from the backend's point of view (200 "Reset
// link sent when the account exists") — it deliberately doesn't reveal
// whether the email is registered, so the UI shows the same confirmation
// either way. Only genuine failures (validation, network) are rejected.
export const forgotPassword = createAsyncThunk(
  'user/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      await authApi.forgotPassword({ email });
      return true;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  token: null,
  registerStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  registerError: null,
  loginStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  loginError: null,
  logoutStatus: 'idle', // 'idle' | 'loading' | 'succeeded'
  profileStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  profileError: null,
  saveProfileStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  saveProfileError: null,
  changePasswordStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  changePasswordError: null,
  forgotPasswordStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  forgotPasswordError: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload.user,
      };
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.registerStatus = 'idle';
      state.registerError = null;
      state.loginStatus = 'idle';
      state.loginError = null;
    },
    updateLanguage: (state, action) => {
      if (state.user) {
        state.user.language = action.payload;
      }
    },
    updateMembership: (state, action) => {
      if (state.user) {
        state.user.membership = action.payload;
        state.user.membershipExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    },
    setOnboarded: (state, action) => {
      if (state.user) {
        state.user.onboarded = action.payload;
      }
    },
    updateProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateAddress: (state, action) => {
      if (state.user) {
        state.user.address = { ...state.user.address, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.registerStatus = 'loading';
        state.registerError = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.registerStatus = 'succeeded';
        state.registerError = null;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.registerStatus = 'failed';
        state.registerError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(loginUser.pending, (state) => {
        state.loginStatus = 'loading';
        state.loginError = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loginStatus = 'succeeded';
        state.loginError = null;
        const previousOnboarded = state.user?.onboarded;
        state.user = action.payload.user;
        state.user.onboarded = resolveOnboarded(previousOnboarded, action.payload.user.onboarded);
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loginStatus = 'failed';
        state.loginError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(logoutUser.pending, (state) => {
        state.logoutStatus = 'loading';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.registerStatus = 'idle';
        state.registerError = null;
        state.loginStatus = 'idle';
        state.loginError = null;
        state.logoutStatus = 'idle';
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.profileStatus = 'loading';
        state.profileError = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.profileStatus = 'succeeded';
        state.profileError = null;
        const previousOnboarded = state.user?.onboarded;
        state.user = { ...state.user, ...action.payload.user };
        state.user.onboarded = resolveOnboarded(previousOnboarded, action.payload.user.onboarded);
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.profileStatus = 'failed';
        state.profileError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
        // A 401 means the persisted token is no longer valid — clear the
        // session so the rest of the app stops treating the user as signed
        // in. Any other failure (network hiccup, 5xx) is left alone so a
        // temporary connectivity issue doesn't sign the user out.
        if (action.payload?.status === 401) {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(saveUserProfile.pending, (state) => {
        state.saveProfileStatus = 'loading';
        state.saveProfileError = null;
      })
      .addCase(saveUserProfile.fulfilled, (state, action) => {
        state.saveProfileStatus = 'succeeded';
        state.saveProfileError = null;
        state.user = { ...state.user, ...action.payload.user };
      })
      .addCase(saveUserProfile.rejected, (state, action) => {
        state.saveProfileStatus = 'failed';
        state.saveProfileError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(changeUserPassword.pending, (state) => {
        state.changePasswordStatus = 'loading';
        state.changePasswordError = null;
      })
      .addCase(changeUserPassword.fulfilled, (state) => {
        state.changePasswordStatus = 'succeeded';
        state.changePasswordError = null;
      })
      .addCase(changeUserPassword.rejected, (state, action) => {
        state.changePasswordStatus = 'failed';
        state.changePasswordError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(forgotPassword.pending, (state) => {
        state.forgotPasswordStatus = 'loading';
        state.forgotPasswordError = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.forgotPasswordStatus = 'succeeded';
        state.forgotPasswordError = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotPasswordStatus = 'failed';
        state.forgotPasswordError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      });
  },
});

export const { login, logout, updateLanguage, updateMembership, setOnboarded, updateProfile, updateAddress } = userSlice.actions;
export default userSlice.reducer;
