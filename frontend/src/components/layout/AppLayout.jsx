import { useState, useRef, useEffect } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { Search, X, Users, UserCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { leadsAPI, clientsAPI } from '../../services/api'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import FloatingActionButton from '../FloatingActionButton'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [cmdOpen, setCmdOpen]     = useState(false)
  const [cmdQ, setCmdQ]           = useState('')
  const navigate = useNavigate()
  const cmdRef = useRef(null)

  const { data: searchData } = useQuery({
    queryKey: ['global-search', cmdQ],
    queryFn: async () => {
      if (cmdQ.length < 2) return { leads: [], clients: [] }
      const [l, c] = await Promise.all([
        leadsAPI.getAll({ search: cmdQ, limit: 5 }),
        clientsAPI.getAll({ search: cmdQ, limit: 5 }),
      ])
      return { leads: l.data.data || [], clients: c.data.data || [] }
    },
    enabled: cmdQ.length >= 2,
  })

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true) }
      if (e.key === 'Escape') { setCmdOpen(false); setCmdQ('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed}/>

      <div className={`main-content${collapsed ? ' collapsed' : ''}`}>
        <Topbar setCmdOpen={setCmdOpen}/>
        <main className="page-content">
          <Outlet/>
        </main>
      </div>

      {/* FAB */}
      <FloatingActionButton/>

      {/* Command palette */}
      {cmdOpen && (
        <div className="cmd-overlay" onClick={e => e.target === e.currentTarget && setCmdOpen(false)}>
          <div className="cmd-box" ref={cmdRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
              <Search size={15} color="var(--text-4)"/>
              <input autoFocus className="cmd-input"
                style={{ padding: '14px 0', border: 'none', borderBottom: '1px solid var(--border)' }}
                placeholder="Search leads, clients, estimates…"
                value={cmdQ} onChange={e => setCmdQ(e.target.value)}/>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setCmdOpen(false); setCmdQ('') }}>
                <X size={14}/>
              </button>
            </div>
            {cmdQ.length >= 2 && (
              <div className="cmd-results">
                {searchData?.leads?.map(l => (
                  <div key={l.id} className="cmd-result-item"
                    onClick={() => { navigate(`/leads/${l.id}`); setCmdOpen(false); setCmdQ('') }}>
                    <Users size={13} color="var(--text-3)"/>
                    <span style={{ fontSize: 13 }}>{l.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)' }}>
                      Lead{l.city ? ` · ${l.city}` : ''}
                    </span>
                  </div>
                ))}
                {searchData?.clients?.map(c => (
                  <div key={c.id} className="cmd-result-item"
                    onClick={() => { navigate(`/clients/${c.id}`); setCmdOpen(false); setCmdQ('') }}>
                    <UserCheck size={13} color="var(--text-3)"/>
                    <span style={{ fontSize: 13 }}>{c.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)' }}>Client</span>
                  </div>
                ))}
                {!searchData?.leads?.length && !searchData?.clients?.length && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                    No results for "{cmdQ}"
                  </div>
                )}
              </div>
            )}
            {cmdQ.length < 2 && (
              <div style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text-4)' }}>
                Type to search leads, clients…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
