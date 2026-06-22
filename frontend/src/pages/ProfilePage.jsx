// KALA IS ART - Profile Page
import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useMutation, useQuery } from '@tanstack/react-query'
import { userAPI, authAPI } from '../services/api'
import { updateUser } from '../store/slices/authSlice'
import { motion } from 'framer-motion'
import { User, Shield, Monitor, LogOut, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

export default function ProfilePage() {
  const { user } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({ owner_name: user?.owner_name || '', business_name: user?.business_name || '', mobile: user?.mobile || '', gst_number: user?.gst_number || '', brand_tagline: user?.brand_tagline || '', address: user?.address || '' })

  const profileMutation = useMutation({
    mutationFn: (d) => userAPI.updateProfile(d),
    onSuccess: ({ data }) => {
      dispatch(updateUser(data.data))
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authAPI.getSessions().then((r) => r.data.data),
    enabled: activeTab === 'sessions',
  })

  const revokeSessionMutation = useMutation({
    mutationFn: (id) => authAPI.revokeSession(id),
    onSuccess: () => toast.success('Session revoked'),
  })

  const verifyEmailMutation = useMutation({
    mutationFn: () => authAPI.sendVerificationEmail(),
    onSuccess: () => toast.success('Verification email sent! Check your inbox.'),
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to send verification email'),
  })

  const TABS = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'sessions', label: 'Sessions', icon: Monitor },
  ]

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--cream-100)', marginBottom: 4 }}>
          Profile & Settings
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(232,224,208,0.4)' }}>Manage your account details and security</p>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: '#0a0802',
        }}>
          {user?.owner_name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--cream-100)', marginBottom: 4 }}>{user?.owner_name}</div>
          <div style={{ fontSize: 13, color: 'rgba(212,175,55,0.6)', marginBottom: 6 }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-gold" style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</span>
            {user?.account_status && (
              <span style={{
                padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: user.account_status === 'active' ? 'rgba(34,197,94,0.12)'
                  : user.account_status === 'trial' ? 'rgba(234,179,8,0.12)'
                  : user.account_status === 'suspended' ? 'rgba(239,68,68,0.12)'
                  : 'rgba(107,114,128,0.12)',
                border: user.account_status === 'active' ? '1px solid rgba(34,197,94,0.3)'
                  : user.account_status === 'trial' ? '1px solid rgba(234,179,8,0.3)'
                  : user.account_status === 'suspended' ? '1px solid rgba(239,68,68,0.3)'
                  : '1px solid rgba(107,114,128,0.3)',
                color: user.account_status === 'active' ? '#4ade80'
                  : user.account_status === 'trial' ? '#facc15'
                  : user.account_status === 'suspended' ? '#f87171'
                  : '#9ca3af',
              }}>
                {user.account_status}
              </span>
            )}
            {!user?.is_email_verified && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f59e0b' }}>
                <AlertCircle size={11} /> Email unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: `1px solid ${activeTab === key ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.06)'}`,
            background: activeTab === key ? 'rgba(212,175,55,0.1)' : 'transparent',
            color: activeTab === key ? 'var(--gold-400)' : 'rgba(232,224,208,0.4)',
            transition: 'all 0.15s',
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 560 }}>
        {/* Profile tab */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 14, color: 'rgba(212,175,55,0.6)', letterSpacing: 1, marginBottom: 24 }}>ACCOUNT DETAILS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Owner Name</label>
                <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="input-label">Business Name</label>
                <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="input-field" placeholder="Your business name" />
              </div>
              <div>
                <label className="input-label">Brand Tagline (PDF Header)</label>
                <input value={form.brand_tagline} onChange={(e) => setForm({ ...form, brand_tagline: e.target.value })} className="input-field" placeholder="e.g. Handcraft, Art & Creative Studio." />
              </div>
              <div>
                <label className="input-label">Mobile Number</label>
                <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="input-label">GST Number</label>
                <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="input-field" placeholder="GSTIN (optional)" />
              </div>
              <div>
                <label className="input-label">Business Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="Full business address" style={{ height: 80, resize: 'vertical' }} />
              </div>
              <div>
                <label className="input-label">Email Address</label>
                <input value={user?.email} disabled className="input-field" />
              </div>
              <button onClick={() => profileMutation.mutate(form)} disabled={profileMutation.isPending} className="btn-gold" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 14, color: 'rgba(212,175,55,0.6)', letterSpacing: 1, marginBottom: 24 }}>SECURITY & VERIFICATION</h3>

            {/* Email Verification Card */}
            <div style={{
              padding: '18px 20px', borderRadius: 12, marginBottom: 20,
              background: user?.is_email_verified ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
              border: `1px solid ${user?.is_email_verified ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: user?.is_email_verified ? 0 : 14 }}>
                {user?.is_email_verified
                  ? <CheckCircle size={18} color="#4ade80" />
                  : <AlertCircle size={18} color="#f59e0b" />
                }
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: user?.is_email_verified ? '#4ade80' : '#fbbf24' }}>
                    {user?.is_email_verified ? 'Email Verified' : 'Email Not Verified'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)', marginTop: 2 }}>{user?.email}</div>
                </div>
              </div>
              {!user?.is_email_verified && (
                <>
                  <p style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)', lineHeight: 1.6, marginBottom: 14 }}>
                    Your account works fully without email verification. Verify optionally to enable password reset via email.
                  </p>
                  <button
                    onClick={() => verifyEmailMutation.mutate()}
                    disabled={verifyEmailMutation.isPending}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                      color: '#fbbf24',
                    }}
                  >
                    <Mail size={13} />
                    {verifyEmailMutation.isPending ? 'Sending…' : 'Send Verification Email'}
                  </button>
                </>
              )}
            </div>

            {/* Account info */}
            <div style={{ padding: '16px 20px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(232,224,208,0.45)' }}>Account Status</span>
                <span style={{ textTransform: 'capitalize', color: user?.account_status === 'active' ? '#4ade80' : user?.account_status === 'trial' ? '#facc15' : '#f87171' }}>
                  {user?.account_status || 'trial'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 10 }}>
                <span style={{ color: 'rgba(232,224,208,0.45)' }}>Account Created</span>
                <span style={{ color: 'rgba(232,224,208,0.5)' }}>{dayjs(user?.created_at).format('DD MMM YYYY')}</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: 'rgba(232,224,208,0.35)', lineHeight: 1.6 }}>
                To change your password, use the <strong style={{ color: 'rgba(212,175,55,0.5)' }}>Forgot Password</strong> link on the login page.
              </div>
            </div>
          </motion.div>
        )}

        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 14, color: 'rgba(212,175,55,0.6)', letterSpacing: 1, marginBottom: 20 }}>ACTIVE SESSIONS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(232,224,208,0.3)' }}>No active sessions found</p>
              ) : sessions.map((s) => (
                <div key={s.id} style={{
                  padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--cream-100)', marginBottom: 3 }}>
                      {s.device_info || 'Unknown Device'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)' }}>
                      Last active {dayjs(s.last_active).fromNow()}
                      {s.ip_address && ` · ${s.ip_address}`}
                    </div>
                  </div>
                  {s.is_current ? (
                    <span className="badge badge-green">Current</span>
                  ) : (
                    <button onClick={() => revokeSessionMutation.mutate(s.id)} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, color: 'rgba(239,68,68,0.7)' }}>
                      <LogOut size={12} /> Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
