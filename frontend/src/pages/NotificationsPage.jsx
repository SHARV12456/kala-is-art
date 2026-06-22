// KALA IS ART - Notifications Page
import { useQuery, useMutation } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { notificationsAPI } from '../services/api'
import { setNotifications, markRead, markAllRead } from '../store/slices/notificationSlice'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const TYPE_COLORS = {
  followup_reminder: 'var(--gold-400)',
  subscription_renewal: '#60a5fa',
  lead_update: '#34d399',
  system: '#a78bfa',
}

export default function NotificationsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, unreadCount } = useSelector((s) => s.notifications)

  const { isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll().then((r) => {
      dispatch(setNotifications(r.data))
      return r.data
    }),
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: (_, id) => dispatch(markRead(id)),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => dispatch(markAllRead()),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()} className="btn-outline">
            <CheckCheck size={14} /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(232,224,208,0.2)' }}>
          <Bell size={48} style={{ margin: '0 auto 16px' }} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => {
                if (!n.is_read) markReadMutation.mutate(n.id)
                if (n.action_url) navigate(n.action_url)
              }}
              style={{
                padding: '16px 20px',
                background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(212,175,55,0.06)',
                border: `1px solid ${n.is_read ? 'rgba(255,255,255,0.04)' : 'rgba(212,175,55,0.2)'}`,
                borderRadius: 12,
                display: 'flex',
                gap: 14,
                cursor: n.action_url ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              {/* Type indicator */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${TYPE_COLORS[n.type] || 'rgba(255,255,255,0.1)'}15`,
                border: `1px solid ${TYPE_COLORS[n.type] || 'rgba(255,255,255,0.1)'}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bell size={16} color={TYPE_COLORS[n.type] || 'rgba(232,224,208,0.4)'} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: 'var(--cream-100)', flex: 1 }}>
                    {n.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {!n.is_read && <div className="notification-dot" />}
                    <span style={{ fontSize: 11, color: 'rgba(232,224,208,0.3)' }}>{dayjs(n.created_at).fromNow()}</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(232,224,208,0.45)', lineHeight: 1.6 }}>{n.message}</p>
              </div>

              {n.action_url && (
                <ExternalLink size={14} color="rgba(212,175,55,0.4)" style={{ flexShrink: 0, marginTop: 2 }} />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
