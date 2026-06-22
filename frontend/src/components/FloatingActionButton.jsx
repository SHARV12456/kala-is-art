import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, FileText, TrendingUp, TrendingDown, UserCheck, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ACTIONS = [
  { label: 'Add Lead',       icon: Users,       path: '/leads',      color: '#6366F1', action: 'add-lead' },
  { label: 'Add Follow-up',  icon: Calendar,    path: '/follow-ups', color: '#0EA5E9', action: 'add-fu' },
  { label: 'New Estimate',   icon: FileText,    path: '/estimates/new', color: '#8B5CF6', action: null },
  { label: 'Add Income',     icon: TrendingUp,  path: '/income',     color: '#10B981', action: null },
  { label: 'Add Expense',    icon: TrendingDown,path: '/expenses',   color: '#EF4444', action: null },
  { label: 'Add Client',     icon: UserCheck,   path: '/clients',    color: '#F59E0B', action: null },
]

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleAction = (item) => {
    setOpen(false)
    navigate(item.path)
  }

  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 999 }}>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}
            style={{ position:'absolute', bottom:64, right:0, display:'flex', flexDirection:'column-reverse', gap:10, alignItems:'flex-end' }}>
            {ACTIONS.map((item, i) => (
              <motion.button key={item.label}
                initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0, transition:{ delay:i*0.04 } }}
                onClick={() => handleAction(item)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px 8px 10px',
                  background:'var(--card)', border:'1px solid var(--border)', borderRadius:40,
                  cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', whiteSpace:'nowrap' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:item.color,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <item.icon size={14} color="#fff"/>
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button whileTap={{ scale:0.92 }} onClick={() => setOpen(!open)}
        style={{ width:52, height:52, borderRadius:'50%', background:'var(--accent)',
          border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(99,102,241,0.4)', color:'#fff' }}>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration:0.2 }}>
          <Plus size={22}/>
        </motion.div>
      </motion.button>

      {/* Backdrop */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:-1 }}/>
      )}
    </div>
  )
}
