// KALA IS ART - Clients Page
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { clientsAPI } from '../../services/api'
import { Plus, Phone, Mail, MapPin, Search, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'

function ClientModal({ client, onClose, onSuccess }) {
  const isEdit = !!client
  const { register, handleSubmit, reset } = useForm({ defaultValues: client || {} })
  const mutation = useMutation({
    mutationFn: (d) => isEdit ? clientsAPI.update(client.id, d) : clientsAPI.create(d),
    onSuccess: () => { toast.success(isEdit ? 'Client updated' : 'Client created'); onSuccess() },
    onError: () => toast.error('Failed to save client'),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540 }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,175,55,0.12)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--cream-100)' }}>
            {isEdit ? 'Edit Client' : 'Add Client'}
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label className="input-label">Name *</label><input {...register('name', { required: true })} className="input-field" placeholder="Client name" /></div>
            <div><label className="input-label">Mobile *</label><input {...register('mobile', { required: true })} className="input-field" placeholder="Mobile" /></div>
          </div>
          <div><label className="input-label">Email</label><input {...register('email')} type="email" className="input-field" placeholder="Email" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label className="input-label">City</label><input {...register('city')} className="input-field" placeholder="City" /></div>
            <div><label className="input-label">Area</label><input {...register('area')} className="input-field" placeholder="Area" /></div>
          </div>
          <div><label className="input-label">Address</label><input {...register('address')} className="input-field" placeholder="Full address" /></div>
          <div><label className="input-label">GST Number</label><input {...register('gst_number')} className="input-field" placeholder="GSTIN (optional)" /></div>
          <div><label className="input-label">Notes</label><textarea {...register('notes')} className="input-field" rows={3} placeholder="Notes" /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-gold" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create Client'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsAPI.getAll().then((r) => r.data.data),
  })

  const clients = (data || []).filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile?.includes(search)
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} active clients</p>
        </div>
        <button onClick={() => { setEditClient(null); setModalOpen(true) }} className="btn-gold">
          <Plus size={15} /> Add Client
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(212,175,55,0.4)' }} />
        <input
          placeholder="Search clients..."
          className="input-field"
          style={{ paddingLeft: 36 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(232,224,208,0.2)' }}>
          <FolderOpen size={48} style={{ margin: '0 auto 16px' }} />
          <p>No clients yet. Convert leads or add manually.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {clients.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card"
              style={{ padding: 20, cursor: 'pointer' }}
              onClick={() => navigate(`/clients/${c.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                  border: '1px solid rgba(212,175,55,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: 'var(--gold-400)',
                }}>
                  {c.name[0]?.toUpperCase()}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)' }}>{c.client_number}</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.3)', marginTop: 2 }}>
                    {c.project_count || 0} project{c.project_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream-100)', marginBottom: 10 }}>{c.name}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {c.mobile && <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)', display: 'flex', gap: 7, alignItems: 'center' }}><Phone size={11} />{c.mobile}</div>}
                {c.email && <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)', display: 'flex', gap: 7, alignItems: 'center' }}><Mail size={11} />{c.email}</div>}
                {c.city && <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)', display: 'flex', gap: 7, alignItems: 'center' }}><MapPin size={11} />{c.city}{c.area ? `, ${c.area}` : ''}</div>}
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/clients/${c.id}/folder`)}
                  className="btn-gold"
                  style={{ fontSize: 12, padding: '6px 12px', flex: 1, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
                >
                  📂 Open Folder
                </button>
                <button
                  onClick={() => { setEditClient(c); setModalOpen(true) }}
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px' }}
                >
                  Edit
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <ClientModal
            client={editClient}
            onClose={() => { setModalOpen(false); setEditClient(null) }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['clients'] })
              setModalOpen(false)
              setEditClient(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
