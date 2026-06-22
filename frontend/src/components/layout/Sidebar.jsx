import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, Calendar,
  FileText, TrendingUp, TrendingDown, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useSelector } from 'react-redux'

const NAV = [
  {
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/leads',      icon: Users,            label: 'Leads' },
      { to: '/follow-ups', icon: Calendar,         label: 'Follow-ups' },
      { to: '/clients',    icon: UserCheck,         label: 'Clients' },
      { to: '/estimates',  icon: FileText,          label: 'Estimates' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { to: '/income',   icon: TrendingUp,   label: 'Income' },
      { to: '/expenses', icon: TrendingDown, label: 'Expenses' },
    ]
  },
  {
    label: 'Integrations',
    items: [
      { to: '/integrations/indiamart', icon: TrendingUp, label: 'IndiaMART API' },
    ]
  },
  {
    label: 'Account',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  }
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user } = useSelector(s => s.auth)

  const adminNav = {
    label: 'Super Admin',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard' },
      { to: '/admin/subscriptions', icon: FileText, label: 'Subscriptions' },
    ]
  }

  const navLinks = user?.role === 'super_admin' ? [...NAV, adminNav] : NAV

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>K</span>
        </div>
        {!collapsed && (
          <span className="sidebar-logo-text">Kala Is Art</span>
        )}
      </div>

      {/* Nav links */}
      <div className="sidebar-nav">
        {navLinks.map((section, si) => (
          <div key={si} className="sidebar-section">
            {section.label && !collapsed && (
              <div className="sidebar-section-label">{section.label}</div>
            )}
            {section.items.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
                <item.icon size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--border)', padding: '12px 10px',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
      }}>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.owner_name || user?.name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.email}
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="btn btn-ghost btn-icon btn-sm"
          title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
        </button>
      </div>
    </nav>
  )
}
