// ============================================================
// KALA IS ART - Subscription Expiry Banner
// ============================================================
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

export default function SubscriptionBanner({ expired }) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div style={{
      background: expired
        ? 'linear-gradient(90deg, rgba(239,68,68,0.12), rgba(239,68,68,0.08))'
        : 'linear-gradient(90deg, rgba(234,179,8,0.12), rgba(234,179,8,0.08))',
      borderBottom: `1px solid ${expired ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.25)'}`,
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={15} color={expired ? '#f87171' : '#fbbf24'} />
        <span style={{ fontSize: 13, color: expired ? '#fca5a5' : '#fde68a' }}>
          {expired
            ? 'Your subscription has expired. CRM features are locked.'
            : 'Your subscription expires in less than 7 days.'}
        </span>
        <button
          onClick={() => navigate('/subscription')}
          style={{
            padding: '4px 14px',
            background: expired ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
            border: `1px solid ${expired ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.4)'}`,
            borderRadius: 6,
            color: expired ? '#fca5a5' : '#fde68a',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 8,
          }}
        >
          {expired ? 'Renew Now' : 'Renew Plan'}
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
