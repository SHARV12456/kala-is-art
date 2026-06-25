import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Suspense, lazy } from 'react'
import AppLayout from './components/layout/AppLayout'

// Auth pages (eager — small, needed immediately)
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

// CRM pages (lazy)
const DashboardPage    = lazy(() => import('./pages/DashboardPage'))
const PriorityDashboard= lazy(() => import('./pages/PriorityDashboard'))
const CommunicationCenter = lazy(() => import('./pages/CommunicationCenter'))
const LeadsPage        = lazy(() => import('./pages/leads/LeadsPage'))
const LeadDetailPage   = lazy(() => import('./pages/leads/LeadDetailPage'))
const ClientsPage      = lazy(() => import('./pages/clients/ClientsPage'))
const ClientDetailPage = lazy(() => import('./pages/clients/ClientDetailPage'))
const ClientFolderPage = lazy(() => import('./pages/clients/ClientFolderPage'))
const FollowUpsPage    = lazy(() => import('./pages/FollowUpsPage'))
const EstimatesPage    = lazy(() => import('./pages/estimates/EstimatesPage'))
const EstimateFormPage = lazy(() => import('./pages/estimates/EstimateFormPage'))
const ExpensesPage     = lazy(() => import('./pages/accounting/ExpensesPage'))
const IncomePage       = lazy(() => import('./pages/accounting/IncomePage'))
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'))
const NotificationsPage= lazy(() => import('./pages/NotificationsPage'))
const ProfilePage      = lazy(() => import('./pages/ProfilePage'))
const AdminDashboard   = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminUsers       = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptionsPage'))
const IndiaMartPage    = lazy(() => import('./pages/integrations/IndiaMartPage'))

// Route guards
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((s) => s.auth)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useSelector((s) => s.auth)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />
  return children
}

const GuestRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((s) => s.auth)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

// Loading fallback
const Loader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
    </div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public auth routes — each page renders its own layout */}
          <Route path="/login"          element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register"       element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/forgot-password"element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

          {/* Protected CRM routes — all wrapped in AppLayout */}
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"       element={<DashboardPage />} />
            <Route path="priority"        element={<PriorityDashboard />} />
            <Route path="communications"  element={<CommunicationCenter />} />
            <Route path="leads"           element={<LeadsPage />} />
            <Route path="leads/:id"       element={<LeadDetailPage />} />
            <Route path="clients"           element={<ClientsPage />} />
            <Route path="clients/:id"       element={<ClientDetailPage />} />
            <Route path="clients/:id/folder" element={<ClientFolderPage />} />
            <Route path="followups"       element={<FollowUpsPage />} />
            <Route path="estimates"       element={<EstimatesPage />} />
            <Route path="estimates/new"   element={<EstimateFormPage />} />
            <Route path="estimates/:id/edit" element={<EstimateFormPage />} />
            <Route path="expenses"        element={<ExpensesPage />} />
            <Route path="income"          element={<IncomePage />} />
            <Route path="subscription"    element={<SubscriptionPage />} />
            <Route path="notifications"   element={<NotificationsPage />} />
            <Route path="profile"         element={<ProfilePage />} />
            <Route path="admin"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="admin/users"     element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
            <Route path="integrations/indiamart" element={<AdminRoute><IndiaMartPage /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
