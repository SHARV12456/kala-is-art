// KALA IS ART - Client Detail Page
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { clientsAPI } from '../../services/api'
import { ArrowLeft, Phone, Mail, MapPin, CreditCard, User } from 'lucide-react'
import dayjs from 'dayjs'
import ClientPayments from '../../components/clients/ClientPayments'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsAPI.getOne(id).then((r) => r.data.data),
  })

  if (isLoading) return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
  if (!client) return <div>Client not found</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/clients')} className="btn-ghost" style={{ padding: 8 }}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--cream-100)' }}>{client.name}</h1>
          <p style={{ fontSize: 12, color: 'rgba(212,175,55,0.5)', marginTop: 2 }}>{client.client_number}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid rgba(255,255,255,0.07)', paddingBottom:0 }}>
        {[
          { key:'overview',  label:'👤 Overview' },
          { key:'payments',  label:'💰 Payments' },
          ...(client.lead_history ? [{ key:'lead_history', label:'📝 Lead History' }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'10px 20px', fontSize:13, fontWeight:600, background:'none', border:'none',
              cursor:'pointer', borderBottom: tab===t.key ? '2px solid #D4AF37' : '2px solid transparent',
              color: tab===t.key ? '#D4AF37' : 'rgba(232,224,208,0.5)',
              marginBottom: -1, transition:'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.5)', letterSpacing: 1, marginBottom: 20 }}>CONTACT INFORMATION</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {[
                  { icon: Phone, label: 'Mobile', value: client.mobile },
                  { icon: Mail, label: 'Email', value: client.email || '—' },
                  { icon: MapPin, label: 'City', value: client.city || '—' },
                  { icon: MapPin, label: 'Address', value: client.address || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, color: 'var(--cream-100)', display: 'flex', gap: 7, alignItems: 'center' }}>
                      <Icon size={13} color="rgba(212,175,55,0.4)" />{value}
                    </div>
                  </div>
                ))}
              </div>
              {client.notes && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 8 }}>NOTES</div>
                  <p style={{ fontSize: 14, color: 'rgba(232,224,208,0.6)', lineHeight: 1.7 }}>{client.notes}</p>
                </div>
              )}
            </div>

            {/* Projects */}
            {client.projects?.length > 0 && (
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.5)', letterSpacing: 1, marginBottom: 16 }}>PROJECTS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {client.projects.filter(Boolean).map((p) => (
                    <div key={p.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream-100)' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)', marginTop: 3 }}>{p.project_type}</div>
                      </div>
                      <span className={`badge ${p.status === 'completed' ? 'badge-green' : p.status === 'in_progress' ? 'badge-blue' : 'badge-gold'}`}>
                        {p.status?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {client.documents?.length > 0 && (
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.5)', letterSpacing: 1, marginBottom: 16 }}>DOCUMENTS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {client.documents.filter(Boolean).map((d) => (
                    <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer" style={{
                      padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: 'var(--cream-100)',
                      fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>{d.name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(232,224,208,0.3)' }}>{d.file_type?.toUpperCase()}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: 24, alignSelf: 'start' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                border: '2px solid rgba(212,175,55,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', fontSize: 24, fontWeight: 700, color: 'var(--gold-400)',
              }}>
                {client.name[0]?.toUpperCase()}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream-100)' }}>{client.name}</div>
            </div>
            {[
              { label: 'GST', value: client.gst_number || '—' },
              { label: 'Projects', value: client.projects?.filter(Boolean).length || 0 },
              { label: 'Documents', value: client.documents?.filter(Boolean).length || 0 },
              { label: 'Client Since', value: dayjs(client.created_at).format('MMM D, YYYY') },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--cream-100)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <ClientPayments clientId={id} />
      )}

      {/* Lead History Tab */}
      {tab === 'lead_history' && client.lead_history && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.5)', letterSpacing: 1, marginBottom: 20 }}>LEAD CONVERSION HISTORY</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 4 }}>Original Lead Source</div>
              <div style={{ fontSize: 14, color: 'var(--cream-100)', textTransform: 'capitalize' }}>
                {client.lead_history.source?.replace(/_/g, ' ') || 'Manual Entry'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 4 }}>Initial Budget Indication</div>
              <div style={{ fontSize: 14, color: 'var(--cream-100)' }}>
                {client.lead_history.budget_min || client.lead_history.budget_max 
                  ? `₹${(client.lead_history.budget_min/1000).toFixed(0)}K - ₹${(client.lead_history.budget_max/1000).toFixed(0)}K` 
                  : 'Undisclosed'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 4 }}>Original Lead Date</div>
              <div style={{ fontSize: 14, color: 'var(--cream-100)' }}>
                {dayjs(client.lead_history.created_at).format('MMM D, YYYY')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 4 }}>Conversion Timeline</div>
              <div style={{ fontSize: 14, color: 'var(--cream-100)' }}>
                {dayjs(client.created_at).diff(dayjs(client.lead_history.created_at), 'day')} Days to Convert
              </div>
            </div>
            {client.lead_history.notes && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 4 }}>Initial Inquiry Notes</div>
                <div style={{ fontSize: 13, color: 'rgba(232,224,208,0.7)', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                  {client.lead_history.notes}
                </div>
              </div>
            )}
          </div>

          <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.5)', letterSpacing: 1, marginBottom: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24 }}>PRE-CONVERSION FOLLOW-UPS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!client.lead_history.followups || client.lead_history.followups.length === 0 || client.lead_history.followups[0] === null) ? (
              <div style={{ fontSize: 13, color: 'rgba(232,224,208,0.4)' }}>No follow-up history recorded during the lead phase.</div>
            ) : (
              client.lead_history.followups.filter(Boolean).map(f => (
                <div key={f.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream-100)', textTransform: 'capitalize' }}>{f.type}</div>
                    <div style={{ fontSize: 12, color: 'rgba(212,175,55,0.6)' }}>{dayjs(f.scheduled_date).format('MMM D, YYYY')}</div>
                  </div>
                  {f.notes && <div style={{ fontSize: 13, color: 'rgba(232,224,208,0.6)' }}>{f.notes}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
