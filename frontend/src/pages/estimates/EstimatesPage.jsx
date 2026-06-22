// KALA IS ART - Estimates Page
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { estimatesAPI } from '../../services/api'
import { downloadPDFNative } from '../../utils/downloadPDF'
import { Plus, FileText, Download, Edit2, Trash2, Search } from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  draft: 'badge-gray', sent: 'badge-blue', accepted: 'badge-green',
  rejected: 'badge-red', expired: 'badge-orange',
}

const formatINR = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`

export default function EstimatesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['estimates', { search, status }],
    queryFn: () => estimatesAPI.getAll({ search: search || undefined, status: status !== 'all' ? status : undefined })
      .then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => estimatesAPI.delete(id),
    onSuccess: () => { toast.success('Estimate deleted'); queryClient.invalidateQueries({ queryKey: ['estimates'] }) },
  })

  const handleDownload = async (id, number) => {
    try {
      // Pass estimate ID — downloadPDFNative uses Axios which handles token refresh
      await downloadPDFNative(id, `Estimate-${number}.pdf`, toast)
    } catch { /* error shown via toast inside utility */ }
  }

  const estimates = data?.data || []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estimates</h1>
          <p className="page-subtitle">Create luxury estimates for your clients</p>
        </div>
        <button onClick={() => navigate('/estimates/new')} className="btn-gold">
          <Plus size={15} /> New Estimate
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(212,175,55,0.4)' }} />
          <input placeholder="Search estimates..." className="input-field" style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 12 }} />)}
        </div>
      ) : estimates.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(232,224,208,0.2)' }}>
          <FileText size={48} style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: 16 }}>No estimates yet</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Create your first luxury estimate</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Estimate #</th>
                <th>Client</th>
                <th>Project</th>
                <th>Date</th>
                <th>Subtotal</th>
                <th>GST</th>
                <th>Grand Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((est, i) => (
                <motion.tr key={est.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-400)' }}>{est.estimate_number}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)', marginTop: 2 }}>
                      Valid till {est.valid_until ? dayjs(est.valid_until).format('MMM D') : '—'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, color: 'var(--cream-100)' }}>{est.client_name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)' }}>{est.client_mobile}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{est.project_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)' }}>{dayjs(est.created_at).format('MMM D, YYYY')}</td>
                  <td style={{ fontSize: 13 }}>{formatINR(est.subtotal)}</td>
                  <td style={{ fontSize: 13, color: 'rgba(232,224,208,0.5)' }}>{formatINR(est.gst_amount)}</td>
                  <td>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-400)' }}>{formatINR(est.grand_total)}</span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[est.status] || 'badge-gray'}`}>{est.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => navigate(`/estimates/${est.id}/edit`)} className="btn-ghost" style={{ padding: 7 }} title="Edit"><Edit2 size={13} /></button>
                      <button onClick={() => handleDownload(est.id, est.estimate_number)} className="btn-ghost" style={{ padding: 7, color: 'var(--gold-400)' }} title="Download PDF"><Download size={13} /></button>
                      <button
                        onClick={() => { if (window.confirm('Delete this estimate?')) deleteMutation.mutate(est.id) }}
                        className="btn-ghost"
                        style={{ padding: 7, color: 'rgba(239,68,68,0.6)' }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
