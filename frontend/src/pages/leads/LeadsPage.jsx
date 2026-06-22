import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { leadsAPI } from '../../services/api'
import { Phone, MessageSquare, Mail, Search, Plus, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { motion, AnimatePresence } from 'framer-motion'
import LeadModal from '../../components/leads/LeadModal'

dayjs.extend(relativeTime)

const STATUS_OPTS = ['All', 'New', 'Interested', 'Negotiation', 'Won', 'Lost']
const STATUS_MAP  = { All: null, New: 'new_lead', Interested: 'interested', Negotiation: 'negotiation', Won: 'won', Lost: 'lost' }

const TEMP_COLOR = { hot: '#DC2626', warm: '#D97706', cold: '#6B7280', dead: '#D1D5DB', won: '#16A34A', lost: '#9CA3AF' }

export default function LeadsPage() {
  const navigate = useNavigate()
  const [search, setSearch]   = useState('')
  const [viewTab, setViewTab] = useState('active') // active, converted, lost
  const [isModalOpen, setModalOpen] = useState(false)

  const params = { limit: 60, sort: 'created_at', order: 'DESC' }
  if (search) params.search = search
  if (viewTab === 'active') params.active_only = 'true'
  if (viewTab === 'converted') params.status = 'won'
  if (viewTab === 'lost') params.status = 'lost'

  const { data, isLoading } = useQuery({
    queryKey: ['leads', viewTab, search],
    queryFn: () => leadsAPI.getAll(params).then(r => r.data),
    keepPreviousData: true,
  })

  const leads = data?.data || []

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Leads</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} in this pipeline
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={14}/> Add Lead
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[
          { key:'active', label:'Active Leads' },
          { key:'converted', label:'Converted Leads' },
          { key:'lost', label:'Lost Leads' },
        ].map(t => (
          <button key={t.key} onClick={() => setViewTab(t.key)}
            style={{ padding:'10px 20px', fontSize:13, fontWeight:600, background:'none', border:'none',
              cursor:'pointer', borderBottom: viewTab===t.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: viewTab===t.key ? 'var(--text)' : 'var(--text-3)',
              marginBottom: -1, transition:'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}/>
          <input className="form-input" style={{ paddingLeft: 32 }}
            placeholder="Search by name, phone, city…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 0, border: 'none',
              borderBottom: '1px solid var(--border)' }}/>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
            {search ? `No leads match "${search}"` : 'No leads yet.'}
          </div>
          {!search && (
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
              Add your first lead
            </button>
          )}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          {leads.map((lead, i) => {
            const lastContact = lead.last_contact_date
              ? dayjs(lead.last_contact_date).fromNow()
              : lead.created_at ? dayjs(lead.created_at).fromNow() : null

            return (
              <motion.div key={lead.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 18px',
                  borderBottom: i < leads.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}
                onClick={() => navigate(`/leads/${lead.id}`)}>

                {/* Temperature dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: TEMP_COLOR[lead.temperature] || 'var(--border-2)',
                }}/>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                      {lead.name}
                    </span>
                    {lead.city && (
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{lead.city}</span>
                    )}
                    {lead.project_type && (
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· {lead.project_type}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
                    {lead.mobile && (
                      <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{lead.mobile}</span>
                    )}
                    {lastContact && (
                      <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
                        Last contact {lastContact}
                      </span>
                    )}
                    {lead.next_follow_up_date && (
                      <span style={{ fontSize: 12, color: 'var(--accent)' }}>
                        → Follow-up {dayjs(lead.next_follow_up_date).format('D MMM')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                  background: lead.status === 'won' ? 'var(--success-bg)' :
                              lead.status === 'lost' ? 'var(--surface-2)' :
                              lead.status === 'negotiation' ? 'var(--warning-bg)' : 'var(--surface-2)',
                  color: lead.status === 'won' ? 'var(--success)' :
                         lead.status === 'lost' ? 'var(--text-4)' :
                         lead.status === 'negotiation' ? 'var(--warning)' : 'var(--text-3)',
                  fontWeight: 500,
                }}>
                  {lead.status?.replace('_', ' ')}
                </span>

                {/* Quick actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}>
                  {lead.mobile && (
                    <a href={`https://wa.me/${lead.mobile?.replace(/\D/g,'')}`}
                      target="_blank" rel="noreferrer"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="WhatsApp" style={{ color: '#16A34A' }}>
                      <MessageSquare size={13}/>
                    </a>
                  )}
                  {lead.mobile && (
                    <a href={`tel:${lead.mobile}`}
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Call">
                      <Phone size={13}/>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`}
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Email">
                      <Mail size={13}/>
                    </a>
                  )}
                </div>

                <ChevronRight size={14} color="var(--text-4)" style={{ flexShrink: 0 }}/>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && <LeadModal lead={null} onClose={() => setModalOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
