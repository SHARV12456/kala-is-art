import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commsAPI, followupsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, Mail, Calendar, Check, X, ChevronRight, RefreshCw } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import toast from 'react-hot-toast'

dayjs.extend(relativeTime)

const CHANNEL_ICONS = {
  whatsapp: { icon: MessageSquare, color: '#25D366', label: 'WhatsApp' },
  email:    { icon: Mail,          color: '#6366F1', label: 'Email' },
  call:     { icon: Phone,         color: '#F59E0B', label: 'Call' },
  meeting:  { icon: Calendar,      color: '#8B5CF6', label: 'Meeting' },
}

const OUTCOMES = [
  'interested','not_interested','meeting_scheduled','site_visit_scheduled',
  'callback','estimate_requested','estimate_sent','negotiation','ready_to_start',
  'future_opportunity'
]

const FUTURE_OPTS = [
  { label:'1 Month', days:30 }, { label:'3 Months', days:90 },
  { label:'6 Months', days:180 }, { label:'1 Year', days:365 },
]

const NEXT_FU_OPTS = [3, 7, 14, 30]

const TEMP = {
  hot: { emoji:'🔴', color:'#EF4444' },
  warm:{ emoji:'🟡', color:'#D97706' },
  cold:{ emoji:'🔵', color:'#6366F1' },
  dead:{ emoji:'⚫', color:'#6B7280' },
}

// ─── WHATSAPP MODAL ──────────────────────────────────────────
function WhatsAppModal({ leadId, onClose }) {
  const qc = useQueryClient()
  const [msg, setMsg] = useState('')
  const [generated, setGenerated] = useState(false)

  const genMutation = useMutation({
    mutationFn: () => commsAPI.generate({ leadId, channel:'whatsapp' }),
    onSuccess: ({ data }) => { setMsg(data.data.message); setGenerated(true) },
  })

  const sendMutation = useMutation({
    mutationFn: () => commsAPI.logWhatsapp({ lead_id: leadId, message: msg }),
    onSuccess: ({ data }) => {
      window.open(data.data.wa_url, '_blank')
      toast.success('WhatsApp opened + logged!')
      qc.invalidateQueries({ queryKey: ['comms-history', leadId] })
      qc.invalidateQueries({ queryKey: ['followups'] })
      onClose()
    },
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
        onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
        <div className="modal-header">
          <div className="modal-title" style={{color:'#25D366'}}>💬 WhatsApp Message</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:12}}>
          {!generated && (
            <button className="btn btn-primary" onClick={()=>genMutation.mutate()} disabled={genMutation.isPending}>
              <RefreshCw size={14}/> {genMutation.isPending ? 'Generating…' : 'Generate Smart Message'}
            </button>
          )}
          <div className="form-group">
            <label className="form-label">Message (editable)</label>
            <textarea className="form-input" rows={10} value={msg}
              placeholder="Click generate or type your message…"
              onChange={e=>setMsg(e.target.value)}
              style={{fontFamily:'monospace',fontSize:13}}/>
            <div style={{fontSize:11,color:'var(--text-4)',marginTop:4}}>{msg.length} chars</div>
          </div>
          {generated && (
            <button className="btn btn-ghost btn-sm" onClick={()=>genMutation.mutate()}>
              <RefreshCw size={12}/> Regenerate
            </button>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{background:'#25D366',borderColor:'#25D366'}}
            disabled={!msg || sendMutation.isPending} onClick={()=>sendMutation.mutate()}>
            <MessageSquare size={14}/> Open WhatsApp & Log
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── EMAIL MODAL ─────────────────────────────────────────────
function EmailModal({ lead, onClose }) {
  const qc = useQueryClient()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [generated, setGenerated] = useState(false)

  const genMutation = useMutation({
    mutationFn: () => commsAPI.generate({ leadId: lead.id, channel:'email' }),
    onSuccess: ({ data }) => {
      setSubject(data.data.subject || '')
      setBody(data.data.message || '')
      setGenerated(true)
    },
  })

  const sendMutation = useMutation({
    mutationFn: () => commsAPI.sendEmail({ lead_id:lead.id, subject, body, to_email:lead.email }),
    onSuccess: () => {
      toast.success('Email sent & logged!')
      qc.invalidateQueries({ queryKey: ['comms-history', lead.id] })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to send email'),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
        onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
        <div className="modal-header">
          <div className="modal-title" style={{color:'#6366F1'}}>✉️ Send Email</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:12}}>
          {!lead.email && (
            <div style={{padding:'10px 14px',background:'#FEF2F2',borderRadius:8,fontSize:13,color:'#DC2626'}}>
              ⚠️ No email address on file for this lead
            </div>
          )}
          {!generated && (
            <button className="btn btn-primary" onClick={()=>genMutation.mutate()} disabled={genMutation.isPending}>
              <RefreshCw size={14}/> {genMutation.isPending ? 'Generating…' : 'Generate Smart Email'}
            </button>
          )}
          <div className="form-group">
            <label className="form-label">To</label>
            <input className="form-input" value={lead.email||''} readOnly style={{color:'var(--text-3)'}}/>
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-input" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Email subject…"/>
          </div>
          <div className="form-group">
            <label className="form-label">Body</label>
            <textarea className="form-input" rows={10} value={body} onChange={e=>setBody(e.target.value)}
              placeholder="Email body…" style={{fontFamily:'monospace',fontSize:13}}/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!subject||!body||!lead.email||sendMutation.isPending}
            onClick={()=>sendMutation.mutate()}>
            <Mail size={14}/> {sendMutation.isPending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── CALL MODAL ──────────────────────────────────────────────
function CallModal({ lead, followupId, onClose }) {
  const qc = useQueryClient()
  const [stage, setStage] = useState('pre') // pre | during | post
  const [callStatus, setCallStatus] = useState('')
  const [outcome, setOutcome] = useState('')
  const [notes, setNotes] = useState('')
  const [nextDays, setNextDays] = useState(7)
  const [nextType, setNextType] = useState('call')
  const [futureDays, setFutureDays] = useState(0)

  const logMutation = useMutation({
    mutationFn: () => commsAPI.logCall({
      lead_id: lead.id, followup_id: followupId,
      status: callStatus, outcome, notes,
      next_followup_days: outcome === 'future_opportunity' ? futureDays : nextDays,
      next_followup_type: nextType,
    }),
    onSuccess: ({ data }) => {
      toast.success(data.data.next_followup ? `Logged + next follow-up on ${dayjs(data.data.next_followup.scheduled_date).format('D MMM')}` : 'Call logged')
      qc.invalidateQueries({ queryKey: ['comms-history', lead.id] })
      qc.invalidateQueries({ queryKey: ['followups'] })
      qc.invalidateQueries({ queryKey: ['priority'] })
      onClose()
    },
  })

  const handleCallClick = () => {
    window.open(`tel:${lead.mobile}`, '_blank')
    setStage('post')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
        onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
        <div className="modal-header">
          <div className="modal-title" style={{color:'#F59E0B'}}>📞 Call {lead.name?.split(' ')[0]}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:16}}>
          {stage === 'pre' && (
            <>
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:32,marginBottom:8}}>📞</div>
                <div style={{fontWeight:600,fontSize:16}}>{lead.name}</div>
                <div style={{fontSize:20,fontWeight:700,color:'var(--accent)',margin:'8px 0'}}>{lead.mobile}</div>
                <div style={{fontSize:12.5,color:'var(--text-3)'}}>{lead.project_type||''} {lead.city ? `· ${lead.city}` : ''}</div>
              </div>
              <button className="btn btn-primary" style={{fontSize:16,padding:'14px'}} onClick={handleCallClick}>
                <Phone size={18}/> Tap to Call
              </button>
            </>
          )}
          {stage === 'post' && (
            <>
              <div style={{fontWeight:600,marginBottom:4}}>How did the call go?</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[
                  {v:'connected',l:'✅ Connected',c:'#10B981'},
                  {v:'no_answer',l:'📵 No Answer',c:'#6B7280'},
                  {v:'busy',l:'🔴 Busy',c:'#EF4444'},
                  {v:'callback',l:'📞 Callback Later',c:'#F59E0B'},
                ].map(o => (
                  <button key={o.v} onClick={()=>setCallStatus(o.v)}
                    style={{padding:'10px',borderRadius:8,border:`2px solid ${callStatus===o.v?o.c:'var(--border)'}`,
                      background:callStatus===o.v?`${o.c}15`:'var(--surface)',cursor:'pointer',fontSize:13,fontWeight:callStatus===o.v?600:400}}>
                    {o.l}
                  </button>
                ))}
              </div>

              {callStatus === 'connected' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Outcome</label>
                    <select className="form-input" value={outcome} onChange={e=>setOutcome(e.target.value)}>
                      <option value="">Select outcome…</option>
                      {OUTCOMES.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-input" rows={3} value={notes}
                      onChange={e=>setNotes(e.target.value)} placeholder="What was discussed?"/>
                  </div>
                  {outcome === 'future_opportunity' ? (
                    <div className="form-group">
                      <label className="form-label">Contact again in…</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {FUTURE_OPTS.map(o => (
                          <button key={o.days} onClick={()=>setFutureDays(o.days)}
                            className={`pill ${futureDays===o.days?'active':''}`}>{o.label}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Next follow-up</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                        {NEXT_FU_OPTS.map(d => (
                          <button key={d} onClick={()=>setNextDays(d)}
                            className={`pill ${nextDays===d?'active':''}`}>{d} days</button>
                        ))}
                      </div>
                      <select className="form-input" value={nextType} onChange={e=>setNextType(e.target.value)}>
                        <option value="call">Call</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                      </select>
                    </div>
                  )}
                </>
              )}
              {(callStatus === 'no_answer' || callStatus === 'busy' || callStatus === 'callback') && (
                <div className="form-group">
                  <label className="form-label">Next follow-up in</label>
                  <div style={{display:'flex',gap:8}}>
                    {[1,2,3].map(d => (
                      <button key={d} onClick={()=>setNextDays(d)}
                        className={`pill ${nextDays===d?'active':''}`}>{d} day{d>1?'s':''}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {stage === 'post' && callStatus && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Skip</button>
            <button className="btn btn-primary" onClick={()=>logMutation.mutate()} disabled={logMutation.isPending}>
              {logMutation.isPending ? 'Saving…' : 'Log & Schedule Next'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── FOLLOW-UP CARD ──────────────────────────────────────────
function FollowupCard({ f, onAction }) {
  const navigate = useNavigate()
  const temp = TEMP[f.temperature] || TEMP.cold
  const isOverdue = dayjs(f.scheduled_date).isBefore(dayjs(),'day')
  const isToday = dayjs(f.scheduled_date).isSame(dayjs(),'day')

  return (
    <motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className="card" style={{marginBottom:12,borderLeft:`3px solid ${isOverdue?'#EF4444':isToday?'var(--accent)':'var(--border)'}`}}>
      {/* Header */}
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center',cursor:'pointer'}}
        onClick={()=>navigate(`/leads/${f.lead_id}`)}>
        <div>
          <span style={{fontSize:16}}>{temp.emoji}</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontWeight:700,fontSize:15}}>{f.lead_name}</span>
            {f.at_risk && <span style={{fontSize:10,background:'#FEF2F2',color:'#EF4444',padding:'2px 6px',borderRadius:4,fontWeight:700}}>AT RISK</span>}
            <span className={`badge ${isOverdue?'badge-red':isToday?'badge-blue':'badge-gray'}`} style={{fontSize:11}}>
              {isOverdue ? `${dayjs().diff(dayjs(f.scheduled_date),'day')}d overdue` : isToday ? 'Today' : dayjs(f.scheduled_date).format('D MMM')}
            </span>
          </div>
          <div style={{fontSize:12.5,color:'var(--text-3)',marginTop:2,display:'flex',gap:12}}>
            {f.project_type && <span>📋 {f.project_type}</span>}
            {f.city && <span>📍 {f.city}</span>}
            {f.mobile && <span>📞 {f.mobile}</span>}
          </div>
        </div>
        <div style={{fontSize:20,fontWeight:700,color:temp.color}}>{f.score||0}</div>
        <ChevronRight size={14} color="var(--text-4)"/>
      </div>

      {/* Context row */}
      {(f.lead_source || f.last_response_date || f.suggested_action) && (
        <div style={{padding:'8px 18px',display:'flex',gap:16,background:'var(--surface-2)',borderBottom:'1px solid var(--border)'}}>
          {f.last_response_date && (
            <span style={{fontSize:12,color:'var(--text-3)'}}>
              💬 Last reply: {dayjs(f.last_response_date).fromNow()}
            </span>
          )}
          {f.suggested_action && (
            <span style={{fontSize:12,color:'var(--accent)',fontWeight:500}}>
              → {f.suggested_action.replace(/_/g,' ')}
            </span>
          )}
          {f.notes && (
            <span style={{fontSize:12,color:'var(--text-4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
              📝 {f.notes}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{padding:'12px 18px',display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn btn-sm" style={{background:'#25D366',color:'#fff',borderColor:'#25D366'}}
          onClick={()=>onAction('whatsapp',f)}>
          <MessageSquare size={13}/> WhatsApp
        </button>
        <button className="btn btn-secondary btn-sm" onClick={()=>onAction('email',f)}>
          <Mail size={13}/> Email
        </button>
        <button className="btn btn-secondary btn-sm" onClick={()=>onAction('call',f)}>
          <Phone size={13}/> Call
        </button>
        <button className="btn btn-secondary btn-sm" onClick={()=>onAction('complete',f)}>
          <Check size={13}/> Done
        </button>
        <div style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>navigate(`/leads/${f.lead_id}`)}>
          <ChevronRight size={13}/>
        </button>
      </div>
    </motion.div>
  )
}

// ─── COMM HISTORY BADGE ──────────────────────────────────────
const CHANNEL_COLOR = { whatsapp:'#25D366', email:'#6366F1', call:'#F59E0B', meeting:'#8B5CF6' }

// ─── SECTIONS CONFIG ─────────────────────────────────────────
const SECTIONS = [
  { key:'today',      label:'Today',            query:{ today:'true' } },
  { key:'overdue',    label:'Overdue',           query:{ overdue:'true' } },
  { key:'this_week',  label:'This Week',         query:{ this_week:'true' } },
  { key:'all',        label:'All Pending',       query:{ status:'pending', limit:30 } },
  { key:'completed',  label:'Completed',         query:{ status:'completed', limit:30 } },
]

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function CommunicationCenter() {
  const qc = useQueryClient()
  const [activeSection, setActiveSection] = useState('today')
  const [modal, setModal] = useState(null) // { type, lead, followup }

  const section = SECTIONS.find(s=>s.key===activeSection)

  const { data, isLoading } = useQuery({
    queryKey: ['followups', activeSection],
    queryFn: () => followupsAPI.getAll({ ...section.query, sort:'scheduled_date', order:'ASC' }).then(r=>r.data),
    refetchInterval: 30000,
  })

  const completeMutation = useMutation({
    mutationFn: (f) => followupsAPI.complete(f.id, { outcome:'completed', reschedule: false }),
    onSuccess: () => { toast.success('Marked done'); qc.invalidateQueries({ queryKey: ['followups'] }); qc.invalidateQueries({ queryKey: ['priority'] }) },
  })

  const followups = data?.data || []
  const stats = data?.stats || {}

  const handleAction = (type, followup) => {
    if (type === 'complete') {
      if (window.confirm(`Mark follow-up with ${followup.lead_name} as done?`)) {
        completeMutation.mutate(followup)
      }
      return
    }
    const lead = {
      id: followup.lead_id, name: followup.lead_name,
      mobile: followup.lead_mobile, email: followup.lead_email,
      temperature: followup.temperature, score: followup.score,
      project_type: followup.project_type, city: followup.city,
      suggested_action: followup.suggested_action,
      last_response_date: followup.last_response_date,
    }
    setModal({ type, lead, followup })
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Communication Center</h1>
          <p className="page-subtitle">Contact clients · Log interactions · Schedule next steps</p>
        </div>
      </div>

      {/* Stats banner */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
        {[
          {label:'Today',   value:stats.today||0,           color:'var(--accent)'},
          {label:'Overdue', value:stats.overdue||0,         color:'var(--danger)'},
          {label:'This Week',value:stats.this_week||0,      color:'var(--warning)'},
          {label:'Pending', value:stats.total_pending||0,   color:'var(--text-2)'},
          {label:'Done/Mo', value:stats.completed_month||0, color:'var(--success)'},
        ].map(s=>(
          <div key={s.label} className="card" style={{padding:'12px 14px',textAlign:'center'}}>
            <div style={{fontSize:24,fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11.5,color:'var(--text-3)',marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div className="filter-pills" style={{marginBottom:16}}>
        {SECTIONS.map(s=>(
          <button key={s.key} className={`pill ${activeSection===s.key?'active':''}`}
            onClick={()=>setActiveSection(s.key)}>
            {s.key==='overdue' && stats.overdue>0
              ? <span style={{color:'var(--danger)'}}>{s.label} ({stats.overdue})</span>
              : s.key==='today' && stats.today>0
              ? `${s.label} (${stats.today})`
              : s.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {Array(4).fill(0).map((_,i)=><div key={i} className="skeleton" style={{height:140,borderRadius:12}}/>)}
        </div>
      ) : followups.length===0 ? (
        <div className="card">
          <div className="empty-state" style={{padding:'48px 0'}}>
            <div style={{fontSize:40,marginBottom:12}}>🎯</div>
            <h3>No follow-ups {activeSection==='today' ? 'today' : `in "${section?.label}"`}</h3>
            <p style={{marginTop:6}}>
              {activeSection==='overdue' ? '🎉 Nothing overdue — excellent!' : 'Follow-ups are auto-scheduled when you update lead status.'}
            </p>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {followups.map(f=>(
            <FollowupCard key={f.id} f={f} onAction={handleAction}/>
          ))}
        </AnimatePresence>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal?.type==='whatsapp' && (
          <WhatsAppModal key="wa" leadId={modal.lead.id} onClose={()=>setModal(null)}/>
        )}
        {modal?.type==='email' && (
          <EmailModal key="em" lead={modal.lead} onClose={()=>setModal(null)}/>
        )}
        {modal?.type==='call' && (
          <CallModal key="call" lead={modal.lead} followupId={modal.followup?.id} onClose={()=>setModal(null)}/>
        )}
      </AnimatePresence>
    </div>
  )
}
