import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsAPI, followupsAPI } from '../../services/api'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Edit2, UserCheck, Plus, Check } from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { useState } from 'react'
import LeadModal from '../../components/leads/LeadModal'

const STATUSES = ['new_lead','contacted','interested','follow_up','proposal_sent','negotiation','won','lost','not_interested']

export default function LeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [addFollowup, setAddFollowup] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [followupType, setFollowupType] = useState('call')
  const [followupNote, setFollowupNote] = useState('')

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsAPI.getOne(id).then(r => r.data.data),
  })

  const convertMutation = useMutation({
    mutationFn: () => leadsAPI.convertToClient(id),
    onSuccess: (res) => { 
      toast.success('Converted to client!'); 
      qc.invalidateQueries({ queryKey: ['lead',id] }); 
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      navigate(`/clients/${res.data.data.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Conversion failed'),
  })

  const statusMutation = useMutation({
    mutationFn: (payload) => leadsAPI.updateStatus(id, payload),
    onSuccess: (res) => { 
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['lead',id] }); 
      qc.invalidateQueries({ queryKey: ['leads'] }); 
      qc.invalidateQueries({ queryKey: ['clients'] });
      
      // Auto-navigate if the backend automatically converted it
      if (res.data?.message === 'Lead automatically converted to client') {
        navigate(`/clients/${res.data.data.id}`);
      }
    },
  })

  const followupMutation = useMutation({
    mutationFn: (d) => followupsAPI.create(d),
    onSuccess: () => { toast.success('Follow-up added'); qc.invalidateQueries({ queryKey: ['lead',id] }); setAddFollowup(false); setFollowupDate(''); setFollowupNote('') },
    onError: () => toast.error('Failed to add follow-up'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => leadsAPI.delete(id),
    onSuccess: () => { 
      toast.success('Lead deleted'); 
      qc.invalidateQueries({ queryKey: ['leads'] }); 
      navigate('/leads');
    },
    onError: () => toast.error('Failed to delete lead'),
  })

  if (isLoading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {Array(4).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:12 }}/>)}
    </div>
  )
  if (!lead) return <div className="empty-state"><h3>Lead not found</h3></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:24 }}>
        <button onClick={() => navigate('/leads')} className="btn btn-secondary btn-icon">
          <ArrowLeft size={16}/>
        </button>
        <div style={{ flex:1 }}>
          <h1 className="page-title">{lead.name}</h1>
          <p className="page-subtitle">{lead.lead_number} · Added {dayjs(lead.created_at).format('D MMM YYYY')}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} 
                  onClick={() => { if(window.confirm('Are you sure you want to permanently delete this lead?')) deleteMutation.mutate() }} 
                  disabled={deleteMutation.isPending}>
            Delete
          </button>
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}><Edit2 size={14}/> Edit</button>
        </div>
      </div>

      {/* Status bar */}
      <div className="card" style={{ padding:'14px 18px', marginBottom:20, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'var(--text-3)', marginRight:6 }}>Status:</span>
        {STATUSES.map(s => {
          if (lead.status === 'won') {
             // If already won, don't let them change it here, let them go to the client profile
             if (s === 'won') return (
                <button key={s} className="pill active" style={{ fontSize:12, cursor:'default' }}>
                  <Check size={10}/> Converted to Client
                </button>
             );
             return null;
          }

          return (
            <button key={s} onClick={() => {
                if (s === 'won') {
                  if(window.confirm('Convert this lead to a client?')) convertMutation.mutate();
                } else if (s === 'lost') {
                  const reason = window.prompt('Please enter a reason for losing this lead (e.g. Budget Issue, Competitor Chosen, Not Interested):');
                  if (reason) {
                    statusMutation.mutate({ status: 'lost', lost_reason: reason });
                  }
                } else {
                  statusMutation.mutate(s);
                }
              }}
              className={`pill ${lead.status === s ? 'active' : ''}`} style={{ fontSize:12 }}>
              {lead.status === s && <Check size={10}/>} {s.replace(/_/g,' ')}
            </button>
          )
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
        {/* Left */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Contact info */}
          <div className="card" style={{ padding:20 }}>
            <div className="section-label">Contact Information</div>
            <div className="grid-2">
              {[
                { icon:Phone, label:'Mobile',   value:lead.mobile },
                { icon:Mail,  label:'Email',    value:lead.email||'—' },
                { icon:MapPin,label:'City',     value:lead.city||'—' },
                { icon:MapPin,label:'Area',     value:lead.area||'—' },
                { icon:MapPin,label:'Location', value:lead.location||'—' },
              ].map(({ icon:Icon, label, value }) => (
                <div key={label}>
                  <div style={{ fontSize:11.5, color:'var(--text-3)', marginBottom:3 }}>{label}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13.5, fontWeight:500 }}>
                    <Icon size={13} color="var(--text-4)"/>{value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="card" style={{ padding:20 }}>
              <div className="section-label">Notes</div>
              <p style={{ fontSize:13.5, color:'var(--text-2)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{lead.notes}</p>
            </div>
          )}

          {/* Follow-ups */}
          <div className="card">
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>Follow-up History</span>
              <button className="btn btn-primary btn-sm" onClick={() => setAddFollowup(v => !v)}><Plus size={13}/> Add</button>
            </div>

            {addFollowup && (
              <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)', display:'flex', flexDirection:'column', gap:10 }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={followupDate} onChange={e => setFollowupDate(e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-input" value={followupType} onChange={e => setFollowupType(e.target.value)}>
                      {['call','whatsapp','email','visit','meeting'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" placeholder="What's the follow-up about?" value={followupNote} onChange={e => setFollowupNote(e.target.value)}/>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAddFollowup(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={!followupDate || followupMutation.isPending}
                    onClick={() => followupMutation.mutate({ lead_id:id, scheduled_date:followupDate, type:followupType, notes:followupNote })}>
                    Save Follow-up
                  </button>
                </div>
              </div>
            )}

            <div style={{ padding:'0 18px' }}>
              {(lead.followups||[]).filter(Boolean).length === 0
                ? <div className="empty-state" style={{ padding:'24px 0' }}><p>No follow-ups yet</p></div>
                : (lead.followups||[]).filter(Boolean).map(f => (
                  <div key={f.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:500 }}>{dayjs(f.scheduled_date).format('D MMM YYYY')} · {f.type}</div>
                      {f.notes && <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{f.notes}</div>}
                    </div>
                    <span className={`badge ${f.status==='completed'?'badge-green':f.status==='cancelled'?'badge-gray':'badge-yellow'}`}>{f.status}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ padding:20 }}>
            <div className="section-label">Lead Details</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Source',       value:lead.lead_source?.replace(/_/g,' ')||'—' },
                { label:'Priority',     value:lead.priority||'—' },
                { label:'Project Type', value:lead.project_type||'—' },
                { label:'Budget',       value:lead.budget_min||lead.budget_max ? `₹${(lead.budget_min/1000).toFixed(0)}K – ₹${(lead.budget_max/1000).toFixed(0)}K` : '—' },
                { label:'Next Follow-up',value:lead.next_followup_date ? dayjs(lead.next_followup_date).format('D MMM YYYY') : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:12.5, color:'var(--text-3)' }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:500, textTransform:'capitalize' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editOpen && <LeadModal lead={lead} onClose={() => setEditOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
