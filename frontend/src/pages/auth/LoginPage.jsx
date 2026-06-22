import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch } from 'react-redux'
import { useMutation } from '@tanstack/react-query'
import { authAPI } from '../../services/api'
import { setCredentials } from '../../store/slices/authSlice'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const mutation = useMutation({
    mutationFn: (d) => authAPI.login(d),
    onSuccess: ({ data }) => {
      dispatch(setCredentials(data.data))
      toast.success(`Welcome back, ${data.data.user.owner_name}!`)
      navigate('/dashboard')
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Login failed'),
  })

  return (
    <div className="auth-layout">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Kala Is Art</span>
        </div>

        <div className="auth-title">Sign in to your workspace</div>
        <div className="auth-subtitle" style={{ marginBottom: 28 }}>Enter your credentials to continue</div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className={`form-input ${errors.email ? 'error' : ''}`}
              type="email"
              placeholder="you@company.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <Link to="/forgot-password" style={{ color: 'var(--accent)', fontSize: 12 }}>Forgot password?</Link>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className={`form-input ${errors.password ? 'error' : ''}`}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer' }}>
                {showPass ? '👁️' : '🔒'}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)', cursor: 'pointer' }}>
            <input type="checkbox" {...register('rememberMe')} />
            Remember me for 30 days
          </label>

          <button type="submit" disabled={mutation.isPending} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            {mutation.isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-3)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
