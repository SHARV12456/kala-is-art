import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch {
      toast.error('Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--cream-100)', marginBottom: 10 }}>
          Check your email
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(232,224,208,0.45)', marginBottom: 28 }}>
          If <strong style={{ color: 'var(--gold-400)' }}>{email}</strong> is registered, you'll receive a reset link shortly.
        </p>
        <Link to="/login" className="btn-outline" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--cream-100)', marginBottom: 6 }}>
          Forgot password?
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(232,224,208,0.45)' }}>
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label className="input-label">Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(212,175,55,0.5)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="your@email.com"
              style={{ paddingLeft: 40 }}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-gold" style={{ width: '100%', padding: '13px' }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/login" style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={13} /> Back to Login
        </Link>
      </div>
    </motion.div>
  )
}
