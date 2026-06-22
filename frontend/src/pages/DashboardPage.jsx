import { useQuery } from '@tanstack/react-query'
import { dashboardAPI, followupsAPI, leadsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Phone, MessageSquare, ChevronRight, ArrowRight, AlertTriangle, Mail } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import isToday from 'dayjs/plugin/isToday'

dayjs.extend(relativeTime)
dayjs.extend(isToday)

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)

  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardAPI.getSummary().then(r => r.data.data) })
  const { data: fuData } = useQuery({ queryKey: ['fu-today'], queryFn: () => followupsAPI.getAll({ today: 'true', status: 'pending', limit: 8 }).then(r => r.data) })
  const { data: fuOverdue } = useQuery({ queryKey: ['fu-overdue'], queryFn: () => followupsAPI.getAll({ overdue: 'true', status: 'pending', limit: 5 }).then(r => r.data) })
  const { data: leadsData } = useQuery({ queryKey: ['leads-recent'], queryFn: () => leadsAPI.getAll({ limit: 5, sort: 'created_at', order: 'DESC' }).then(r => r.data) })

  const todayFU   = fuData?.data || []
  const overdueFU = fuOverdue?.data || []
  const recentLeads = leadsData?.data || []

  const revenue  = dash?.monthly_revenue || 0
  const expenses = dash?.monthly_expenses || 0
  const profit   = revenue - expenses

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ maxWidth: 860 }}>
      {/* ─── Account Status Banners ─────────────────────── */}

      {/* PAYMENT DUE — non-intrusive, user still has full access */}
      {user?.account_status === 'payment_due' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', marginBottom: 20, background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10 }}>
          <Clock size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: 'rgba(232,224,208,0.6)', lineHeight: 1.5 }}>
            <strong style={{ color: '#fbbf24' }}>Subscription renewal is pending.</strong> Please contact your administrator.
          </span>
          <button onClick={() => navigate('/subscription')}
            style={{ fontSize: 12, color: '#fbbf24', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            View Account
          </button>
        </div>
      )}

      {/* SUSPENDED — access to dashboard, all actions disabled */}
      {user?.account_status === 'suspended' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', marginBottom: 24, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12 }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>Account Temporarily Suspended</div>
            <div style={{ fontSize: 13, color: 'rgba(232,224,208,0.5)' }}>Please contact your administrator to restore access.</div>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {greeting()}, {(user?.owner_name || user?.name || '').split(' ')[0] || 'there'}.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 6 }}>
          {dayjs().format('dddd, D MMMM YYYY')}
        </p>
      </div>

      {/* Pipeline Performance */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Total Leads', value: dash?.total_leads || 0, color: 'var(--text)' },
            { label: 'Active Pipeline', value: dash?.active_leads || 0, color: 'var(--primary)' },
            { label: 'Converted', value: dash?.won_leads || 0, color: 'var(--success)' },
            { label: 'Avg Conversion', value: dash?.avg_conversion_days ? Math.round(dash.avg_conversion_days) + ' days' : 'N/A', color: 'var(--text-2)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Needs Attention */}
      {overdueFU.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Needs Attention
            </span>
            <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>
              {overdueFU.length} overdue
            </span>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {overdueFU.map((f, i) => (
              <div key={f.id}
                onClick={() => navigate('/follow-ups')}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                  borderBottom: i < overdueFU.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{f.lead_name}</span>
                  {f.city && <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 8 }}>{f.city}</span>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--danger)' }}>
                  {dayjs(f.scheduled_date).fromNow()}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {f.lead_mobile && (
                    <a href={`tel:${f.lead_mobile}`} onClick={e => e.stopPropagation()}
                      className="btn btn-ghost btn-icon btn-sm"><Phone size={13}/></a>
                  )}
                  {f.lead_mobile && (
                    <a href={`https://wa.me/${f.lead_mobile?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="btn btn-ghost btn-icon btn-sm"><MessageSquare size={13}/></a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Today's Follow-ups
          </span>
          <button onClick={() => navigate('/follow-ups')}
            style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowRight size={12}/>
          </button>
        </div>
        {todayFU.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>
            Nothing scheduled for today. ✓
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {todayFU.map((f, i) => (
              <div key={f.id}
                onClick={() => navigate('/follow-ups')}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                  borderBottom: i < todayFU.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{f.lead_name}</span>
                  {f.city && <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 8 }}>{f.city}</span>}
                  {f.type && (
                    <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 8,
                      background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>{f.type}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {f.lead_mobile && (
                    <a href={`tel:${f.lead_mobile}`} onClick={e => e.stopPropagation()}
                      className="btn btn-ghost btn-icon btn-sm"><Phone size={13}/></a>
                  )}
                  {f.lead_mobile && (
                    <a href={`https://wa.me/${f.lead_mobile?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="btn btn-ghost btn-icon btn-sm"><MessageSquare size={13}/></a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Leads */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Leads
          </span>
          <button onClick={() => navigate('/leads')}
            style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowRight size={12}/>
          </button>
        </div>
        {recentLeads.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>No leads yet.</div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {recentLeads.map((l, i) => (
              <div key={l.id}
                onClick={() => navigate(`/leads/${l.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                  borderBottom: i < recentLeads.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{l.name}</span>
                  {l.city && <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 8 }}>{l.city}</span>}
                  {l.project_type && <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 8 }}>· {l.project_type}</span>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{dayjs(l.created_at).fromNow()}</span>
                <ChevronRight size={14} color="var(--text-4)"/>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Monthly Snapshot */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-4)', textTransform: 'uppercase',
          letterSpacing: '0.06em', marginBottom: 14 }}>
          Monthly Snapshot
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'Revenue', value: fmt(revenue),  color: 'var(--success)' },
            { label: 'Expenses', value: fmt(expenses), color: 'var(--danger)' },
            { label: 'Profit', value: fmt(profit),   color: profit >= 0 ? 'var(--success)' : 'var(--danger)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '20px 24px', background: '#fff',
              border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: '-0.02em' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lost Leads Breakdown */}
      {dash?.lost_reasons && dash.lost_reasons.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-4)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 14 }}>
            Lost Lead Reasons
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {dash.lost_reasons.map(r => (
              <div key={r.lost_reason} style={{ padding: '16px 20px', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4, fontWeight: 500 }}>
                  {r.lost_reason}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-3)' }}>
                  {r.count} lead{r.count !== '1' ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
