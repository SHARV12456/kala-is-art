import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsAPI, estimatesAPI, clientPaymentsAPI } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, FileText,
  CreditCard, Plus, Edit2, Trash2, X, Check, Download,
  Calendar, Clock, IndianRupee, ChevronRight, Folder
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import toast from 'react-hot-toast'

dayjs.extend(relativeTime)

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0'

const METHOD_EMOJI = { cash:'💵', upi:'📱', bank_transfer:'🏦', cheque:'📋', card:'💳', other:'💰' }
const METHOD_LABEL = { cash:'Cash', upi:'UPI', bank_transfer:'Bank Transfer', cheque:'Cheque', card:'Card', other:'Other' }
const STATUS_BADGE = {
  received:  { label:'Received',  color:'#10B981', bg:'#ECFDF5' },
  pending:   { label:'Pending',   color:'#F59E0B', bg:'#FFFBEB' },
  partial:   { label:'Partial',   color:'#6366F1', bg:'#EEF2FF' },
  cancelled: { label:'Cancelled', color:'#EF4444', bg:'#FEF2F2' },
}

// ── ADD PAYMENT MODAL ────────────────────────────────────────
function PaymentModal({ clientId, payment, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    amount:           payment?.amount || '',
    payment_date:     payment?.payment_date?.split('T')[0] || dayjs().format('YYYY-MM-DD'),
    payment_method:   payment?.payment_method || 'cash',
    reference_number: payment?.reference_number || '',
    milestone:        payment?.milestone || '',
    notes:            payment?.notes || '',
    status:           payment?.status || 'received',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => payment
      ? clientPaymentsAPI.update(clientId, payment.id, form)
      : clientPaymentsAPI.add(clientId, form),
    onSuccess: () => {
      toast.success(payment ? 'Payment updated' : `${fmt(form.amount)} recorded!`)
      qc.invalidateQueries({ queryKey: ['client-folder', clientId] })
      onClose()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth:460 }}
        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontWeight:700 }}>{payment ? '✏️ Edit Payment' : '💰 Record Payment'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" placeholder="50000"
                value={form.amount} onChange={e => set('amount', e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date"
                value={form.payment_date} onChange={e => set('payment_date', e.target.value)}/>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Milestone</label>
            <input className="form-input" placeholder="e.g. Advance, 50% Progress, Final"
              value={form.milestone} onChange={e => set('milestone', e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {Object.entries(METHOD_LABEL).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set('payment_method', k)}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:13, cursor:'pointer',
                    border:`2px solid ${form.payment_method===k ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.payment_method===k ? 'var(--accent-bg)' : 'var(--surface)',
                    fontWeight: form.payment_method===k ? 700 : 400 }}>
                  {METHOD_EMOJI[k]} {v}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reference / Transaction ID</label>
            <input className="form-input" placeholder="UPI ref, cheque no, NEFT ID…"
              value={form.reference_number} onChange={e => set('reference_number', e.target.value)}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="received">✅ Received</option>
                <option value="pending">⏳ Pending</option>
                <option value="partial">🔶 Partial</option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Optional note"
                value={form.notes} onChange={e => set('notes', e.target.value)}/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.amount || mutation.isPending}
            onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving…' : payment ? '✅ Update' : '💰 Save Payment'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── SECTION CARD ─────────────────────────────────────────────
function Section({ title, action, children }) {
  return (
    <div className="card" style={{ marginBottom:16 }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:700, fontSize:14 }}>{title}</span>
        {action}
      </div>
      <div style={{ padding:'16px 18px' }}>{children}</div>
    </div>
  )
}

// ── MAIN PAGE ────────────────────────────────────────────────
export default function ClientFolderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [payModal, setPayModal] = useState(null) // null | 'add' | payment object
  const [projectValue, setProjectValue] = useState('')
  const [editingPV, setEditingPV] = useState(false)

  // Fetch all data in parallel
  const { data: client, isLoading: cLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsAPI.getOne(id).then(r => r.data.data),
  })
  const { data: payData } = useQuery({
    queryKey: ['client-folder', id],
    queryFn: () => clientPaymentsAPI.getAll(id).then(r => r.data.data),
    enabled: !!id,
  })
  const { data: estData } = useQuery({
    queryKey: ['estimates-client', id],
    queryFn: () => estimatesAPI.getAll({ client_id: id, limit: 20 }).then(r => r.data),
  })

  const deletePay = useMutation({
    mutationFn: pid => clientPaymentsAPI.delete(id, pid),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['client-folder', id] }) },
  })
  const setPV = useMutation({
    mutationFn: () => clientPaymentsAPI.setProjectValue(id, projectValue),
    onSuccess: () => {
      toast.success('Project value updated')
      qc.invalidateQueries({ queryKey: ['client-folder', id] })
      qc.invalidateQueries({ queryKey: ['client', id] })
      setEditingPV(false)
    },
  })

  if (cLoading) return <div className="skeleton" style={{ height:400, borderRadius:16 }}/>
  if (!client) return <div>Client not found</div>

  const payments  = payData?.payments || []
  const summary   = payData?.summary  || {}
  const estimates = estData?.data     || []
  const projects  = (client.projects || []).filter(Boolean)
  const documents = (client.documents || []).filter(Boolean)

  const pct = summary.percent_paid || 0
  const barColor = pct >= 100 ? '#10B981' : pct >= 60 ? '#6366F1' : pct >= 30 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-icon">
          <ArrowLeft size={18}/>
        </button>
        <div style={{ width:46, height:46, borderRadius:12, background:'var(--accent-bg)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:800, fontSize:20, color:'var(--accent)', flexShrink:0 }}>
          {client.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>{client.name}</h1>
            <span style={{ fontSize:11, color:'var(--text-4)', background:'var(--surface-2)',
              padding:'2px 8px', borderRadius:20 }}>{client.client_number}</span>
            <Folder size={16} color="var(--accent)" style={{ marginLeft:4 }}/>
          </div>
          <div style={{ display:'flex', gap:16, marginTop:4, flexWrap:'wrap' }}>
            {client.mobile && <span style={{ fontSize:13, color:'var(--text-3)', display:'flex', alignItems:'center', gap:4 }}><Phone size={12}/>{client.mobile}</span>}
            {client.email  && <span style={{ fontSize:13, color:'var(--text-3)', display:'flex', alignItems:'center', gap:4 }}><Mail size={12}/>{client.email}</span>}
            {client.city   && <span style={{ fontSize:13, color:'var(--text-3)', display:'flex', alignItems:'center', gap:4 }}><MapPin size={12}/>{client.city}</span>}
          </div>
        </div>
        <div style={{ fontSize:12, color:'var(--text-4)' }}>
          Client since {dayjs(client.created_at).format('D MMM YYYY')}
        </div>
      </div>

      {/* ── PAYMENT SUMMARY BANNER ── */}
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>💰 Payment Summary</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {editingPV ? (
              <>
                <input type="number" className="form-input" value={projectValue}
                  onChange={e => setProjectValue(e.target.value)}
                  placeholder="Total project value" style={{ width:160, padding:'4px 10px', fontSize:13 }} autoFocus/>
                <button className="btn btn-primary btn-sm" onClick={() => setPV.mutate()} disabled={!projectValue}><Check size={12}/></button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingPV(false)}><X size={12}/></button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setProjectValue(client.total_project_value || ''); setEditingPV(true) }}>
                <Edit2 size={12}/> {client.total_project_value ? `Total: ${fmt(client.total_project_value)}` : 'Set Project Value'}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setPayModal('add')}>
              <Plus size={13}/> Add Payment
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {summary.project_value > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)', marginBottom:5 }}>
              <span>{pct}% received</span>
              <span>{fmt(summary.total_received)} / {fmt(summary.project_value)}</span>
            </div>
            <div style={{ height:8, background:'var(--surface-2)', borderRadius:8, overflow:'hidden' }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100, pct)}%` }}
                transition={{ duration:0.8 }}
                style={{ height:'100%', background:barColor, borderRadius:8 }}/>
            </div>
          </div>
        )}

        {/* 4 numbers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { label:'Project Value',  value: fmt(summary.project_value),  color:'var(--accent)',  bg:'var(--accent-bg)' },
            { label:'✅ Received',    value: fmt(summary.total_received), color:'#10B981',        bg:'#ECFDF5' },
            { label:'⏳ Outstanding', value: fmt(summary.outstanding),    color:'#EF4444',        bg:'#FEF2F2' },
            { label:'Transactions',  value: summary.payment_count || 0,  color:'var(--text-2)',  bg:'var(--surface-2)' },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      <Section title="📋 Payment History"
        action={<button className="btn btn-primary btn-sm" onClick={() => setPayModal('add')}><Plus size={12}/> Add</button>}>
        {payments.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-3)', fontSize:13 }}>
            No payments recorded yet.
            <button className="btn btn-secondary btn-sm" style={{ marginLeft:10 }} onClick={() => setPayModal('add')}>
              Record First Payment
            </button>
          </div>
        ) : (
          <div style={{ margin: '-16px -18px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Date & Method</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Details & Reference</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {payments.map((p, i) => {
                    const st = STATUS_BADGE[p.status] || STATUS_BADGE.received
                    return (
                      <motion.tr key={p.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.04 }}
                        style={{ borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)', fontSize: 13 }}>
                        
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                            {dayjs(p.payment_date).format('DD MMM YYYY')}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {METHOD_EMOJI[p.payment_method]} {METHOD_LABEL[p.payment_method]}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>
                            {p.milestone || 'General Payment'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2, display:'flex', flexDirection:'column', gap:2 }}>
                            <span>{p.reference_number ? `Ref: ${p.reference_number}` : 'No Ref'}</span>
                            {p.notes && <span style={{ fontStyle:'italic' }}>"{p.notes}"</span>}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: st.color, fontSize: 14 }}>
                          {fmt(p.amount)}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600, color: st.color, background: st.bg }}>
                            {st.label}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPayModal(p)}>
                              <Edit2 size={13}/>
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#EF4444' }}
                              onClick={() => { if(window.confirm('Delete payment?')) deletePay.mutate(p.id) }}>
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </td>

                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── ESTIMATES ── */}
      <Section title="📄 Estimates & Quotes"
        action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/estimates/new')}>
          <Plus size={12}/> New Estimate
        </button>}>
        {estimates.length === 0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-3)', fontSize:13 }}>
            No estimates created for this client.
            <button className="btn btn-secondary btn-sm" style={{ marginLeft:10 }} onClick={() => navigate('/estimates/new')}>
              Create Estimate
            </button>
          </div>
        ) : estimates.map(e => {
          const estSt = { draft:{c:'#6B7280',b:'#F9FAFB'}, sent:{c:'#6366F1',b:'#EEF2FF'},
            accepted:{c:'#10B981',b:'#ECFDF5'}, rejected:{c:'#EF4444',b:'#FEF2F2'} }[e.status] || {c:'#6B7280',b:'#F9FAFB'}
          return (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0',
              borderBottom:'1px solid var(--border)' }}>
              <FileText size={18} color="var(--accent)"/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{e.estimate_number}</span>
                  <span style={{ fontSize:11, padding:'2px 7px', borderRadius:20, fontWeight:600,
                    color:estSt.c, background:estSt.b }}>
                    {e.status}
                  </span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
                  {e.project_name && <span>📋 {e.project_name} · </span>}
                  Created {dayjs(e.created_at).format('D MMM YYYY')}
                  {e.valid_until && <span> · Valid until {dayjs(e.valid_until).format('D MMM')}</span>}
                </div>
              </div>
              <div style={{ fontWeight:700, color:'var(--accent)', fontSize:15 }}>{fmt(e.grand_total)}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/estimates/${e.id}/edit`)}>
                <ChevronRight size={14}/>
              </button>
            </div>
          )
        })}
      </Section>

      {/* ── PROJECTS ── */}
      {projects.length > 0 && (
        <Section title="🏗️ Projects">
          {projects.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0',
              borderBottom:'1px solid var(--border)' }}>
              <Building2 size={18} color="var(--accent)"/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{p.name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2, display:'flex', gap:10 }}>
                  {p.project_type && <span>{p.project_type}</span>}
                  {p.start_date && <span>📅 {dayjs(p.start_date).format('D MMM YYYY')}</span>}
                  {p.estimated_value && <span>{fmt(p.estimated_value)}</span>}
                </div>
              </div>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
                color: p.status==='completed'?'#10B981':p.status==='in_progress'?'#6366F1':'#D97706',
                background: p.status==='completed'?'#ECFDF5':p.status==='in_progress'?'#EEF2FF':'#FFFBEB' }}>
                {p.status?.replace(/_/g,' ')}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* ── DOCUMENTS ── */}
      {documents.length > 0 && (
        <Section title="📁 Documents">
          {documents.map(d => (
            <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
                borderBottom:'1px solid var(--border)', textDecoration:'none', color:'inherit' }}>
              <Download size={16} color="var(--accent)"/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{d.name}</div>
                <div style={{ fontSize:11, color:'var(--text-4)' }}>{dayjs(d.created_at).format('D MMM YYYY')}</div>
              </div>
              <span style={{ fontSize:11, color:'var(--text-4)', background:'var(--surface-2)',
                padding:'2px 6px', borderRadius:4 }}>{d.file_type?.toUpperCase()}</span>
            </a>
          ))}
        </Section>
      )}

      {/* ── CLIENT INFO ── */}
      <Section title="👤 Client Details">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { label:'Full Name',    value: client.name },
            { label:'Mobile',       value: client.mobile },
            { label:'Email',        value: client.email || '—' },
            { label:'City',         value: client.city || '—' },
            { label:'Area',         value: client.area || '—' },
            { label:'Address',      value: client.address || '—' },
            { label:'GST Number',   value: client.gst_number || '—' },
            { label:'Client Since', value: dayjs(client.created_at).format('D MMMM YYYY') },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>{f.label}</div>
              <div style={{ fontSize:14, fontWeight:500 }}>{f.value}</div>
            </div>
          ))}
        </div>
        {client.notes && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--text-4)', marginBottom:6 }}>NOTES</div>
            <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>{client.notes}</div>
          </div>
        )}
      </Section>

      {/* Modals */}
      <AnimatePresence>
        {payModal && (
          <PaymentModal
            key="pay-modal"
            clientId={id}
            payment={payModal === 'add' ? null : payModal}
            onClose={() => setPayModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
