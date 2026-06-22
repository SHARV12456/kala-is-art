import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { priorityAPI, activitiesAPI, followupsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, MessageSquare, AlertTriangle, Flame, TrendingUp, Calendar, ChevronRight, RefreshCw, Check, Thermometer } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import toast from 'react-hot-toast'
import { useState } from 'react'

dayjs.extend(relativeTime)

// ─── TEMPERATURE CONFIG ───────────────────────────────────────
const TEMP = {
  hot:  { label:'HOT',  emoji:'🔴', color:'#EF4444', bg:'#FEF2F2', border:'#FCA5A5' },
  warm: { label:'WARM', emoji:'🟡', color:'#F59E0B', bg:'#FFFBEB', border:'#FCD34D' },
  cold: { label:'COLD', emoji:'🔵', color:'#6366F1', bg:'#EEF2FF', border:'#A5B4FC' },
  dead: { label:'DEAD', emoji:'⚫', color:'#6B7280', bg:'#F9FAFB', border:'#D1D5DB' },
}

const ACTIONS = {
  call_now:            { label:'Call Now',           icon: Phone,         color:'#6366F1' },
  send_estimate:       { label:'Send Estimate',      icon: TrendingUp,    color:'#F59E0B' },
  schedule_site_visit: { label:'Schedule Site Visit',icon: Calendar,      color:'#10B981' },
  follow_up_on_estimate:{ label:'Follow Up on Estimate', icon: MessageSquare, color:'#8B5CF6' },
  send_whatsapp:       { label:'Send WhatsApp',      icon: MessageSquare, color:'#25D366' },
  schedule_call:       { label:'Schedule Call',      icon: Phone,         color:'#6366F1' },
  send_reengagement:   { label:'Re-engage',          icon: RefreshCw,     color:'#F59E0B' },
  archive:             { label:'Archive Lead',       icon: null,          color:'#9CA3AF' },
}

// ─── LEAD ROW COMPONENT ───────────────────────────────────────
function PriorityLeadRow({ lead, rank }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const temp = TEMP[lead.temperature] || TEMP.cold
  const action = ACTIONS[lead.suggested_action]

  const logMutation = useMutation({
    mutationFn: (type) => activitiesAPI.log({ lead_id: lead.id, activity_type: type, title: `${type} logged` }),
    onSuccess: () => { toast.success('Activity logged'); qc.invalidateQueries({ queryKey: ['priority'] }) },
  })

  return (
    <motion.div layout initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: rank * 0.04 }}
      className="card" style={{ padding:'14px 18px', cursor:'pointer', borderLeft:`3px solid ${temp.color}` }}
      onClick={() => navigate(`/leads/${lead.id}`)}>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        {/* Rank + temp */}
        <div style={{ width:36, textAlign:'center', flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:temp.color }}>{temp.emoji}</div>
          <div style={{ fontSize:10, color:'var(--text-4)', marginTop:1 }}>#{rank+1}</div>
        </div>

        {/* Score ring */}
        <div style={{ width:42, height:42, borderRadius:'50%', background:temp.bg, border:`2px solid ${temp.border}`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:13, fontWeight:700, color:temp.color }}>{lead.score}</span>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight:600, fontSize:14 }}>{lead.name}</span>
            {lead.at_risk && <span style={{ fontSize:10, background:'#FEF2F2', color:'#EF4444', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>AT RISK</span>}
            <span className={`badge badge-${lead.status}`} style={{ fontSize:11 }}>{lead.status?.replace(/_/g,' ')}</span>
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {lead.mobile}
            {lead.last_response_date && <> · Last reply {dayjs(lead.last_response_date).fromNow()}</>}
            {lead.next_followup_date && <> · Next: {dayjs(lead.next_followup_date).format('D MMM')}</>}
          </div>
        </div>

        {/* Suggested action */}
        {action && action.icon && (
          <div style={{ flexShrink:0, display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:11.5, color:action.color, fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
              <action.icon size={13}/> {action.label}
            </div>
            {(lead.suggested_action === 'call_now' || lead.suggested_action === 'schedule_call') && (
              <button className="btn btn-primary btn-sm" onClick={() => logMutation.mutate('call')}>
                <Phone size={11}/> Log Call
              </button>
            )}
            {(lead.suggested_action === 'send_whatsapp') && (
              <button className="btn btn-secondary btn-sm" onClick={() => logMutation.mutate('whatsapp')}>
                <MessageSquare size={11}/> Log WA
              </button>
            )}
          </div>
        )}

        <ChevronRight size={14} color="var(--text-4)" style={{ flexShrink:0 }}/>
      </div>
    </motion.div>
  )
}

// ─── FOLLOWUP ROW ─────────────────────────────────────────────
function TodayFollowupRow({ f }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [done, setDone] = useState(false)
  const temp = TEMP[f.temperature] || TEMP.cold

  const completeMutation = useMutation({
    mutationFn: () => followupsAPI.complete(f.id, { outcome:'callback', reschedule: true }),
    onSuccess: () => { setDone(true); toast.success('Marked done'); qc.invalidateQueries({ queryKey: ['priority'] }); qc.invalidateQueries({ queryKey: ['followups'] }) },
  })

  if (done) return null

  return (
    <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:18, flexShrink:0 }}>{temp.emoji}</span>
      <div style={{ flex:1, cursor:'pointer' }} onClick={() => navigate(`/leads/${f.lead_id}`)}>
        <div style={{ fontWeight:500, fontSize:13.5 }}>{f.lead_name}</div>
        <div style={{ fontSize:12, color:'var(--text-3)' }}>
          {f.type} {f.scheduled_time && `at ${f.scheduled_time}`} · {f.mobile}
        </div>
      </div>
      <button className="btn btn-primary btn-icon btn-sm" onClick={() => completeMutation.mutate()} title="Mark done">
        <Check size={13}/>
      </button>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function PriorityDashboard() {
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['priority'],
    queryFn: () => priorityAPI.getDashboard().then(r => r.data.data),
    refetchInterval: 60000,
  })

  const rescoreMutation = useMutation({
    mutationFn: () => priorityAPI.rescore(),
    onSuccess: () => { toast.success('All leads rescored'); qc.invalidateQueries({ queryKey: ['priority'] }) },
  })

  if (isLoading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {Array(6).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:72, borderRadius:12 }}/>)}
    </div>
  )

  const d = data || {}
  const summary = d.summary || {}

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Intelligence Dashboard</h1>
          <p className="page-subtitle">AI-powered lead priorities · Updated {dayjs().format('h:mm A')}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => refetch()}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-secondary btn-sm" onClick={() => rescoreMutation.mutate()} disabled={rescoreMutation.isPending}>
            <Thermometer size={13}/> Rescore All
          </button>
        </div>
      </div>

      {/* Summary stat row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'🔴 Hot Leads',    value:summary.hot||0,     color:'#EF4444', bg:'#FEF2F2' },
          { label:'⚠️ At Risk',      value:summary.at_risk||0, color:'#F59E0B', bg:'#FFFBEB' },
          { label:'📞 Today',        value:summary.today||0,   color:'#6366F1', bg:'#EEF2FF' },
          { label:'🚨 Overdue',      value:summary.overdue||0, color:'#DC2626', bg:'#FEF2F2' },
          { label:'🟡 Warm',         value:summary.warm||0,    color:'#D97706', bg:'#FFFBEB' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'14px 16px', textAlign:'center', background:s.bg, border:`1px solid ${s.color}30` }}>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>
        {/* Left: Hot leads + Warm + Needs Action */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Hot Leads */}
          <div className="card">
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <Flame size={16} color="#EF4444"/>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Hot Leads</span>
              <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)' }}>Score ≥ 80</span>
            </div>
            <div style={{ padding:'8px 0' }}>
              {(d.hot_leads||[]).length === 0
                ? <div className="empty-state" style={{ padding:'24px 0' }}><p>No hot leads right now. Keep adding leads!</p></div>
                : (d.hot_leads||[]).map((l, i) => <div key={l.id} style={{ padding:'0 8px' }}><PriorityLeadRow lead={l} rank={i}/></div>)}
            </div>
          </div>

          {/* At Risk */}
          {(d.at_risk||[]).length > 0 && (
            <div className="card" style={{ border:'1px solid #FCA5A5' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                <AlertTriangle size={16} color="#EF4444"/>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#DC2626' }}>At Risk — No Contact in 48h+</span>
              </div>
              <div style={{ padding:'8px 0' }}>
                {(d.at_risk||[]).map((l, i) => <div key={l.id} style={{ padding:'0 8px' }}><PriorityLeadRow lead={l} rank={i}/></div>)}
              </div>
            </div>
          )}

          {/* Warm Leads */}
          {(d.warm_leads||[]).length > 0 && (
            <div className="card">
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>🟡</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Warm Leads Needing Attention</span>
              </div>
              <div style={{ padding:'8px 0' }}>
                {(d.warm_leads||[]).map((l, i) => <div key={l.id} style={{ padding:'0 8px' }}><PriorityLeadRow lead={l} rank={i}/></div>)}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Today's follow-ups + Overdue */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Today's Follow-ups */}
          <div className="card">
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>📅 Today's Follow-ups</div>
              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{(d.todays_followups||[]).length} scheduled</div>
            </div>
            <div style={{ padding:'4px 18px' }}>
              {(d.todays_followups||[]).length === 0
                ? <div className="empty-state" style={{ padding:'20px 0' }}><p style={{ fontSize:13 }}>No follow-ups today 🎉</p></div>
                : (d.todays_followups||[]).map(f => <TodayFollowupRow key={f.id} f={f}/>)}
            </div>
          </div>

          {/* Overdue */}
          {(d.overdue_followups||[]).length > 0 && (
            <div className="card" style={{ border:'1px solid #FCA5A5' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#DC2626' }}>🚨 Overdue</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{(d.overdue_followups||[]).length} follow-ups missed</div>
              </div>
              <div style={{ padding:'4px 18px' }}>
                {(d.overdue_followups||[]).map(f => (
                  <div key={f.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                    onClick={() => window.location.href = `/leads/${f.lead_id}`}>
                    <span style={{ fontSize:16 }}>{TEMP[f.temperature]?.emoji||'🔵'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:500, fontSize:13 }}>{f.lead_name}</div>
                      <div style={{ fontSize:11.5, color:'#DC2626' }}>{f.days_overdue}d overdue · {f.type}</div>
                    </div>
                    <ChevronRight size={13} color="var(--text-4)"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scoring legend */}
          <div className="card" style={{ padding:16 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:10 }}>LEAD TEMPERATURE SCORING</div>
            {[
              { ...TEMP.hot,  range:'80–100 pts', desc:'Budget+Meeting+Response' },
              { ...TEMP.warm, range:'60–79 pts',  desc:'Interested+Estimate' },
              { ...TEMP.cold, range:'40–59 pts',  desc:'Early stage / slow response' },
              { ...TEMP.dead, range:'0–39 pts',   desc:'No activity / low budget' },
            ].map(t => (
              <div key={t.label} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:6, background:t.bg, border:`1px solid ${t.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{t.emoji}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:t.color }}>{t.label} · {t.range}</div>
                  <div style={{ fontSize:11, color:'var(--text-4)' }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
