import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0 },
  reducers: {
    setNotifications: (state, { payload }) => {
      state.items = payload.data || []
      state.unreadCount = payload.unreadCount || 0
    },
    markRead: (state, { payload }) => {
      const n = state.items.find(i => i.id === payload)
      if (n && !n.is_read) { n.is_read = true; state.unreadCount = Math.max(0, state.unreadCount - 1) }
    },
    markAllRead: (state) => {
      state.items.forEach(n => { n.is_read = true })
      state.unreadCount = 0
    },
  },
})

export const { setNotifications, markRead, markAllRead } = notificationSlice.actions
export default notificationSlice.reducer
