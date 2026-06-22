// ============================================================
// KALA IS ART - Axios API Client
// ============================================================
import axios from 'axios'
import { store } from '../store/store'
import { setToken, logout } from '../store/slices/authSlice'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
})

// Request interceptor — attach access token
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 and token refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      // For arraybuffer requests (e.g. PDF download), error.response.data is an ArrayBuffer
      // — not parsed JSON. Decode it manually to read the error code.
      let errorCode = error.response?.data?.code
      if (!errorCode && error.response?.data instanceof ArrayBuffer) {
        try {
          const text = new TextDecoder().decode(error.response.data)
          const json = JSON.parse(text)
          errorCode = json?.code
        } catch { /* non-JSON body, ignore */ }
      }

      if (errorCode === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return api(originalRequest)
            })
            .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const { data } = await api.post('/auth/refresh')
          const newToken = data.data.accessToken
          store.dispatch(setToken(newToken))
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          store.dispatch(logout())
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // Non-TOKEN_EXPIRED 401 → force logout
      store.dispatch(logout())
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

// ─── API Service Functions ────────────────────────────────────
export const authAPI = {
  register:              (data)  => api.post('/auth/register', data),
  verifyOTP:             (data)  => api.post('/auth/verify-otp', data),
  sendVerificationEmail: ()      => api.post('/auth/send-verification'),
  login:                 (data)  => api.post('/auth/login', data),
  logout:                ()      => api.post('/auth/logout'),
  forgotPassword:        (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:         (data)  => api.post('/auth/reset-password', data),
  getProfile:            ()      => api.get('/auth/profile'),
  getSessions:           ()      => api.get('/auth/sessions'),
  revokeSession:         (id)    => api.delete(`/auth/sessions/${id}`),
  refreshToken:          ()      => api.post('/auth/refresh'),
}

export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getOne: (id) => api.get(`/leads/${id}`),
  getStats: () => api.get('/leads/stats'),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  updateStatus: (id, payload) => api.patch(`/leads/${id}/status`, typeof payload === 'string' ? { status: payload } : payload),
  convertToClient: (id) => api.patch(`/leads/${id}/convert`),
  delete: (id) => api.delete(`/leads/${id}`),
  export: (params) => api.get('/leads/export', { params, responseType: 'blob' }),
}

export const clientsAPI = {
  getAll: (params) => api.get('/clients', { params }),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
}

export const followupsAPI = {
  getAll:            (params) => api.get('/followups', { params }),
  create:            (data)   => api.post('/followups', data),
  update:            (id, data) => api.put(`/followups/${id}`, data),
  complete:          (id, data) => api.patch(`/followups/${id}/complete`, data),
  delete:            (id)     => api.delete(`/followups/${id}`),
  markOverdueMissed: ()       => api.post('/followups/mark-overdue-missed'),
  getSchedulePreview:()       => api.get('/followups/schedule-preview'),
}

export const estimatesAPI = {
  getAll: (params) => api.get('/estimates', { params }),
  getOne: (id) => api.get(`/estimates/${id}`),
  create: (data) => api.post('/estimates', data),
  update: (id, data) => api.put(`/estimates/${id}`, data),
  delete: (id) => api.delete(`/estimates/${id}`),
  downloadPDF: (id) => api.get(`/estimates/${id}/pdf`),
}

export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getReport: (params) => api.get('/expenses/report', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
}

export const incomeAPI = {
  getAll: (params) => api.get('/income', { params }),
  getReport: (params) => api.get('/income/report', { params }),
  create: (data) => api.post('/income', data),
  update: (id, data) => api.put(`/income/${id}`, data),
  delete: (id) => api.delete(`/income/${id}`),
}

export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getMy: () => api.get('/subscriptions/my'),
  adminGetDashboard: () => api.get('/subscriptions/admin/dashboard'),
  adminGetCustomers: () => api.get('/subscriptions/admin/customers'),
  adminRecordPayment: (data) => api.post('/subscriptions/admin/record-payment', data),
  adminUpdateStatus: (subId, data) => api.put(`/subscriptions/admin/subscriptions/${subId}/status`, data),
}

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard'),
}

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
}

export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  upload: (formData, params) => api.post(`/documents/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params,
  }),
  delete: (id) => api.delete(`/documents/${id}`),
}

export const adminAPI = {
  getUsers:         (params)          => api.get('/admin/users', { params }),
  setAccountStatus: (id, status, note) => api.patch(`/admin/users/${id}/account-status`, { status, note }),
  updateNotes:      (id, data)        => api.patch(`/admin/users/${id}/notes`, data),
  verifyUser:       (id)              => api.patch(`/admin/users/${id}/verify-email`),
  getStatusLog:     (id)              => api.get(`/admin/users/${id}/status-log`),
  getRenewals:      ()                => api.get('/admin/renewals'),
  getStats:         ()                => api.get('/admin/revenue'),
  getActivityLogs:  (params)          => api.get('/admin/activity-logs', { params }),
}

export const userAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  getSettings: () => api.get('/settings'),
  saveSetting: (key, value) => api.post('/settings', { key, value }),
}

export const activitiesAPI = {
  getTimeline: (leadId) => api.get(`/activities/${leadId}`),
  log: (data)           => api.post('/activities', data),
}

export const priorityAPI = {
  getDashboard: () => api.get('/priority'),
  rescore:      () => api.post('/priority/rescore'),
}

export const commsAPI = {
  getContext:  (leadId)       => api.get(`/comms/context/${leadId}`),
  generate:    (data)         => api.post('/comms/generate', data),
  logWhatsapp: (data)         => api.post('/comms/whatsapp', data),
  sendEmail:   (data)         => api.post('/comms/email', data),
  logCall:     (data)         => api.post('/comms/call', data),
  getHistory:  (leadId)       => api.get(`/comms/history/${leadId}`),
  getAnalytics:(params)       => api.get('/comms/analytics', { params }),
}

export const clientPaymentsAPI = {
  getAll:          (clientId)                => api.get(`/clients/${clientId}/payments`),
  add:             (clientId, data)          => api.post(`/clients/${clientId}/payments`, data),
  update:          (clientId, payId, data)   => api.put(`/clients/${clientId}/payments/${payId}`, data),
  delete:          (clientId, payId)         => api.delete(`/clients/${clientId}/payments/${payId}`),
  setProjectValue: (clientId, value)         => api.patch(`/clients/${clientId}/project-value`, { total_project_value: value }),
}

export default api
