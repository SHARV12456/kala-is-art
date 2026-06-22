// KALA IS ART - Estimate Form Page (Create/Edit with Line Items)
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { estimatesAPI } from '../../services/api'
import { downloadPDFNative } from '../../utils/downloadPDF'
import { Plus, Trash2, ArrowLeft, Download, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const EMPTY_ITEM = { description: '', material_description: '', quantity: 1, unit: 'sq.ft', unit_rate: 0 }
const UNITS = ['sq.ft', 'sq.m', 'unit', 'nos', 'rft', 'kg', 'ltr', 'hrs', 'set', 'lot']

const formatINR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const F = ({ label, children, half }) => (
  <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
    <label className="input-label">{label}</label>
    {children}
  </div>
)

export default function EstimateFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    client_name: '', client_mobile: '', client_email: '', client_address: '',
    project_name: '', scope_of_work: '', valid_until: '', status: 'draft',
    gst_percentage: 18, discount_amount: 0, notes: '', 
    terms: '1. This estimate is valid for 15 days from the date of issue unless otherwise specified.\n2. Material selection, finishes, dimensions, and specifications are subject to final approval before order confirmation.\n3. Production, procurement, and execution timelines commence only after receipt of the agreed advance payment and final approvals.\n4. Any modifications, additions, or scope changes requested after approval may result in revised pricing and timelines.\n5. Natural variations in stone, wood, metal, fabric, artwork, and handcrafted materials are inherent characteristics and shall not be considered defects.\n6. Ownership of all designs, concepts, drawings, and creative work remains with Kala Is Art until full payment is received.\n7. Payment milestones shall be strictly adhered to as per the agreed commercial terms. Delays may impact project timelines.\n8. This estimate is confidential and intended solely for the named client and project.',
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  const { data: existingEstimate } = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => estimatesAPI.getOne(id).then((r) => r.data.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingEstimate) {
      setForm({
        client_name: existingEstimate.client_name || '',
        client_mobile: existingEstimate.client_mobile || '',
        client_email: existingEstimate.client_email || '',
        client_address: existingEstimate.client_address || '',
        project_name: existingEstimate.project_name || '',
        scope_of_work: existingEstimate.scope_of_work || '',
        valid_until: existingEstimate.valid_until?.split('T')[0] || '',
        status: existingEstimate.status || 'draft',
        gst_percentage: existingEstimate.gst_percentage || 18,
        discount_amount: existingEstimate.discount_amount || 0,
        notes: existingEstimate.notes || '',
        terms: existingEstimate.terms || '',
      })
      if (existingEstimate.items?.length) {
        setItems(existingEstimate.items.map((i) => ({
          description: i.description,
          material_description: i.material_description || '',
          quantity: i.quantity,
          unit: i.unit,
          unit_rate: i.unit_rate,
        })))
      }
    }
  }, [existingEstimate])

  // Calculations
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unit_rate || 0)), 0)
  const discountedSubtotal = subtotal - parseFloat(form.discount_amount || 0)
  const gstAmount = discountedSubtotal * (parseFloat(form.gst_percentage || 0) / 100)
  const grandTotal = discountedSubtotal + gstAmount

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleSave = async (downloadPDF = false) => {
    if (!form.client_name) return toast.error('Client name is required')
    setSaving(true)
    try {
      const payload = { ...form, items }
      let result
      if (isEdit) {
        result = await estimatesAPI.update(id, payload)
      } else {
        result = await estimatesAPI.create(payload)
      }
      toast.success(isEdit ? 'Estimate updated' : 'Estimate created')
      const estimateId = result.data.data.id

      if (downloadPDF) {
        try {
          await downloadPDFNative(
            estimateId,
            `Estimate-${result.data.data.estimate_number}.pdf`,
            toast
          )
        } catch { /* error shown via toast inside utility */ }
      }

      navigate('/estimates')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }



  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28 }}>
        <button onClick={() => navigate('/estimates')} className="btn-ghost" style={{ padding: 8 }}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--cream-100)' }}>
            {isEdit ? 'Edit Estimate' : 'New Estimate'}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(212,175,55,0.5)', marginTop: 2 }}>
            {isEdit ? existingEstimate?.estimate_number : 'Create a luxury estimate for your client'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={() => handleSave(false)} disabled={saving} className="btn-outline">
            <Save size={14} /> Save Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="btn-gold">
            <Download size={14} /> Save & Download PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Main form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Client info */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', letterSpacing: 1, marginBottom: 20 }}>CLIENT INFORMATION</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <F label="Client Name *" half>
                <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="input-field" placeholder="Client's full name" />
              </F>
              <F label="Mobile" half>
                <input value={form.client_mobile} onChange={(e) => setForm({ ...form, client_mobile: e.target.value })} className="input-field" placeholder="Mobile number" />
              </F>
              <F label="Email" half>
                <input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="input-field" type="email" placeholder="Email address" />
              </F>
              <F label="Valid Until" half>
                <input value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="input-field" type="date" />
              </F>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="input-label">Address</label>
                <input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="input-field" placeholder="Client address" />
              </div>
            </div>
          </div>

          {/* Project info */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', letterSpacing: 1, marginBottom: 20 }}>PROJECT DETAILS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Project Name</label>
                <input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className="input-field" placeholder="Project title" />
              </div>
              <div>
                <label className="input-label">Scope of Work</label>
                <textarea value={form.scope_of_work} onChange={(e) => setForm({ ...form, scope_of_work: e.target.value })} className="input-field" rows={3} placeholder="Describe the scope of work..." />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', letterSpacing: 1 }}>LINE ITEMS</h3>
              <button onClick={addItem} className="btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>
                <Plus size={13} /> Add Item
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
                    {['#', 'Description', 'Material', 'Qty', 'Unit', 'Rate (₹)', 'Amount', ''].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', fontSize: 10, color: 'rgba(212,175,55,0.5)', letterSpacing: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const amount = (parseFloat(item.quantity || 0) * parseFloat(item.unit_rate || 0))
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 10px', fontSize: 12, color: 'rgba(212,175,55,0.4)', width: 32 }}>{idx + 1}</td>
                        <td style={{ padding: '4px 6px', minWidth: 180 }}>
                          <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="input-field" style={{ fontSize: 12, padding: '7px 10px' }} placeholder="Item description" />
                        </td>
                        <td style={{ padding: '4px 6px', minWidth: 140 }}>
                          <input value={item.material_description} onChange={(e) => updateItem(idx, 'material_description', e.target.value)} className="input-field" style={{ fontSize: 12, padding: '7px 10px' }} placeholder="Material details" />
                        </td>
                        <td style={{ padding: '4px 6px', width: 70 }}>
                          <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="input-field" style={{ fontSize: 12, padding: '7px 8px' }} min="0" step="0.01" />
                        </td>
                        <td style={{ padding: '4px 6px', width: 80 }}>
                          <select value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className="input-field" style={{ fontSize: 12, padding: '7px 8px' }}>
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px', width: 110 }}>
                          <input type="number" value={item.unit_rate} onChange={(e) => updateItem(idx, 'unit_rate', e.target.value)} className="input-field" style={{ fontSize: 12, padding: '7px 8px' }} min="0" step="0.01" />
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600, color: 'var(--gold-400)', whiteSpace: 'nowrap' }}>
                          {formatINR(amount)}
                        </td>
                        <td style={{ padding: '4px 6px', width: 36 }}>
                          {items.length > 1 && (
                            <button onClick={() => removeItem(idx)} className="btn-ghost" style={{ padding: 6, color: 'rgba(239,68,68,0.6)' }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', letterSpacing: 1, marginBottom: 16 }}>NOTES & TERMS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Notes (Client-Facing)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={3} placeholder="Additional notes for the client..." />
              </div>
              <div>
                <label className="input-label">Terms & Conditions</label>
                <textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className="input-field" rows={4} />
              </div>
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <div>
          <div className="glass-panel" style={{ padding: 24, position: 'sticky', top: 88 }}>
            <h3 style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', letterSpacing: 1, marginBottom: 20 }}>SUMMARY</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(232,224,208,0.5)' }}>Subtotal</span>
                <span style={{ color: 'var(--cream-100)', fontWeight: 500 }}>{formatINR(subtotal)}</span>
              </div>

              <div>
                <label className="input-label">Discount (₹)</label>
                <input
                  type="number"
                  value={form.discount_amount}
                  onChange={(e) => setForm({ ...form, discount_amount: e.target.value })}
                  className="input-field"
                  min="0"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(232,224,208,0.5)' }}>After Discount</span>
                <span style={{ color: 'var(--cream-100)' }}>{formatINR(discountedSubtotal)}</span>
              </div>

              <div>
                <label className="input-label">GST %</label>
                <select
                  value={form.gst_percentage}
                  onChange={(e) => setForm({ ...form, gst_percentage: e.target.value })}
                  className="input-field"
                >
                  {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(232,224,208,0.5)' }}>GST ({form.gst_percentage}%)</span>
                <span style={{ color: 'var(--cream-100)' }}>{formatINR(gstAmount)}</span>
              </div>

              <div style={{ height: 1, background: 'rgba(212,175,55,0.2)', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--cream-100)' }}>Grand Total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold-400)', fontWeight: 700 }}>
                  {formatINR(grandTotal)}
                </span>
              </div>

              <div style={{ height: 1, background: 'rgba(212,175,55,0.1)', margin: '4px 0' }} />

              <div>
                <label className="input-label">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input-field"
                >
                  {['draft', 'sent', 'accepted', 'rejected', 'expired'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <button onClick={() => handleSave(true)} disabled={saving} className="btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                  <Download size={15} /> {saving ? 'Generating...' : 'Save & Download PDF'}
                </button>
                <button onClick={() => handleSave(false)} disabled={saving} className="btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                  <Save size={15} /> Save Only
                </button>
              </div>
            </div>

            {/* Brand preview badge */}
            <div style={{
              marginTop: 20,
              padding: '14px 16px',
              background: 'rgba(212,175,55,0.04)',
              border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-400)', letterSpacing: 3, marginBottom: 4 }}>KALA IS ART</div>
              <div style={{ fontSize: 10, color: 'rgba(232,224,208,0.35)', lineHeight: 1.6 }}>
                Kailash Commercial Complex<br />
                Vikhroli West, Mumbai
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
