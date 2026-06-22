// KALA IS ART - Admin Dashboard
import { useQuery } from '@tanstack/react-query'
import { adminAPI } from '../../services/api'
import { motion } from 'framer-motion'
import { Users, IndianRupee, TrendingUp, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'

const formatINR = (v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(1)}K`

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => adminAPI.getRevenue().then((r) => r.data.data),
  })

  const stats = data?.stats || {}
  const trend = (data?.trend || []).map((t) => ({
    month: dayjs(t.month).format('MMM YY'),
    revenue: parseFloat(t.total || 0),
    payments: parseInt(t.payments || 0),
  })).slice(-6).reverse()

  const statCards = [
    { label: 'Total Users', value: stats.total_users || 0, icon: Users, color: '#60a5fa' },
    { label: 'Active Subscribers', value: stats.active_subscribers || 0, icon: Activity, color: '#34d399' },
    { label: 'Total Revenue', value: formatINR(stats.total_revenue || 0), icon: IndianRupee, color: 'var(--gold-400)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--cream-100)', marginBottom: 4 }}>Admin Dashboard</h1>
        <p style={{ fontSize: 13, color: 'rgba(232,224,208,0.4)' }}>Platform overview and revenue analytics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        {statCards.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--cream-100)' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)' }}>{label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream-100)', marginBottom: 16 }}>Monthly Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4af37" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(232,224,208,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatINR} tick={{ fill: 'rgba(232,224,208,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip contentStyle={{ background: '#1a1207', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatINR(v), 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={2} fill="url(#aGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
