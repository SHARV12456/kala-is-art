import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commsAPI, followupsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Phone, MessageSquare, Mail, Check, X, ChevronRight, RefreshCw, User, MapPin, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import toast from 'react-hot-toast'

dayjs.extend(relativeTime)

// ─── OUTCOME OPTIONS ─────────────────────────────────────────
const OUTCOMES = [
  { v:'interested',           l:'Interested',           e:'✅' },
  { v:'callback',             l:'Call Back Later',       e:'📞' },
  { v:'meeting_scheduled',    l:'Meeting Scheduled',     e:'📅' },
  { v:'estimate_requested',   l:'Estimate Requested',    e:'📋' },
  { v:'converted',            l:'Converted to Client',   e:'🎉' },
  { v:'not_interested',       l:'Not Interested',        e:'❌' },
  { v:'no_answer',            l:'No Answer',             e:'📵' },
  { v:'future_opportunity',   l:'Contact Later',         e:'🕐' },
]

const NEXT_FU = [
  { l:'Tomorrow',  d:1 },
  { l:'3 Days',    d:3 },
  { l:'1 Week',    d:7 },
  { l:'2 Weeks',   d:14 },
  { l:'1 Month',   d:30 },
]

const TEMP_CONFIG = {
  hot:  { emoji:'🔴', label:'Hot',  color:'#EF4444', bg:'#FEF2F2' },
  warm: { emoji:'🟡', label:'Warm', color:'#D97706', bg:'#FFFBEB' },
  cold: { emoji:'🔵', label:'Cold', color:'#6366F1', bg:'#EEF2FF' },
  dead: { emoji:'⚫', label:'Dead', color:'#9CA3AF', bg:'#F9FAFB' },
  won:  { emoji:'✅', label:'Won',  color:'#16A34A', bg:'#F0FDF4' },
  lost: { emoji:'✖',  label:'Lost', color:'#6B7280', bg:'#F9FAFB' },
}

// ─── QUICK ACTION MODAL ──────────────────────────────────────
// Simple single modal for all 3 actions
function ActionModal({ followup, action, onClose }) {
  const qc = useQueryClient()
  const [msg, setMsg]         = useState('')
  const [subject, setSubject] = useState('')
  const [outcome, setOutcome] = useState('')
  const [nextDays, setNextDays] = useState(7)
  const [step, setStep]       = useState(action === 'call' ? 'call' : 'message') // call | message | outcome | next
  const [generating, setGenerating] = useState(false)

  const lead = {
    id: followup.lead_id,
    name: followup.lead_name,
    mobile: followup.lead_mobile,
    email: followup.lead_email,
  }

  // Generate message on open for WA/Email
  const genMutation = useMutation({
    mutationFn: () => commsAPI.generate({ leadId: lead.id, channel: action }),
    onSuccess: ({ data }) => {
      setMsg(data.data.message || '')
      if (action === 'email') setSubject(data.data.subject || '')
    },
  })

  const waMutation = useMutation({
    mutationFn: () => commsAPI.logWhatsapp({ lead_id: lead.id, followup_id: followup.id, message: msg }),
    onSuccess: ({ data }) => {
      window.open(data.data.wa_url, '_blank')
      toast.success('WhatsApp opened!')
      qc.invalidateQueries({ queryKey: ['fu-list'] })
      onClose()
    },
  })

  const emailMutation = useMutation({
    mutationFn: () => commsAPI.sendEmail({ lead_id: lead.id, followup_id: followup.id, subject, body: msg, to_email: lead.email }),
    onSuccess: () => {
      toast.success('Email sent!')
      qc.invalidateQueries({ queryKey: ['fu-list'] })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Send failed'),
  })

  const callMutation = useMutation({
    mutationFn: () => commsAPI.logCall({
      lead_id: lead.id, followup_id: followup.id,
      status: outcome === 'no_answer' ? 'no_answer' : 'connected',
      outcome, next_followup_days: nextDays, next_followup_type: 'call',
    }),
    onSuccess: () => {
      toast.success(`Logged! Next follow-up in ${nextDays} days`)
      qc.invalidateQueries({ queryKey: ['fu-list'] })
      onClose()
    },
  })

  const doneMutation = useMutation({
    mutationFn: () => followupsAPI.complete(followup.id, { outcome: outcome || 'completed', reschedule: nextDays > 0 }),
    onSuccess: () => {
      toast.success('Marked done')
      qc.invalidateQueries({ queryKey: ['fu-list'] })
      onClose()
    },
  })

  const isWA    = action === 'whatsapp'
  const isEmail = action === 'email'
  const isCall  = action === 'call'

  // Auto-generate on modal open for WA/Email
  const handleGenerate = () => genMutation.mutate()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
        onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {isWA    && <span style={{ fontSize:22 }}>💬</span>}
            {isEmail && <span style={{ fontSize:22 }}>✉️</span>}
            {isCall  && <span style={{ fontSize:22 }}>📞</span>}
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>{followup.lead_name}</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>{followup.lead_mobile}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
        </div>

        <div className="modal-body">
          {/* CALL FLOW */}
          {isCall && step === 'call' && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:16 }}>
                Open your phone dialer to call {followup.lead_name}
              </div>
              <a href={`tel:${followup.lead_mobile}`}
                style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#6366F1', color:'#fff',
                  padding:'14px 32px', borderRadius:12, fontWeight:700, fontSize:16, textDecoration:'none' }}>
                <Phone size={20}/> Call {followup.lead_mobile}
              </a>
              <div style={{ marginTop:20 }}>
                <button className="btn btn-secondary" onClick={() => setStep('outcome')}>
                  I made the call → Log result
                </button>
              </div>
            </div>
          )}

          {isCall && step === 'outcome' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontWeight:600 }}>What happened on the call?</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {OUTCOMES.map(o => (
                  <button key={o.v} onClick={() => setOutcome(o.v)}
                    style={{ padding:'12px 10px', borderRadius:10, textAlign:'left',
                      border:`2px solid ${outcome===o.v ? 'var(--accent)' : 'var(--border)'}`,
                      background: outcome===o.v ? 'var(--accent-bg)' : 'var(--surface)',
                      cursor:'pointer', fontSize:13, fontWeight: outcome===o.v ? 600 : 400,
                      display:'flex', alignItems:'center', gap:8 }}>
                    <span>{o.e}</span> {o.l}
                  </button>
                ))}
              </div>

              {outcome && outcome !== 'not_interested' && outcome !== 'converted' && (
                <div>
                  <div style={{ fontWeight:600, marginBottom:8, fontSize:13 }}>Schedule next follow-up</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {NEXT_FU.map(n => (
                      <button key={n.d} onClick={() => setNextDays(n.d)}
                        className={`pill ${nextDays===n.d?'active':''}`}>{n.l}</button>
                    ))}
                  </div>
                </div>
              )}

              {outcome === 'converted' && (
                <div style={{ padding:'14px 16px', background:'#F0FDF4', borderRadius:10, border:'1px solid #BBF7D0' }}>
                  <div style={{ fontWeight:700, color:'#16A34A', fontSize:14 }}>🎉 Excellent! Mark this lead as Won</div>
                  <div style={{ fontSize:12, color:'#166534', marginTop:4 }}>The lead status will be updated to Won and no further follow-ups will be scheduled.</div>
                </div>
              )}

              {outcome === 'not_interested' && (
                <div style={{ padding:'14px 16px', background:'#F9FAFB', borderRadius:10, border:'1px solid var(--border)' }}>
                  <div style={{ fontWeight:600, color:'#6B7280', fontSize:13 }}>No further follow-ups will be scheduled.</div>
                </div>
              )}
            </div>
          )}

          {/* WHATSAPP FLOW */}
          {isWA && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ flex:1, fontSize:13, color:'var(--text-3)' }}>
                  A message will be generated from your last conversation with {followup.lead_name}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={genMutation.isPending}>
                  <RefreshCw size={12}/> {genMutation.isPending ? 'Generating…' : 'Generate'}
                </button>
              </div>
              <textarea className="form-input" rows={10}
                value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="Click Generate to create a smart message, or type your own…"
                style={{ fontFamily:'monospace', fontSize:13, lineHeight:1.6 }}/>
              <div style={{ fontSize:11, color:'var(--text-4)' }}>{msg.length} characters · editable before sending</div>
            </div>
          )}

          {/* EMAIL FLOW */}
          {isEmail && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {!lead.email && (
                <div style={{ padding:'10px 14px', background:'#FEF2F2', borderRadius:8, fontSize:13, color:'#DC2626' }}>
                  ⚠️ No email saved for this lead. Add email in their Lead Profile first.
                </div>
              )}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={genMutation.isPending}>
                  <RefreshCw size={12}/> {genMutation.isPending ? 'Generating…' : 'Generate Email'}
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">To</label>
                <input className="form-input" value={lead.email || 'No email on file'} readOnly style={{ color:'var(--text-3)' }}/>
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…"/>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-input" rows={8} value={msg} onChange={e => setMsg(e.target.value)}
                  placeholder="Email body…" style={{ fontFamily:'monospace', fontSize:13 }}/>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>

          {isCall && step === 'call' && (
            <button className="btn btn-secondary" onClick={() => setStep('outcome')}>Skip → Log Result</button>
          )}
          {isCall && step === 'outcome' && outcome && (
            <button className="btn btn-primary" onClick={() => callMutation.mutate()} disabled={callMutation.isPending}
              style={outcome==='converted' ? { background:'#16A34A', borderColor:'#16A34A' } : {}}>
              {callMutation.isPending ? 'Saving…'
                : outcome === 'converted'     ? '🎉 Mark as Won'
                : outcome === 'not_interested'? '✖ Mark Not Interested'
                : '✅ Save & Schedule Next'}
            </button>
          )}
          {isWA && (
            <button className="btn btn-primary" style={{ background:'#25D366', borderColor:'#25D366' }}
              onClick={() => waMutation.mutate()} disabled={!msg || waMutation.isPending}>
              <MessageSquare size={14}/> {waMutation.isPending ? 'Opening…' : 'Open WhatsApp'}
            </button>
          )}
          {isEmail && (
            <button className="btn btn-primary" onClick={() => emailMutation.mutate()}
              disabled={!subject || !msg || !lead.email || emailMutation.isPending}>
              <Mail size={14}/> {emailMutation.isPending ? 'Sending…' : 'Send Email'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── SINGLE FOLLOW-UP CARD ───────────────────────────────────
function FollowupCard({ f, onAction }) {
  const navigate = useNavigate()
  const isToday   = dayjs(f.scheduled_date).isSame(dayjs(), 'day')
  const isOverdue = dayjs(f.scheduled_date).isBefore(dayjs(), 'day')
  const daysOver  = dayjs().diff(dayjs(f.scheduled_date), 'day')
  const temp      = TEMP_CONFIG[f.temperature] || TEMP_CONFIG.cold

  const borderColor = isOverdue ? '#EF4444' : isToday ? '#6366F1' : 'var(--border)'
  const dateBadge   = isOverdue
    ? { label: `${daysOver}d overdue`, color:'#EF4444', bg:'#FEF2F2' }
    : isToday
    ? { label: 'Today',   color:'#6366F1', bg:'#EEF2FF' }
    : { label: dayjs(f.scheduled_date).format('D MMM'), color:'var(--text-3)', bg:'var(--surface-2)' }

  return (
    <motion.div layout initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
      className="card" style={{ marginBottom:10, borderLeft:`3px solid ${borderColor}` }}>

      {/* Row 1: Name + date badge + temp + arrow */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
        onClick={() => navigate(`/leads/${f.lead_id}`)}>

        {/* Temperature dot */}
        <div style={{ width:36, height:36, borderRadius:10, background:temp.bg,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
          {temp.emoji}
        </div>

        {/* Main info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, fontSize:15 }}>{f.lead_name}</span>
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
              color: dateBadge.color, background: dateBadge.bg }}>
              {dateBadge.label}
            </span>
            {f.type && (
              <span style={{ fontSize:11, color:'var(--text-4)', background:'var(--surface-2)',
                padding:'2px 6px', borderRadius:4 }}>
                {f.type}
              </span>
            )}
          </div>
          <div style={{ marginTop:4, display:'flex', gap:14, flexWrap:'wrap' }}>
            {f.lead_mobile && (
              <span style={{ fontSize:12.5, color:'var(--text-3)', display:'flex', alignItems:'center', gap:4 }}>
                <Phone size={11}/> {f.lead_mobile}
              </span>
            )}
            {f.city && (
              <span style={{ fontSize:12.5, color:'var(--text-3)', display:'flex', alignItems:'center', gap:4 }}>
                <MapPin size={11}/> {f.city}
              </span>
            )}
            {f.last_response_date && (
              <span style={{ fontSize:12, color:'var(--text-4)' }}>
                💬 Last reply {dayjs(f.last_response_date).fromNow()}
              </span>
            )}
          </div>
          {f.notes && (
            <div style={{ marginTop:4, fontSize:12, color:'var(--text-3)', fontStyle:'italic',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500 }}>
              📝 {f.notes}
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <div style={{ fontWeight:700, color:temp.color, fontSize:18 }}>{f.score||0}</div>
          <div style={{ fontSize:10, color:'var(--text-4)' }}>score</div>
        </div>

        <ChevronRight size={14} color="var(--text-4)" style={{ flexShrink:0 }}/>
      </div>

      {/* Row 2: Action buttons */}
      <div style={{ padding:'10px 18px 14px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <button className="btn btn-sm"
          style={{ background:'#25D366', color:'#fff', borderColor:'#25D366', fontWeight:600 }}
          onClick={() => onAction('whatsapp', f)}>
          <MessageSquare size={13}/> WhatsApp
        </button>

        <button className="btn btn-secondary btn-sm" onClick={() => onAction('call', f)}>
          <Phone size={13}/> Call
        </button>

        <button className="btn btn-secondary btn-sm" onClick={() => onAction('email', f)}>
          <Mail size={13}/> Email
        </button>

        <div style={{ flex:1 }}/>

        <button className="btn btn-sm" style={{ background:'var(--success)', color:'#fff', borderColor:'var(--success)' }}
          onClick={() => onAction('done', f)}>
          <Check size={13}/> Done
        </button>
      </div>
    </motion.div>
  )
}

// ─── DONE MODAL (quick confirm) ──────────────────────────────
function DoneModal({ followup, onClose }) {
  const qc = useQueryClient()
  const [nextDays, setNextDays] = useState(7)
  const [scheduleNext, setScheduleNext] = useState(true)

  const doneMutation = useMutation({
    mutationFn: () => followupsAPI.complete(followup.id, { outcome:'completed', reschedule: scheduleNext }),
    onSuccess: () => {
      toast.success(scheduleNext ? `Done! Next follow-up in ${nextDays} days` : 'Marked complete')
      qc.invalidateQueries({ queryKey: ['fu-list'] })
      onClose()
    },
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
        onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
        <div className="modal-header">
          <div style={{ fontWeight:700 }}>✅ Mark Done — {followup.lead_name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="checkbox" id="sched" checked={scheduleNext} onChange={e => setScheduleNext(e.target.checked)}
              style={{ width:16, height:16, cursor:'pointer' }}/>
            <label htmlFor="sched" style={{ fontSize:14, cursor:'pointer' }}>Schedule next follow-up</label>
          </div>
          {scheduleNext && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {NEXT_FU.map(n => (
                <button key={n.d} onClick={() => setNextDays(n.d)}
                  className={`pill ${nextDays===n.d?'active':''}`}>{n.l}</button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => doneMutation.mutate()} disabled={doneMutation.isPending}>
            {doneMutation.isPending ? 'Saving…' : '✅ Confirm Done'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── SECTIONS ────────────────────────────────────────────────
const TABS = [
  { key:'today',     label:'Today' },
  { key:'overdue',   label:'Overdue' },
  { key:'this_week', label:'This Week' },
  { key:'all',       label:'All' },
  { key:'completed', label:'Completed' },
]

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function FollowUpsPage() {
  const [tab, setTab]     = useState('today')
  const [modal, setModal] = useState(null)   // { action:'whatsapp'|'call'|'email'|'done', followup }

  const QUERY_MAP = {
    today:     { today:'true', status:'pending' },
    overdue:   { overdue:'true', status:'pending' },
    this_week: { this_week:'true', status:'pending' },
    all:       { status:'pending', limit:40 },
    completed: { status:'completed', limit:40 },
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fu-list', tab],
    queryFn: () => followupsAPI.getAll({ ...QUERY_MAP[tab], sort:'scheduled_date', order:'ASC' }).then(r => r.data),
    refetchInterval: 30000,
  })

  const followups = data?.data || []
  const stats     = data?.stats || {}

  const handleAction = (action, f) => setModal({ action, followup: f })

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Follow-ups</h1>
          <p className="page-subtitle">Your daily client contact list</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Summary numbers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'📅 Today',       value: stats.today||0,           note:'due today',     color:'var(--accent)' },
          { label:'🚨 Overdue',     value: stats.overdue||0,         note:'past due',      color:'#EF4444' },
          { label:'📆 This Week',   value: stats.this_week||0,       note:'coming up',     color:'#D97706' },
          { label:'✅ Done This Mo',value: stats.completed_month||0, note:'completed',     color:'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'16px', textAlign:'center' }}>
            <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:13, fontWeight:500, marginTop:4 }}>{s.label}</div>
            <div style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>{s.note}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="filter-pills" style={{ marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pill ${tab===t.key?'active':''}`}>
            {t.key==='overdue' && (stats.overdue||0)>0
              ? <span style={{ color: tab===t.key ? undefined : '#EF4444' }}>{t.label} ({stats.overdue})</span>
              : t.key==='today' && (stats.today||0)>0
              ? `${t.label} (${stats.today})`
              : t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:110, borderRadius:12 }}/>)}
        </div>
      ) : followups.length === 0 ? (
        <div className="card" style={{ padding:'40px 0', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>
            {tab==='overdue' ? '🎉' : tab==='completed' ? '📊' : '📭'}
          </div>
          <div style={{ fontWeight:600, fontSize:15 }}>
            {tab==='overdue'   ? 'Nothing overdue — great work!'  :
             tab==='completed' ? 'No completed follow-ups yet'    :
             tab==='today'     ? 'No follow-ups scheduled today'  :
             'No follow-ups in this section'}
          </div>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:6 }}>
            {tab==='today' ? 'Follow-ups are created automatically when you add or update leads.' : ''}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:10 }}>
            {followups.length} follow-up{followups.length!==1?'s':''}
          </div>
          <AnimatePresence>
            {followups.map(f => (
              <FollowupCard key={f.id} f={f} onAction={handleAction}/>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal && modal.action !== 'done' && (
          <ActionModal key="action" followup={modal.followup} action={modal.action} onClose={() => setModal(null)}/>
        )}
        {modal && modal.action === 'done' && (
          <DoneModal key="done" followup={modal.followup} onClose={() => setModal(null)}/>
        )}
      </AnimatePresence>
    </div>
  )
}
