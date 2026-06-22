import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    sidebarCollapsed: false,
    activeModal: null,
    theme: 'dark',
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen },
    setSidebarCollapsed: (state, { payload }) => { state.sidebarCollapsed = payload },
    openModal: (state, { payload }) => { state.activeModal = payload },
    closeModal: (state) => { state.activeModal = null },
  },
})

export const { toggleSidebar, setSidebarCollapsed, openModal, closeModal } = uiSlice.actions
export default uiSlice.reducer
