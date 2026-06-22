// ============================================================
// KALA IS ART - Auth Layout (login/register pages)
// ============================================================
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface-0)' }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-1/2 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f0d06 0%, #1a1207 60%, #0f0d06 100%)',
          borderRight: '1px solid rgba(212,175,55,0.15)',
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.06) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', top: -200, right: -200,
            width: 600, height: 600, borderRadius: '50%',
            border: '1px solid rgba(212,175,55,0.07)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: -150, left: -100,
            width: 400, height: 400, borderRadius: '50%',
            border: '1px solid rgba(212,175,55,0.05)',
          }}
        />

        {/* Brand */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--gold-400)',
              letterSpacing: 6,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Kala Is Art
            </div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase' }}>
              CRM & Business Platform
            </div>
          </motion.div>
        </div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10"
        >
          <div style={{
            width: 48, height: 2,
            background: 'linear-gradient(90deg, var(--gold-400), transparent)',
            marginBottom: 24,
          }} />
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 40,
            fontWeight: 600,
            color: 'var(--cream-100)',
            lineHeight: 1.3,
            marginBottom: 20,
          }}>
            Manage your art<br />
            business with<br />
            <span style={{ color: 'var(--gold-400)' }}>elegance.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(232,224,208,0.45)', lineHeight: 1.8, maxWidth: 340 }}>
            A premium CRM platform built for luxury art creation businesses. 
            Track leads, manage clients, generate beautiful estimates, and grow your business.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 32 }}>
            {['Lead Management', 'Smart Follow-ups', 'Estimate Generator', 'Accounting', 'Analytics'].map((f) => (
              <span key={f} style={{
                padding: '5px 14px',
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 20,
                fontSize: 12,
                color: 'rgba(212,175,55,0.7)',
              }}>
                {f}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="relative z-10">
          <p style={{ fontSize: 12, color: 'rgba(232,224,208,0.2)' }}>
            Kailash Commercial Complex, Vikhroli West, Mumbai
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              color: 'var(--gold-400)',
              letterSpacing: 4,
            }}>KALA IS ART</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(212,175,55,0.5)', marginTop: 4 }}>CRM & BUSINESS PLATFORM</div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
