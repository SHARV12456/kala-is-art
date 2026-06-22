import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, RefreshCw, Key, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api' // assuming default api export

export default function IndiaMartPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ api_key: '', is_active: false, sync_frequency: 'hourly' })

  const { data: configData, isLoading } = useQuery({
    queryKey: ['indiamart_config'],
    queryFn: () => api.get('/integrations/indiamart').then(r => r.data.data),
  })

  useEffect(() => {
    if (configData) {
      setForm({
        api_key: configData.config?.api_key || '',
        is_active: configData.is_active || false,
        sync_frequency: configData.config?.sync_frequency || 'hourly',
      })
    }
  }, [configData])

  const saveMutation = useMutation({
    mutationFn: (data) => api.post('/integrations/indiamart', data),
    onSuccess: () => {
      toast.success('Settings saved securely')
      qc.invalidateQueries({ queryKey: ['indiamart_config'] })
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/integrations/indiamart/sync'),
    onSuccess: (res) => {
      toast.success(res.data.message)
      qc.invalidateQueries({ queryKey: ['indiamart_config'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Sync failed'),
  })

  if (isLoading) return <div className="skeleton" style={{ height: 400 }} />

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">IndiaMART Integration</h1>
        <p className="page-subtitle">Automatically import leads from your IndiaMART CRM account.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 24 }}>
          <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Enable Auto-Sync</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>Automatically fetch leads in the background</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Key size={14}/> CRM API Key *</label>
            <input 
              className="form-input" 
              type="password" 
              placeholder="glusr_crm_key_..." 
              value={form.api_key} 
              onChange={e => setForm({ ...form, api_key: e.target.value })} 
            />
            <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 6 }}>Found in your IndiaMART Seller Panel under CRM Settings.</p>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14}/> Sync Frequency</label>
            <select className="form-input" value={form.sync_frequency} onChange={e => setForm({ ...form, sync_frequency: e.target.value })}>
              <option value="15min">Every 15 Minutes</option>
              <option value="30min">Every 30 Minutes</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              <Save size={14}/> {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
            <button className="btn btn-secondary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !form.api_key}>
              <RefreshCw size={14} className={syncMutation.isPending ? 'spin' : ''}/> Force Sync Now
            </button>
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ padding: 24 }}>
          <div className="section-label">Sync Status</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Last Sync Time</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                {configData?.last_sync_at ? new Date(configData.last_sync_at).toLocaleString() : 'Never'}
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {configData?.sync_status === 'success' ? (
                  <><CheckCircle2 size={16} color="var(--success)"/> <span style={{ color: 'var(--success)', fontWeight: 500 }}>Healthy</span></>
                ) : configData?.sync_status === 'error' ? (
                  <><AlertCircle size={16} color="var(--danger)"/> <span style={{ color: 'var(--danger)', fontWeight: 500 }}>Failed</span></>
                ) : (
                  <span style={{ color: 'var(--text-3)' }}>Not synced</span>
                )}
              </div>
            </div>

            {configData?.error_log && (
              <div style={{ padding: 12, background: 'var(--danger-bg)', borderRadius: 6, color: 'var(--danger)', fontSize: 12 }}>
                <strong>Last Error:</strong><br/>
                {configData.error_log}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
