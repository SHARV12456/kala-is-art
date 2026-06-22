// KALA IS ART - Frictionless Signup Page
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, User, Building2, Mail, Phone, Lock, Check, Palette, ArrowRight, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import { setCredentials } from '../../store/slices/authSlice'

const schema = z.object({
  owner_name:       z.string().min(2, 'Name must be at least 2 characters'),
  business_name:    z.string().optional(),
  mobile:           z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile'),
  email:            z.string().email('Enter a valid email address'),
  password:         z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase & number'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

function PasswordStrength({ password = '' }) {
  const checks = [
    { label: '8+ chars', met: password.length >= 8 },
    { label: 'A–Z',      met: /[A-Z]/.test(password) },
    { label: 'a–z',      met: /[a-z]/.test(password) },
    { label: '0–9',      met: /\d/.test(password) },
  ]
  const score = checks.filter(c => c.met).length
  const colors = ['#ef4444','#f97316','#eab308','#22c55e']
  const labels = ['Weak','Fair','Good','Strong']
  if (!password) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.06)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {checks.map(({ label, met }, i) => (
          <span key={i} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, color: met ? '#22c55e' : 'rgba(232,224,208,0.28)' }}>
            <Check size={8} />{label}
          </span>
        ))}
        {score > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: colors[score - 1] }}>{labels[score - 1]}</span>}
      </div>
    </div>
  )
}

function Field({ label, optional, hint, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(232,224,208,0.65)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{optional && <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(232,224,208,0.28)', textTransform: 'none', marginLeft: 6 }}>(optional)</span>}
      </label>
      {children}
      {hint && !error && <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'rgba(232,224,208,0.28)' }}>{hint}</span>}
      {error && <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#f87171' }}>{error}</span>}
    </div>
  )
}

export default function RegisterPage() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const [showPw,  setShowPw]  = useState(false)
  const [showCpw, setShowCpw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const pwVal = watch('password') || ''

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      const { data } = await authAPI.register(values)
      dispatch(setCredentials(data.data))
      toast.success(`Welcome, ${data.data.user.owner_name}! 🎨`, { duration: 4000, icon: '✨' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'stretch' }}>

      {/* LEFT BRAND PANEL */}
      <div style={{
        width: '40%', minWidth: 320,
        background: 'linear-gradient(160deg,#1a1208 0%,#0f0a04 55%,#181006 100%)',
        borderRight: '1px solid rgba(212,175,55,0.1)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 44px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 20% 80%,#d4af37 0%,transparent 55%),radial-gradient(circle at 85% 15%,#d4af37 0%,transparent 45%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#d4af37,#b8943f)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(212,175,55,0.35)' }}>
            <Palette size={20} color="#0f0a04" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--cream-100)' }}>Kala Is Art</div>
            <div style={{ fontSize: 10, color: 'rgba(212,175,55,0.55)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Creative Studio CRM</div>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.45)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Built for Indian Creators</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--cream-100)', lineHeight: 1.3, margin: '0 0 18px' }}>
            Manage your craft,<br /><span style={{ color: 'var(--accent)' }}>not your paperwork.</span>
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(232,224,208,0.35)', lineHeight: 1.8, marginBottom: 32 }}>
            Track leads, manage clients, send professional estimates, and record payments — designed for Indian handcraft and art businesses.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Lead & Client Pipeline','Professional Estimate PDFs','Payment Ledger & Invoices','Follow-up Automation','WhatsApp Communication Log'].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={10} color="var(--accent)" />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(232,224,208,0.5)' }}>{f}</span>
              </motion.div>
            ))}
          </div>

          {/* Plans preview */}
          <div style={{ marginTop: 32, padding: '14px 16px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(212,175,55,0.45)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Subscription Plans</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Monthly','₹2,500','/mo'],['Quarterly','₹6,500','/qtr'],['Yearly','₹22,000','/yr']].map(([n,p,s],i) => (
                <div key={i} style={{ flex: 1, background: i===1 ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${i===1 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: i===1 ? 'var(--accent)' : 'rgba(232,224,208,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{n}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream-100)', fontFamily: 'var(--font-display)' }}>{p}</div>
                  <div style={{ fontSize: 9, color: 'rgba(232,224,208,0.28)' }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quote */}
        <div style={{ position: 'relative', borderTop: '1px solid rgba(212,175,55,0.07)', paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: 'rgba(232,224,208,0.2)', fontStyle: 'italic', lineHeight: 1.6 }}>
            "Art is not what you see, but what you make others see."<br />
            <span style={{ color: 'rgba(232,224,208,0.1)' }}>— Edgar Degas</span>
          </p>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', overflowY: 'auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ width: '100%', maxWidth: 500 }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--cream-100)', margin: '0 0 8px', fontWeight: 700 }}>Create your account</h1>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5 }}>Fill in the details below — instant access, no OTP required.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, padding: '5px 13px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999 }}>
              <Zap size={11} color="#22c55e" />
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Instant access — no email verification to get started</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Row 1: Name + Business */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Full Name" error={errors.owner_name?.message}>
                <input {...register('owner_name')} id="reg-name"
                  className={`form-input ${errors.owner_name ? 'error' : ''}`}
                  placeholder="Priya Sharma" autoFocus />
              </Field>
              <Field label="Business Name" optional error={errors.business_name?.message} hint="Appears on estimates & PDFs">
                <input {...register('business_name')} id="reg-biz"
                  className="form-input" placeholder="Priya's Handcraft Studio" />
              </Field>
            </div>

            {/* Row 2: Mobile + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Mobile Number" error={errors.mobile?.message}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-3)', borderRight: '1px solid var(--border)', paddingRight: 10, pointerEvents: 'none' }}>+91</div>
                  <input {...register('mobile')} id="reg-mobile"
                    className={`form-input ${errors.mobile ? 'error' : ''}`}
                    style={{ paddingLeft: 52 }} placeholder="9876543210" maxLength={10} inputMode="numeric" />
                </div>
              </Field>
              <Field label="Email Address" error={errors.email?.message} hint="For login & notifications">
                <input {...register('email')} type="email" id="reg-email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@yourstudio.com" />
              </Field>
            </div>

            {/* Row 3: Password + Confirm */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Password" error={errors.password?.message}>
                <div style={{ position: 'relative' }}>
                  <input {...register('password')} type={showPw ? 'text' : 'password'} id="reg-pw"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Min 8 chars" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" error={errors.confirm_password?.message}>
                <div style={{ position: 'relative' }}>
                  <input {...register('confirm_password')} type={showCpw ? 'text' : 'password'} id="reg-cpw"
                    className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                    placeholder="Repeat password" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowCpw(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex' }}>
                    {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>

            {/* Password strength */}
            <AnimatePresence>
              {pwVal && (
                <motion.div key="str" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.08)', borderRadius: 10, padding: '10px 14px', overflow: 'hidden' }}>
                  <PasswordStrength password={pwVal} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button type="submit" disabled={loading} id="reg-submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12 }}>
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Creating account…
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  Create Account &amp; Enter CRM
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Email verification notice */}
            <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Mail size={14} color="rgba(96,165,250,0.7)" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.7)', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: 'rgba(148,163,184,0.9)' }}>Email verification is optional.</strong>{' '}
                You'll get full access immediately. Verify your email anytime from Profile Settings.
              </p>
            </div>
          </form>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--text-4)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'rgba(232,224,208,0.14)', lineHeight: 1.6 }}>
            By creating an account, you agree to use this CRM<br />responsibly for your business.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
