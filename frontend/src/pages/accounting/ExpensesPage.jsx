// KALA IS ART - Expenses Page
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { expensesAPI } from '../../services/api'
import { Plus, Trash2, Edit2, TrendingDown, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const PERSONAL_CATS = ['food', 'travel', 'shopping', 'utilities', 'personal_investments', 'others']
const BUSINESS_CATS = ['rent', 'salaries', 'marketing', 'software', 'equipment', 'vendor_payments', 'office_expenses', 'transport', 'miscellaneous']
const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other']

function ExpenseModal({ expense, onClose, onSuccess }) {
  const isEdit = !!expense
  const [type, setType] = useState(expense?.type || 'business')
  const [form, setForm] = useState(expense || { category: '', title: '', description: '', amount: '', expense_date: dayjs().format('YYYY-MM-DD'), payment_method: 'upi', vendor_name: '' })
  const cats = type === 'personal' ? PERSONAL_CATS : BUSINESS_CATS

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? expensesAPI.update(expense.id, d) : expensesAPI.create(d),
    onSuccess: () => { toast.success(isEdit ? 'Expense updated' : 'Expense recorded'); onSuccess() },
    onError: () => toast.error('Failed to save expense'),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-content" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,175,55,0.12)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--cream-100)' }}>{isEdit ? 'Edit Expense' : 'Record Expense'}</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>✕</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['personal', 'business'].map((t) => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '10px', borderRadius: 10, border: `1px solid ${type === t ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.06)'}`,
                background: type === t ? 'rgba(212,175,55,0.1)' : 'transparent',
                color: type === t ? 'var(--gold-400)' : 'rgba(232,224,208,0.4)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="input-label">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
              <option value="">Select category</option>
              {cats.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Expense title" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="input-label">Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="input-field" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Payment Method</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input-field">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Vendor</label>
              <input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className="input-field" placeholder="Vendor name" />
            </div>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-outline">Cancel</button>
            <button onClick={() => mutation.mutate({ ...form, type })} className="btn-gold" disabled={mutation.isPending || !form.title || !form.amount || !form.category}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Record Expense'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filters, setFilters] = useState({ type: 'all', category: '', date_from: '', date_to: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expensesAPI.getAll({
      ...(filters.type !== 'all' && { type: filters.type }),
      ...(filters.category && { category: filters.category }),
      ...(filters.date_from && { date_from: filters.date_from }),
      ...(filters.date_to && { date_to: filters.date_to }),
    }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => expensesAPI.delete(id),
    onSuccess: () => { toast.success('Expense deleted'); queryClient.invalidateQueries({ queryKey: ['expenses'] }) },
  })

  const expenses = data?.data || []
  const summary = data?.summary || []

  // Chart data
  const chartData = summary.reduce((acc, s) => {
    const existing = acc.find((a) => a.category === s.category)
    if (existing) existing.amount += parseFloat(s.total)
    else acc.push({ category: s.category.replace('_', ' '), amount: parseFloat(s.total) })
    return acc
  }, []).sort((a, b) => b.amount - a.amount).slice(0, 8)

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track personal and business expenses</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-gold">
          <Plus size={15} /> Record Expense
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Expenses', value: `₹${totalExpenses.toLocaleString('en-IN')}`, color: '#f87171' },
          { label: 'Business', value: `₹${summary.filter((s) => s.type === 'business').reduce((a, s) => a + parseFloat(s.total), 0).toLocaleString('en-IN')}`, color: 'var(--gold-400)' },
          { label: 'Personal', value: `₹${summary.filter((s) => s.type === 'personal').reduce((a, s) => a + parseFloat(s.total), 0).toLocaleString('en-IN')}`, color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'rgba(232,224,208,0.4)', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: 'var(--cream-100)', marginBottom: 16 }}>Expense by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="category" tick={{ fill: 'rgba(232,224,208,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(232,224,208,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
              <Tooltip contentStyle={{ background: '#1a1207', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="amount" fill="rgba(212,175,55,0.7)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'personal', 'business'].map((t) => (
          <button key={t} onClick={() => setFilters({ ...filters, type: t })} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            border: `1px solid ${filters.type === t ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.06)'}`,
            background: filters.type === t ? 'rgba(212,175,55,0.1)' : 'transparent',
            color: filters.type === t ? 'var(--gold-400)' : 'rgba(232,224,208,0.4)',
            transition: 'all 0.15s',
          }}>{t === 'all' ? 'All Types' : t}</button>
        ))}
        <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="input-field" style={{ width: 'auto' }} />
        <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="input-field" style={{ width: 'auto' }} />
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />)}</div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(232,224,208,0.2)' }}>
            <TrendingDown size={40} style={{ margin: '0 auto 12px' }} />
            <p>No expenses recorded yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Title</th><th>Category</th><th>Type</th><th>Method</th><th>Vendor</th><th>Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td style={{ fontSize: 12 }}>{dayjs(e.expense_date).format('MMM D, YYYY')}</td>
                  <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream-100)' }}>{e.title}</td>
                  <td><span className="badge badge-gray">{e.category.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${e.type === 'business' ? 'badge-gold' : 'badge-purple'}`}>{e.type}</span></td>
                  <td style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)', textTransform: 'capitalize' }}>{e.payment_method.replace('_', ' ')}</td>
                  <td style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)' }}>{e.vendor_name || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#f87171', fontSize: 14 }}>₹{Number(e.amount).toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditing(e); setModalOpen(true) }} className="btn-ghost" style={{ padding: 7 }}><Edit2 size={13} /></button>
                      <button onClick={() => { if (window.confirm('Delete this expense?')) deleteMutation.mutate(e.id) }} className="btn-ghost" style={{ padding: 7, color: 'rgba(239,68,68,0.6)' }}><Trash2 size={13} /></button>
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
          <ExpenseModal
            expense={editing}
            onClose={() => { setModalOpen(false); setEditing(null) }}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setModalOpen(false); setEditing(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
