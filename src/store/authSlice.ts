import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { fetchProfileApi, updateProfileApi } from '@/services/profileService'
import type { AdminProfile, User, UpdateProfileParams } from '@/types/auth'

export type { AdminProfile, User, UpdateProfileParams }

export interface AuthState {
  token: string | null
  user: User | null
  profile: AdminProfile | null
  isAuthenticated: boolean
  isLoadingProfile: boolean
  profileError: string | null
}

const getInitialAuth = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      token: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoadingProfile: false,
      profileError: null,
    }
  }

  // Remove any obsolete stored user/profile data
  try {
    localStorage.removeItem('growvidya_user')
    localStorage.removeItem('growvidya_profile')
  } catch {
    // Ignore in non-browser environments
  }

  const token = localStorage.getItem('growvidya_token')

  return {
    token,
    user: null,
    profile: null,
    isAuthenticated: Boolean(token),
    isLoadingProfile: false,
    profileError: null,
  }
}

export const fetchAdminProfile = createAsyncThunk<
  AdminProfile,
  void,
  { state: { auth: AuthState }; rejectValue: string }
>('auth/fetchAdminProfile', async (_, { getState, rejectWithValue, dispatch }) => {
  const state = getState()
  const token = state.auth.token || (typeof window !== 'undefined' ? localStorage.getItem('growvidya_token') : null)

  if (!token) {
    return rejectWithValue('No authentication token found.')
  }

  try {
    const profile = await fetchProfileApi(token)
    return profile
  } catch (err: unknown) {
    const error = err as Error & { status?: number }
    if (error.status === 401) {
      dispatch(logout())
      return rejectWithValue('Session expired. Please log in again.')
    }
    return rejectWithValue(error.message || 'Failed to fetch admin profile.')
  }
})

export const updateAdminProfile = createAsyncThunk<
  AdminProfile,
  UpdateProfileParams,
  { state: { auth: AuthState }; rejectValue: string }
>('auth/updateAdminProfile', async (params, { getState, rejectWithValue, dispatch }) => {
  const state = getState()
  const token = state.auth.token || (typeof window !== 'undefined' ? localStorage.getItem('growvidya_token') : null)

  if (!token) {
    return rejectWithValue('No authentication token found.')
  }

  try {
    const profile = await updateProfileApi(token, params)
    return profile
  } catch (err: unknown) {
    const error = err as Error & { status?: number }
    if (error.status === 401) {
      dispatch(logout())
      return rejectWithValue('Session expired. Please log in again.')
    }
    return rejectWithValue(error.message || 'Failed to update admin profile.')
  }
})

const initialState: AuthState = getInitialAuth()

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: User }>
    ) => {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
      state.profileError = null
      localStorage.setItem('growvidya_token', action.payload.token)
    },
    setProfile: (state, action: PayloadAction<AdminProfile>) => {
      state.profile = action.payload
      state.user = { ...(state.user || {}), ...action.payload } as User
    },
    clearProfileError: (state) => {
      state.profileError = null
    },
    logout: (state) => {
      state.token = null
      state.user = null
      state.profile = null
      state.isAuthenticated = false
      state.isLoadingProfile = false
      state.profileError = null
      localStorage.removeItem('growvidya_token')
      localStorage.removeItem('growvidya_user')
      localStorage.removeItem('growvidya_profile')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProfile.pending, (state) => {
        state.isLoadingProfile = true
        state.profileError = null
      })
      .addCase(fetchAdminProfile.fulfilled, (state, action) => {
        state.isLoadingProfile = false
        state.profile = action.payload
        state.user = { ...(state.user || {}), ...action.payload } as User
        state.profileError = null
      })
      .addCase(fetchAdminProfile.rejected, (state, action) => {
        state.isLoadingProfile = false
        state.profileError = action.payload || 'Failed to fetch admin profile.'
      })
      .addCase(updateAdminProfile.fulfilled, (state, action) => {
        state.profile = action.payload
        state.user = { ...(state.user || {}), ...action.payload } as User
        state.profileError = null
      })
  },
})

export const { setCredentials, setProfile, clearProfileError, logout } = authSlice.actions
export default authSlice.reducer
