import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientPaymentsAPI } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, X, Check, IndianRupee, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const fmt = (n) => {
  if (!n || n === 0) return '₹0'
  return `₹${Number(n).toLocaleString('en-IN')}`
}

const METHOD_CONFIG = {
  cash:          { label: 'Cash',          emoji: '💵', color: '#10B981' },
  upi:           { label: 'UPI',           emoji: '📱', color: '#6366F1' },
  bank_transfer: { label: 'Bank Transfer', emoji: '🏦', color: '#0EA5E9' },
  cheque:        { label: 'Cheque',        emoji: '📋', color: '#8B5CF6' },
  card:          { label: 'Card',          emoji: '💳', color: '#F59E0B' },
  other:         { label: 'Other',         emoji: '💰', color: '#6B7280' },
}

const STATUS_CONFIG = {
  received: { label: 'Received', color: '#10B981', bg: '#ECFDF5' },
  pending:  { label: 'Pending',  color: '#F59E0B', bg: '#FFFBEB' },
  partial:  { label: 'Partial',  color: '#6366F1', bg: '#EEF2FF' },
  cancelled:{ label: 'Cancelled',color: '#EF4444', bg: '#FEF2F2' },
}

// ─── ADD / EDIT PAYMENT MODAL ─────────────────────────────────
function PaymentModal({ clientId, payment, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount:           payment?.amount       || '',
    payment_date:     payment?.payment_date?.split('T')[0] || dayjs().format('YYYY-MM-DD'),
    payment_method:   payment?.payment_method || 'cash',
    reference_number: payment?.reference_number || '',
    milestone:        payment?.milestone    || '',
    notes:            payment?.notes        || '',
    status:           payment?.status       || 'received',
  })

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => payment
      ? clientPaymentsAPI.update(clientId, payment.id, form)
      : clientPaymentsAPI.add(clientId, form),
    onSuccess: () => {
      toast.success(payment ? 'Payment updated' : `₹${Number(form.amount).toLocaleString('en-IN')} recorded!`)
      qc.invalidateQueries({ queryKey: ['client-payments', clientId] })
      onSuccess?.()
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save'),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 480 }}
        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight:700, fontSize:16 }}>
            {payment ? '✏️ Edit Payment' : '💰 Record Payment'}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
        </div>

        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Amount + Date row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Amount Received (₹) *</label>
              <input className="form-input" type="number" placeholder="e.g. 50000"
                value={form.amount} onChange={e => set('amount', e.target.value)} min="0" step="0.01"/>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input className="form-input" type="date"
                value={form.payment_date} onChange={e => set('payment_date', e.target.value)}/>
            </div>
          </div>

          {/* Milestone */}
          <div className="form-group">
            <label className="form-label">Milestone / Label</label>
            <input className="form-input" placeholder="e.g. Advance, 50% Progress, Final Payment"
              value={form.milestone} onChange={e => set('milestone', e.target.value)}/>
          </div>

          {/* Method */}
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {Object.entries(METHOD_CONFIG).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set('payment_method', k)}
                  style={{ padding:'8px 14px', borderRadius:10, border:`2px solid ${form.payment_method===k ? v.color : 'var(--border)'}`,
                    background: form.payment_method===k ? `${v.color}15` : 'var(--surface)',
                    cursor:'pointer', fontSize:13, fontWeight: form.payment_method===k ? 700 : 400,
                    display:'flex', alignItems:'center', gap:6 }}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div className="form-group">
            <label className="form-label">
              {form.payment_method === 'upi' ? 'UPI Transaction ID' :
               form.payment_method === 'cheque' ? 'Cheque Number' :
               form.payment_method === 'bank_transfer' ? 'Transaction / NEFT Reference' : 'Reference Number'}
            </label>
            <input className="form-input" placeholder="Optional reference / transaction ID"
              value={form.reference_number} onChange={e => set('reference_number', e.target.value)}/>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="received">✅ Received</option>
              <option value="pending">⏳ Pending</option>
              <option value="partial">🔶 Partial</option>
              <option value="cancelled">❌ Cancelled</option>
            </select>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} placeholder="Any additional notes…"
              value={form.notes} onChange={e => set('notes', e.target.value)}/>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()}
            disabled={!form.amount || !form.payment_date || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : payment ? '✅ Update Payment' : '💰 Save Payment'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── PROJECT VALUE EDITOR ─────────────────────────────────────
function ProjectValueEditor({ clientId, currentValue, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(currentValue || '')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => clientPaymentsAPI.setProjectValue(clientId, val),
    onSuccess: () => {
      toast.success('Project value updated')
      qc.invalidateQueries({ queryKey: ['client-payments', clientId] })
      setEditing(false)
      onUpdate?.()
    },
  })

  if (!editing) return (
    <button onClick={() => setEditing(true)}
      style={{ background:'none', border:'none', cursor:'pointer', padding:0,
        display:'flex', alignItems:'center', gap:4, color:'var(--accent)', fontSize:13 }}>
      <Edit2 size={12}/> {currentValue ? fmt(currentValue) : 'Set project value'}
    </button>
  )

  return (
    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
      <input type="number" className="form-input" value={val} onChange={e => setVal(e.target.value)}
        placeholder="Total project value" style={{ width:160, padding:'4px 8px', fontSize:13 }} autoFocus/>
      <button className="btn btn-primary btn-sm" onClick={() => mutation.mutate()} disabled={!val}>
        <Check size={13}/>
      </button>
      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
        <X size={13}/>
      </button>
    </div>
  )
}

// ─── MAIN PAYMENT DETAILS COMPONENT ──────────────────────────
export default function ClientPayments({ clientId }) {
  const [showModal, setShowModal] = useState(false)
  const [editPayment, setEditPayment]   = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: () => clientPaymentsAPI.getAll(clientId).then(r => r.data.data),
    enabled: !!clientId,
  })

  const deleteMutation = useMutation({
    mutationFn: (payId) => clientPaymentsAPI.delete(clientId, payId),
    onSuccess: () => { toast.success('Payment deleted'); qc.invalidateQueries({ queryKey: ['client-payments', clientId] }) },
  })

  const client   = data?.client || {}
  const payments = data?.payments || []
  const summary  = data?.summary || {}

  const pctPaid    = summary.percent_paid || 0
  const barColor   = pctPaid >= 100 ? '#10B981' : pctPaid >= 60 ? '#6366F1' : pctPaid >= 30 ? '#F59E0B' : '#EF4444'

  if (isLoading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:60, borderRadius:10 }}/>)}
    </div>
  )

  return (
    <div>
      {/* ── PAYMENT SUMMARY ── */}
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>💰 Project Payments</div>
            <div style={{ fontSize:12, color:'var(--text-3)', display:'flex', alignItems:'center', gap:6 }}>
              Total Value:
              <ProjectValueEditor clientId={clientId} currentValue={client.total_project_value}/>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={13}/> Add Payment
          </button>
        </div>

        {/* Progress bar */}
        {summary.project_value > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)', marginBottom:6 }}>
              <span>{pctPaid}% collected</span>
              <span>{fmt(summary.total_received)} / {fmt(summary.project_value)}</span>
            </div>
            <div style={{ height:8, background:'var(--surface-2)', borderRadius:8, overflow:'hidden' }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100,pctPaid)}%` }}
                transition={{ duration:0.8, ease:'easeOut' }}
                style={{ height:'100%', background:barColor, borderRadius:8 }}/>
            </div>
          </div>
        )}

        {/* 3 summary numbers */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          <div style={{ padding:'12px 14px', background:'#ECFDF5', borderRadius:10, textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#10B981' }}>{fmt(summary.total_received)}</div>
            <div style={{ fontSize:11, color:'#166534', marginTop:2 }}>✅ Received</div>
          </div>
          <div style={{ padding:'12px 14px', background:'#FFFBEB', borderRadius:10, textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#D97706' }}>{fmt(summary.outstanding)}</div>
            <div style={{ fontSize:11, color:'#92400E', marginTop:2 }}>⏳ Outstanding</div>
          </div>
          <div style={{ padding:'12px 14px', background:'#EEF2FF', borderRadius:10, textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#6366F1' }}>{summary.payment_count || 0}</div>
            <div style={{ fontSize:11, color:'#3730A3', marginTop:2 }}>💳 Transactions</div>
          </div>
        </div>

        {/* Outstanding alert */}
        {summary.outstanding > 0 && (
          <div style={{ marginTop:12, padding:'10px 14px', background:'#FEF9C3', borderRadius:8,
            display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <AlertCircle size={14} color="#CA8A04"/>
            <span style={{ color:'#713F12' }}>
              <strong>{fmt(summary.outstanding)}</strong> is still outstanding from this client
            </span>
          </div>
        )}
      </div>

      {/* ── PAYMENT HISTORY ── */}
      <div style={{ fontWeight:700, fontSize:13, color:'var(--text-3)', textTransform:'uppercase',
        letterSpacing:1, marginBottom:10 }}>
        Payment History
      </div>

      {payments.length === 0 ? (
        <div className="card" style={{ padding:'32px 0', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>💳</div>
          <div style={{ fontWeight:600, color:'var(--text-2)' }}>No payments recorded yet</div>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Click "Add Payment" to record the first payment</div>
          <button className="btn btn-primary" style={{ marginTop:14 }} onClick={() => setShowModal(true)}>
            <Plus size={14}/> Record First Payment
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                  const method = METHOD_CONFIG[p.payment_method] || METHOD_CONFIG.other
                  const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.received
                  return (
                    <motion.tr key={p.id} layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.03 }}
                      style={{ borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)', fontSize: 13 }}>
                      
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                          {dayjs(p.payment_date).format('DD MMM YYYY')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          {method.emoji} {method.label}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>
                          {p.milestone || 'General Payment'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, display:'flex', flexDirection:'column', gap:2 }}>
                          <span>{p.reference_number ? `Ref: ${p.reference_number}` : 'No Ref'}</span>
                          {p.project_name && <span>🏗️ {p.project_name}</span>}
                          {p.notes && <span style={{ fontStyle:'italic' }}>"{p.notes}"</span>}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 700, color: status.color, fontSize: 15 }}>
                        {fmt(p.amount)}
                      </td>

                      <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600, color: status.color, background: status.bg }}>
                          {status.label}
                        </span>
                      </td>

                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditPayment(p)}>
                            <Edit2 size={13}/>
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#EF4444' }}
                            onClick={() => { if(window.confirm('Delete this payment?')) deleteMutation.mutate(p.id) }}>
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

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <PaymentModal key="add" clientId={clientId} onClose={() => setShowModal(false)}/>
        )}
        {editPayment && (
          <PaymentModal key="edit" clientId={clientId} payment={editPayment} onClose={() => setEditPayment(null)}/>
        )}
      </AnimatePresence>
    </div>
  )
}
