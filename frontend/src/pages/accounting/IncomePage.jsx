// KALA IS ART - Income Page
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { incomeAPI } from '../../services/api'
import { Plus, Trash2, Edit2, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CATEGORIES = ['consultation', 'design', 'project', 'art_sales', 'custom_orders', 'other']
const CAT_COLORS = { consultation: '#d4af37', design: '#60a5fa', project: '#34d399', art_sales: '#f472b6', custom_orders: '#a78bfa', other: '#9ca3af' }

function IncomeModal({ income, onClose, onSuccess }) {
  const isEdit = !!income
  const [form, setForm] = useState(income || {
    category: 'consultation', title: '', description: '', amount: '',
    income_date: dayjs().format('YYYY-MM-DD'), payment_method: 'bank_transfer',
    invoice_number: '', is_gst_applicable: false, gst_amount: 0,
  })
  const mutation = useMutation({
    mutationFn: (d) => isEdit ? incomeAPI.update(income.id, d) : incomeAPI.create(d),
    onSuccess: () => { toast.success(isEdit ? 'Income updated' : 'Income recorded'); onSuccess() },
    onError: () => toast.error('Failed to save income'),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-content" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,175,55,0.12)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--cream-100)' }}>{isEdit ? 'Edit Income' : 'Record Income'}</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>✕</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Income description" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="input-label">Date</label>
              <input type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} className="input-field" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Payment Method</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input-field">
                {['cash', 'card', 'upi', 'bank_transfer', 'cheque'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Invoice No.</label>
              <input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="input-field" placeholder="INV-001" />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_gst_applicable} onChange={(e) => setForm({ ...form, is_gst_applicable: e.target.checked })} style={{ accentColor: 'var(--gold-400)', width: 14, height: 14 }} />
            <span style={{ fontSize: 13, color: 'rgba(232,224,208,0.6)' }}>GST Applicable</span>
          </label>
          {form.is_gst_applicable && (
            <div>
              <label className="input-label">GST Amount (₹)</label>
              <input type="number" value={form.gst_amount} onChange={(e) => setForm({ ...form, gst_amount: e.target.value })} className="input-field" min="0" />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-outline">Cancel</button>
            <button onClick={() => mutation.mutate(form)} className="btn-gold" disabled={mutation.isPending || !form.title || !form.amount}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Record Income'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function IncomePage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['income', { dateFrom, dateTo }],
    queryFn: () => incomeAPI.getAll({ ...(dateFrom && { date_from: dateFrom }), ...(dateTo && { date_to: dateTo }) }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => incomeAPI.delete(id),
    onSuccess: () => { toast.success('Income record deleted'); queryClient.invalidateQueries({ queryKey: ['income'] }) },
  })

  const incomes = data?.data || []
  const summary = data?.summary || []
  const totalIncome = incomes.reduce((s, i) => s + parseFloat(i.amount), 0)

  const pieData = summary.map((s) => ({ name: s.category.replace('_', ' '), value: parseFloat(s.total), color: CAT_COLORS[s.category] || '#9ca3af' }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">Track all revenue streams</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-gold">
          <Plus size={15} /> Record Income
        </button>
      </div>

      {/* Total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, color: 'rgba(232,224,208,0.4)', marginBottom: 8 }}>Total Income</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: '#4ade80' }}>
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 20 }}>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ background: '#1a1207', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Legend formatter={(v) => <span style={{ fontSize: 11, color: 'rgba(232,224,208,0.5)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'rgba(232,224,208,0.2)', fontSize: 13 }}>No data yet</div>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" style={{ width: 'auto' }} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" style={{ width: 'auto' }} />
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo('') }} className="btn-ghost" style={{ fontSize: 12 }}>Clear</button>}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />)}</div>
        ) : incomes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(232,224,208,0.2)' }}>
            <TrendingUp size={40} style={{ margin: '0 auto 12px' }} />
            <p>No income recorded yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Title</th><th>Category</th><th>Method</th><th>Invoice</th><th>GST</th><th>Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {incomes.map((inc, i) => (
                <motion.tr key={inc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td style={{ fontSize: 12 }}>{dayjs(inc.income_date).format('MMM D, YYYY')}</td>
                  <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream-100)' }}>{inc.title}</td>
                  <td>
                    <span className="badge" style={{ background: `${CAT_COLORS[inc.category]}15`, color: CAT_COLORS[inc.category], border: `1px solid ${CAT_COLORS[inc.category]}30` }}>
                      {inc.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)', textTransform: 'capitalize' }}>{inc.payment_method.replace('_', ' ')}</td>
                  <td style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)' }}>{inc.invoice_number || '—'}</td>
                  <td style={{ fontSize: 12 }}>{inc.is_gst_applicable ? `₹${Number(inc.gst_amount).toLocaleString('en-IN')}` : '—'}</td>
                  <td style={{ fontWeight: 700, color: '#4ade80', fontSize: 14 }}>₹{Number(inc.amount).toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditing(inc); setModalOpen(true) }} className="btn-ghost" style={{ padding: 7 }}><Edit2 size={13} /></button>
                      <button onClick={() => { if (window.confirm('Delete?')) deleteMutation.mutate(inc.id) }} className="btn-ghost" style={{ padding: 7, color: 'rgba(239,68,68,0.6)' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <IncomeModal
            income={editing}
            onClose={() => { setModalOpen(false); setEditing(null) }}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['income'] }); setModalOpen(false); setEditing(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
