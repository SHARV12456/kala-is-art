import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

const SOURCES  = ['website','instagram','facebook','referral','walk_in','google','whatsapp','exhibition','other']
const STATUSES = ['new_lead','contacted','interested','follow_up','proposal_sent','negotiation','won','lost','not_interested']
const CITIES   = ['Mumbai','Navi Mumbai','Thane','Pune','Bangalore','Delhi','Other']

export default function LeadModal({ lead, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!lead

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name:'', mobile:'', email:'', location:'', city:'', area:'',
      budget_min:'', budget_max:'', project_type:'', lead_source:'instagram',
      status:'new_lead', notes:'', next_followup_date:'', priority:'medium',
    },
  })

  useEffect(() => {
    if (lead) reset({
      ...lead,
      budget_min: lead.budget_min?.toString() || '',
      budget_max: lead.budget_max?.toString() || '',
      next_followup_date: lead.next_followup_date?.split('T')[0] || '',
    })
  }, [lead, reset])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? leadsAPI.update(lead.id, data) : leadsAPI.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Lead updated' : 'Lead created!')
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save lead'),
  })

  const onSubmit = (values) => mutation.mutate({
    ...values,
    budget_min: values.budget_min ? parseFloat(values.budget_min) : null,
    budget_max: values.budget_max ? parseFloat(values.budget_max) : null,
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal"
        initial={{ opacity:0, scale:0.96, y:12 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.96 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEdit ? 'Edit Lead' : 'Add New Lead'}</div>
            <div style={{ fontSize:12.5, color:'var(--text-3)', marginTop:2 }}>
              {isEdit ? `Editing ${lead.lead_number}` : 'Fill in the lead information below'}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Name + Mobile */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input {...register('name',{required:'Name is required'})} className="form-input" placeholder="Client name"/>
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Mobile *</label>
                <input {...register('mobile',{required:'Mobile is required',minLength:{value:10,message:'Min 10 digits'}})} className="form-input" placeholder="10-digit number"/>
                {errors.mobile && <span className="form-error">{errors.mobile.message}</span>}
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input {...register('email')} type="email" className="form-input" placeholder="Email address (optional)"/>
            </div>

            {/* City + Area + Location */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <select {...register('city')} className="form-input">
                  <option value="">Select City</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Area</label>
                <input {...register('area')} className="form-input" placeholder="Area/locality"/>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input {...register('location')} className="form-input" placeholder="Full address"/>
              </div>
            </div>

            {/* Budget */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Budget Min (₹)</label>
                <input {...register('budget_min')} type="number" className="form-input" placeholder="e.g. 50000"/>
              </div>
              <div className="form-group">
                <label className="form-label">Budget Max (₹)</label>
                <input {...register('budget_max')} type="number" className="form-input" placeholder="e.g. 200000"/>
              </div>
            </div>

            {/* Status + Source + Priority */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select {...register('status')} className="form-input">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select {...register('lead_source')} className="form-input">
                  {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select {...register('priority')} className="form-input">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Project Type + Follow-up Date */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Project Type</label>
                <input {...register('project_type')} className="form-input" placeholder="e.g. Wall Art, Custom Painting"/>
              </div>
              <div className="form-group">
                <label className="form-label">Next Follow-up Date</label>
                <input {...register('next_followup_date')} type="date" className="form-input"/>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea {...register('notes')} className="form-input" placeholder="Additional notes…" rows={3}/>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
