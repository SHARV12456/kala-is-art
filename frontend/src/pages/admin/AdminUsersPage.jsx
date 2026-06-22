// KALA IS ART - Admin User Control Panel
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, RefreshCw, ChevronDown, CheckCircle, AlertCircle, Clock, Ban, ShieldCheck, StickyNote, Calendar, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import toast from 'react-hot-toast'
dayjs.extend(relativeTime)

const STATUS = {
  active:      { label: 'Active',      icon: CheckCircle, color: '#4ade80', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  payment_due: { label: 'Payment Due', icon: Clock,       color: '#fbbf24', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.3)'  },
  suspended:   { label: 'Suspended',   icon: AlertCircle, color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
  disabled:    { label: 'Disabled',    icon: Ban,         color: '#9ca3af', bg: 'rgba(107,114,128,0.1)',border: 'rgba(107,114,128,0.25)'},
}

const STATUS_ACTIONS = [
  { label: '✅ Activate Account',  status: 'active',      color: '#4ade80' },
  { label: '⏰ Mark Payment Due', status: 'payment_due', color: '#fbbf24' },
  { label: '🔴 Suspend Account',  status: 'suspended',   color: '#f87171' },
  { label: '⛔ Disable Account',  status: 'disabled',    color: '#9ca3af' },
]

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.active
  const Icon = s.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <Icon size={10} /> {s.label}
    </span>
  )
}

function ActionMenu({ user, onSetStatus, onOpenNotes }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 7, cursor: 'pointer', color: 'var(--cream-100)' }}>
        Manage <ChevronDown size={11} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.11 }}
            onMouseLeave={() => setOpen(false)}
            style={{ position: 'absolute', right: 0, top: '110%', zIndex: 100, background: '#151009', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10, minWidth: 210, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
            {STATUS_ACTIONS.map(({ label, status, color }) => (
              <button key={status} onClick={() => { onSetStatus(user, status); setOpen(false) }}
                disabled={user.account_status === status}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', background: 'none', border: 'none', fontSize: 13, color: user.account_status === status ? 'rgba(255,255,255,0.15)' : color, cursor: user.account_status === status ? 'default' : 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {label}{user.account_status === status ? ' (current)' : ''}
              </button>
            ))}
            <button onClick={() => { onOpenNotes(user); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 16px', background: 'none', border: 'none', fontSize: 13, color: 'rgba(212,175,55,0.7)', cursor: 'pointer' }}>
              <StickyNote size={12} /> Edit Notes / Renewal
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusModal({ user, targetStatus, onConfirm, onClose }) {
  const [note, setNote] = useState('')
  const s = STATUS[targetStatus]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}
        style={{ background: '#181108', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <s.icon size={18} color={s.color} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream-100)' }}>Set to {s.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)' }}>{user.owner_name} · {user.email}</div>
          </div>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(232,224,208,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Internal Note (optional)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Renewal due 15 July. Client requested extension." className="input-field" style={{ height: 80, resize: 'vertical', fontSize: 13 }} autoFocus />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px', fontSize: 13 }}>Cancel</button>
          <button onClick={() => onConfirm(note)} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, color: s.color, cursor: 'pointer' }}>
            Confirm → {s.label}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function NotesModal({ user, onSave, onClose }) {
  const [notes, setNotes]   = useState(user.admin_notes || '')
  const [renewal, setRenewal] = useState(user.renewal_date ? dayjs(user.renewal_date).format('YYYY-MM-DD') : '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}
        style={{ background: '#181108', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream-100)', marginBottom: 4 }}>Notes & Renewal — {user.owner_name}</div>
        <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.35)', marginBottom: 20 }}>{user.business_name || user.email}</div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(232,224,208,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Admin Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Renewal due on 15 July. Paid via UPI." className="input-field" style={{ height: 90, resize: 'vertical', fontSize: 13, marginBottom: 16 }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(232,224,208,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Renewal Date</label>
        <input type="date" value={renewal} onChange={e => setRenewal(e.target.value)} className="input-field" style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px', fontSize: 13 }}>Cancel</button>
          <button onClick={() => onSave(notes, renewal || null)} className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: 13 }}>Save Notes</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]                 = useState(1)
  const [statusModal, setStatusModal]   = useState(null)
  const [notesModal, setNotesModal]     = useState(null)
  const [expandedId, setExpandedId]     = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { search, page, status: statusFilter }],
    queryFn: () => adminAPI.getUsers({ page, limit: 25, search: search || undefined, status: statusFilter || undefined }).then(r => r.data),
  })

  const users = data?.data || []
  const pagination = data?.pagination || {}
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const statusMut = useMutation({
    mutationFn: ({ id, status, note }) => adminAPI.setAccountStatus(id, status, note),
    onSuccess: (_, { status }) => { toast.success(`Account → ${STATUS[status]?.label}`); invalidate() },
    onError: () => toast.error('Failed to update status'),
  })

  const notesMut = useMutation({
    mutationFn: ({ id, admin_notes, renewal_date }) => adminAPI.updateNotes(id, { admin_notes, renewal_date }),
    onSuccess: () => { toast.success('Notes saved'); invalidate() },
    onError: () => toast.error('Failed to save notes'),
  })

  const confirmStatus = (note) => { statusMut.mutate({ id: statusModal.user.id, status: statusModal.targetStatus, note }); setStatusModal(null) }
  const saveNotes = (notes, renewal) => { notesMut.mutate({ id: notesModal.id, admin_notes: notes, renewal_date: renewal }); setNotesModal(null) }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{pagination.total || 0} accounts — full manual control</p>
        </div>
        <button onClick={invalidate} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(212,175,55,0.4)' }} />
          <input placeholder="Search name, email, company, mobile…" className="input-field" style={{ paddingLeft: 36 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,224,208,0.4)', display: 'flex' }}><X size={14} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['', 'All'], ['active', 'Active'], ['payment_due', 'Payment Due'], ['suspended', 'Suspended'], ['disabled', 'Disabled']].map(([val, lbl]) => (
            <button key={val} onClick={() => { setStatusFilter(val); setPage(1) }}
              style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', background: statusFilter === val ? 'rgba(212,175,55,0.15)' : 'transparent', border: `1px solid ${statusFilter === val ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.07)'}`, color: statusFilter === val ? 'var(--accent)' : 'rgba(232,224,208,0.4)' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />)}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Company</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Renewal</th>
                <th>Last Login</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <>
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    onClick={() => u.admin_notes && setExpandedId(expandedId === u.id ? null : u.id)}
                    style={{ cursor: u.admin_notes ? 'pointer' : 'default' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                          {u.owner_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream-100)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {u.owner_name}
                            {u.is_email_verified && <ShieldCheck size={11} color="#4ade80" />}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.32)' }}>{u.business_name || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.45)' }}>{u.email}</div>
                      <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.28)', marginTop: 2 }}>{u.mobile}</div>
                    </td>
                    <td><StatusBadge status={u.account_status} /></td>
                    <td>
                      {u.renewal_date ? (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--cream-100)', fontWeight: 500 }}>{dayjs(u.renewal_date).format('DD MMM YYYY')}</div>
                          <div style={{ fontSize: 10, marginTop: 2, color: dayjs(u.renewal_date).diff(dayjs(), 'day') <= 7 ? '#f87171' : 'rgba(232,224,208,0.3)' }}>
                            {dayjs(u.renewal_date).diff(dayjs(), 'day') >= 0 ? `${dayjs(u.renewal_date).diff(dayjs(), 'day')}d remaining` : `${Math.abs(dayjs(u.renewal_date).diff(dayjs(), 'day'))}d overdue`}
                          </div>
                        </div>
                      ) : <span style={{ fontSize: 11, color: 'rgba(232,224,208,0.2)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)' }}>{u.last_login_at ? dayjs(u.last_login_at).fromNow() : 'Never'}</td>
                    <td style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)' }}>{dayjs(u.created_at).format('DD MMM YYYY')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        {u.admin_notes && <ChevronRight size={14} color="rgba(212,175,55,0.4)" style={{ transition: 'transform 0.2s', transform: expandedId === u.id ? 'rotate(90deg)' : 'none' }} />}
                        <ActionMenu user={u} onSetStatus={(u, s) => setStatusModal({ user: u, targetStatus: s })} onOpenNotes={setNotesModal} />
                      </div>
                    </td>
                  </motion.tr>
                  {expandedId === u.id && u.admin_notes && (
                    <tr key={u.id + '-n'} style={{ background: 'rgba(212,175,55,0.02)' }}>
                      <td colSpan={7} style={{ padding: '8px 20px 12px 60px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <StickyNote size={12} color="rgba(212,175,55,0.4)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'rgba(232,224,208,0.45)', lineHeight: 1.6 }}>{u.admin_notes}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'rgba(232,224,208,0.25)', fontSize: 14 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
        {pagination.total > 25 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-ghost" style={{ fontSize: 12 }}>← Prev</button>
            <span style={{ fontSize: 12, color: 'rgba(232,224,208,0.3)' }}>Page {page} of {Math.ceil(pagination.total / 25)}</span>
            <button disabled={page >= Math.ceil(pagination.total / 25)} onClick={() => setPage(page + 1)} className="btn-ghost" style={{ fontSize: 12 }}>Next →</button>
          </div>
        )}
      </div>

      {statusModal && <StatusModal user={statusModal.user} targetStatus={statusModal.targetStatus} onConfirm={confirmStatus} onClose={() => setStatusModal(null)} />}
      {notesModal  && <NotesModal  user={notesModal} onSave={saveNotes} onClose={() => setNotesModal(null)} />}
    </div>
  )
}
