import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionAPI } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, CreditCard, Clock, AlertTriangle, ShieldCheck, UserCheck, Settings, Bell, X, Activity } from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

export default function AdminSubscriptionsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [paymentModal, setPaymentModal] = useState(null)
  
  const { data: dashData, isLoading: loadDash } = useQuery({
    queryKey: ['admin-subs-dashboard'],
    queryFn: () => subscriptionAPI.adminGetDashboard().then(r => r.data.data)
  })

  const { data: custData, isLoading: loadCust } = useQuery({
    queryKey: ['admin-subs-customers'],
    queryFn: () => subscriptionAPI.adminGetCustomers().then(r => r.data.data)
  })

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => subscriptionAPI.getPlans().then(r => r.data.data)
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status, addDays }) => subscriptionAPI.adminUpdateStatus(id, { status, addDays }),
    onSuccess: () => {
      toast.success('Subscription updated')
      qc.invalidateQueries({ queryKey: ['admin-subs-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin-subs-customers'] })
    }
  })

  const customers = (custData || []).filter(c => 
    c.owner_name?.toLowerCase().includes(search.toLowerCase()) || 
    c.business_name?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = dashData || { activeAccounts: 0, expiredAccounts: 0, upcomingRenewals: [], revenue: { monthly_revenue: 0, quarterly_revenue: 0, yearly_revenue: 0 } }

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  return (
    <div style={{ padding: '30px', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* ─── PAGE HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--cream-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={28} color="var(--accent)" />
            Subscription Control Center
          </h1>
          <p style={{ color: 'var(--text-3)', marginTop: 4 }}>Manage multi-tenant subscriptions, payments, and account access manually.</p>
        </div>
      </div>

      {/* ─── DASHBOARD STATS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 30 }}>
        <StatCard title="Active CRM Accounts" value={stats.activeAccounts} icon={<UserCheck color="#10B981" />} />
        <StatCard title="Expired Accounts" value={stats.expiredAccounts} icon={<AlertTriangle color="#EF4444" />} />
        <StatCard title="Monthly Revenue" value={fmt(stats.revenue.monthly_revenue)} icon={<CreditCard color="var(--accent)" />} />
        <StatCard title="Yearly Revenue" value={fmt(stats.revenue.yearly_revenue)} icon={<Activity color="#6366F1" />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        
        {/* ─── CUSTOMER DATABASE ─── */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Customer Directory</h2>
            <div style={{ position: 'relative', width: 250 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-4)' }} />
              <input className="input-field" placeholder="Search customers..." 
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34, height: 34, fontSize: 13 }} />
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <th style={{ padding: '12px 8px' }}>Customer</th>
                <th style={{ padding: '12px 8px' }}>Plan & Status</th>
                <th style={{ padding: '12px 8px' }}>Validity</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Controls</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.owner_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{c.business_name}</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{c.plan_name || 'No Plan'}</div>
                    <div style={{ fontSize: 11, color: c.status === 'active' ? '#10B981' : '#EF4444' }}>
                      {c.status ? c.status.toUpperCase() : 'NO SUBSCRIPTION'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-3)' }}>
                    {c.ends_at ? dayjs(c.ends_at).format('DD MMM YYYY') : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPaymentModal(c)}
                      style={{ fontSize: 11, padding: '4px 10px' }}>
                      <Plus size={12}/> Record Payment
                    </button>
                    {c.subscription_id && c.status === 'active' && (
                      <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444', marginLeft: 6, padding: '4px 8px' }}
                        onClick={() => { if(window.confirm('Suspend this subscription?')) updateStatus.mutate({ id: c.subscription_id, status: 'suspended' }) }}>
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-4)' }}>No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── UPCOMING RENEWALS ─── */}
        <div>
          <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="var(--accent)" /> Expiring Next 7 Days
            </h2>
            {stats.upcomingRenewals.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', padding: '20px 0' }}>
                No immediate renewals due.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.upcomingRenewals.map(r => (
                  <div key={r.id} style={{ background: 'var(--surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{r.owner_name} ({r.business_name})</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                      Expires on {dayjs(r.ends_at).format('DD MMM YYYY')}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 10, justifyContent: 'center', color: 'var(--accent)' }}
                      onClick={() => window.open('https://wa.me/' + r.mobile + '?text=Hello ' + r.owner_name + ', your Kala Is Art CRM subscription will expire on ' + dayjs(r.ends_at).format('DD MMM') + '. Please contact us for renewal to continue uninterrupted access. Thank you.')}>
                      Send Reminder via WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── PAYMENT MODAL ─── */}
      <AnimatePresence>
        {paymentModal && (
          <RecordPaymentModal 
            customer={paymentModal} 
            plans={plansData || []} 
            onClose={() => setPaymentModal(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ title, value, icon }) {
  return (
    <div className="glass-panel" style={{ padding: 20, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{value}</div>
      </div>
    </div>
  )
}

function RecordPaymentModal({ customer, plans, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    planId: plans[0]?.id || '',
    amount: plans[0]?.price || '',
    paymentMethod: 'upi',
    referenceNumber: '',
    notes: '',
    customDays: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const mutate = useMutation({
    mutationFn: () => subscriptionAPI.adminRecordPayment({ ...form, userId: customer.id }),
    onSuccess: () => {
      toast.success('Subscription activated')
      qc.invalidateQueries({ queryKey: ['admin-subs-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin-subs-customers'] })
      onClose()
    }
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 450 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: 16 }}>💰 Record Subscription Payment</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Activating subscription for <strong>{customer.owner_name}</strong> ({customer.business_name})
          </div>

          <div className="form-group">
            <label className="form-label">Select Plan</label>
            <select className="form-input" value={form.planId} onChange={e => {
              const p = plans.find(x => x.id === e.target.value)
              setForm(f => ({ ...f, planId: p.id, amount: p.price, customDays: '' }))
            }}>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Amount Collected (₹)</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-input" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reference Number / UTR</label>
            <input className="form-input" value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Custom Duration (Days) - Optional</label>
            <input className="form-input" type="number" placeholder="Leave empty for default plan duration" value={form.customDays} onChange={e => set('customDays', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Admin Notes</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutate.mutate()} disabled={mutate.isPending || !form.amount}>
            {mutate.isPending ? 'Processing...' : 'Activate Subscription'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
