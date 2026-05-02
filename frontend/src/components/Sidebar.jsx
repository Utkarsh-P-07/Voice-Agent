import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Mic, BarChart2,
  Settings, Sparkles, Zap, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/todos',     icon: CheckSquare,     label: 'Tasks'     },
  { to: '/memory',    icon: Mic,             label: 'Voice'     },
  { to: '/stats',     icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',  icon: Settings,        label: 'Settings'  },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/signin')
  }
  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-full py-6 px-4"
      style={{
        background: 'linear-gradient(180deg, #1c1c1e 0%, #2c2c2e 100%)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}
        >
          <Zap size={17} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">VoiceAgent</p>
          <p className="text-gray-500 text-[10px] mt-0.5">AI Productivity</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <div className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl transition-all duration-200
                ${isActive ? 'nav-active-pill' : 'hover:bg-white/5'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                  ${isActive
                    ? 'bg-gradient-to-br from-orange-500 to-orange-400 shadow-lg shadow-orange-500/30'
                    : 'bg-white/5'
                  }`}>
                  <Icon size={15} className={isActive ? 'text-white' : 'text-gray-500'} />
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card + sign out */}
      <div className="mt-4 space-y-2">
        {user && (
          <div className="rounded-2xl px-3 py-3 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-gray-500 text-[10px] truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-gray-500
                     hover:text-red-400 transition-all duration-200 text-sm"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5">
            <LogOut size={14} />
          </div>
          <span className="text-xs font-medium">Sign out</span>
        </button>

        {/* Pro tip card */}
        <div className="rounded-3xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,146,60,0.08))',
            border: '1px solid rgba(249,115,22,0.2)',
          }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-orange-400" />
            <p className="text-white text-xs font-semibold">Pro Tip</p>
          </div>
          <p className="text-gray-400 text-[11px] leading-relaxed mb-3">
            Use voice commands to add tasks hands-free. Just tap the mic!
          </p>
          <button className="w-full text-[11px] font-semibold text-white py-2 rounded-xl transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
            Try Voice Mode
          </button>
        </div>
      </div>
    </aside>
  )
}
