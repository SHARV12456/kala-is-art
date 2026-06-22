import { createSlice } from '@reduxjs/toolkit'

const stored = localStorage.getItem('kala_user')

const initialState = {
  user: stored ? JSON.parse(stored) : null,
  accessToken: localStorage.getItem('kala_token') || null,
  subscription: null,
  isAuthenticated: !!localStorage.getItem('kala_token'),
  loading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      state.user = payload.user
      state.accessToken = payload.accessToken
      state.subscription = payload.subscription || null
      state.isAuthenticated = true
      localStorage.setItem('kala_token', payload.accessToken)
      localStorage.setItem('kala_user', JSON.stringify(payload.user))
    },
    setToken: (state, { payload }) => {
      state.accessToken = payload
      localStorage.setItem('kala_token', payload)
    },
    setSubscription: (state, { payload }) => {
      state.subscription = payload
    },
    updateUser: (state, { payload }) => {
      state.user = { ...state.user, ...payload }
      localStorage.setItem('kala_user', JSON.stringify(state.user))
    },
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.subscription = null
      state.isAuthenticated = false
      localStorage.removeItem('kala_token')
      localStorage.removeItem('kala_user')
    },
  },
})

export const { setCredentials, setToken, setSubscription, updateUser, logout } = authSlice.actions
export default authSlice.reducer
export const selectCurrentUser = (state) => state.auth.user
export const selectIsAdmin = (state) => state.auth.user?.role === 'super_admin'
export const selectHasSubscription = (state) =>
  state.auth.user?.role === 'super_admin' ||
  (state.auth.subscription?.status === 'active' && new Date(state.auth.subscription?.ends_at) > new Date())
