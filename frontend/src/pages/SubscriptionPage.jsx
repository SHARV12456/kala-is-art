// KALA IS ART - Account Status Page (replaces SubscriptionPage)
// No payment gateway. Contact admin for plan changes.
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, AlertCircle, Ban, Phone, Mail } from 'lucide-react'
import dayjs from 'dayjs'

const STATUS_INFO = {
  active: {
    icon: CheckCircle, color: '#4ade80', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)',
    title: 'Account Active',
    desc: 'Your account is fully active. You have access to all CRM features.',
  },
  payment_due: {
    icon: Clock, color: '#fbbf24', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.22)',
    title: 'Payment Due',
    desc: 'Your subscription renewal is pending. Please contact your administrator to continue uninterrupted access.',
  },
  suspended: {
    icon: AlertCircle, color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)',
    title: 'Account Suspended',
    desc: 'Your account has been temporarily suspended. Please contact your administrator to reactivate.',
  },
  disabled: {
    icon: Ban, color: '#9ca3af', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)',
    title: 'Account Disabled',
    desc: 'Your account is currently inactive. Please contact your administrator.',
  },
}

export default function AccountStatusPage() {
  const { user } = useSelector(s => s.auth)
  const status   = user?.account_status || 'active'
  const info     = STATUS_INFO[status] || STATUS_INFO.active
  const Icon     = info.icon

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--cream-100)', marginBottom: 6 }}>
          Account Status
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(232,224,208,0.4)' }}>
          Your current account and access information.
        </p>
      </div>

      {/* Status card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: 28, background: info.bg, border: `1px solid ${info.border}`, borderRadius: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `${info.color}18`, border: `1px solid ${info.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={24} color={info.color} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: info.color }}>{info.title}</div>
            <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)', marginTop: 2 }}>
              {user?.business_name || user?.owner_name}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(232,224,208,0.6)', lineHeight: 1.7 }}>{info.desc}</p>
      </motion.div>

      {/* Account details */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Account Details</div>
        {[
          ['Account Holder', user?.owner_name],
          ['Business', user?.business_name || '—'],
          ['Email', user?.email],
          ['Mobile', user?.mobile],
          ['Registered', dayjs(user?.created_at).format('DD MMMM YYYY')],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'rgba(232,224,208,0.4)' }}>{label}</span>
            <span style={{ color: 'var(--cream-100)', fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Contact admin */}
      <div style={{ padding: 20, background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12 }}>
        <div style={{ fontSize: 12, color: 'rgba(212,175,55,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Contact Administrator</div>
        <p style={{ fontSize: 13, color: 'rgba(232,224,208,0.45)', lineHeight: 1.7, marginBottom: 16 }}>
          For plan changes, renewals, or any account issues, please contact your administrator directly. All plans are managed offline.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="tel:+919999999999"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            <Phone size={13} /> Call Admin
          </a>
          <a href="mailto:admin@kalaisart.com"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 8, fontSize: 13, color: 'rgba(232,224,208,0.5)', textDecoration: 'none' }}>
            <Mail size={13} /> Email Admin
          </a>
        </div>
      </div>
    </div>
  )
}
