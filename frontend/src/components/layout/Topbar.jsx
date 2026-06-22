import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Bell, LogOut, User, Settings } from 'lucide-react'
import { logout } from '../../store/slices/authSlice'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function Topbar({ setCmdOpen }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const unreadCount = useSelector(s => s.notifications?.unreadCount || 0)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    dispatch(logout())
    navigate('/login')
    toast.success('Signed out')
  }

  const initials = (user?.owner_name || user?.name || 'U').charAt(0).toUpperCase()

  return (
    <header style={{
      height: 52,
      background: '#fff',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Search */}
      <button onClick={() => setCmdOpen?.(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: 6,
          cursor: 'text', fontSize: 13, color: 'var(--text-4)',
          minWidth: 200, transition: 'border-color 0.12s',
        }}
        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
        <Search size={13}/>
        <span>Search</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>⌘K</span>
      </button>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Notifications */}
        <button onClick={() => navigate('/notifications')}
          style={{ position: 'relative', padding: 8, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-3)', borderRadius: 6,
            display: 'flex', alignItems: 'center', transition: 'background 0.1s' }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}>
          <Bell size={16} strokeWidth={1.8}/>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 5, right: 5,
              width: 14, height: 14, background: 'var(--danger)',
              borderRadius: '50%', fontSize: 8, fontWeight: 600,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }}/>

        {/* User avatar & menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
              background: 'none', border: '1px solid transparent', borderRadius: 6,
              cursor: 'pointer', transition: 'all 0.1s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: 'var(--text)',
            }}>{initials}</div>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-2)' }}>
              {user?.owner_name || user?.name || 'User'}
            </span>
          </button>

          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setMenuOpen(false)}/>
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: 'var(--shadow-md)',
                minWidth: 168, zIndex: 50, overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                    {user?.owner_name || user?.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{user?.email}</div>
                </div>
                {[
                  { label: 'Profile', icon: User, to: '/profile' },
                  { label: 'Settings', icon: Settings, to: '/settings' },
                ].map(item => (
                  <button key={item.label} onClick={() => { navigate(item.to); setMenuOpen(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', background: 'none', border: 'none',
                      fontSize: 13, color: 'var(--text-2)', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)', transition: 'background 0.08s',
                      textAlign: 'left', fontFamily: 'var(--font)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}>
                    <item.icon size={13} color="var(--text-3)"/>
                    {item.label}
                  </button>
                ))}
                <button onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', background: 'none', border: 'none',
                    fontSize: 13, color: 'var(--danger)', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'var(--font)', transition: 'background 0.08s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <LogOut size={13}/> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
