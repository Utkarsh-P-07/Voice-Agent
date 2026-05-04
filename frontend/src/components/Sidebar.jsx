import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Calendar, Tag,
  BarChart2, Zap, LogOut, UserCog, Settings, ChevronUp
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/todos',      icon: CheckSquare,     label: 'Tasks'      },
  { to: '/calendar',   icon: Calendar,        label: 'Calendar'   },
  { to: '/categories', icon: Tag,             label: 'Categories' },
  { to: '/stats',      icon: BarChart2,       label: 'Insights'   },
]

export default function Sidebar() {
  const { user, signOut }   = useAuth()
  const navigate             = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef              = useRef(null)

  // Close popup when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSignOut() {
    setMenuOpen(false)
    signOut()
    navigate('/signin')
  }

  function goTo(path) {
    setMenuOpen(false)
    navigate(path)
  }

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-full py-6 px-4"
      style={{ background: 'linear-gradient(180deg, #1c1c1e 0%, #2c2c2e 100%)' }}
    >
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}>
          <Zap size={17} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">VoiceAgent</p>
          <p className="text-gray-500 text-[10px] mt-0.5">AI Productivity</p>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
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
                    : 'bg-white/5'}`}>
                  <Icon size={15} className={isActive ? 'text-white' : 'text-gray-500'} />
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {label}
                </span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Profile button + popup ────────────────────────────────────── */}
      <div className="mt-4 relative" ref={menuRef}>

        {/* Popup menu — appears above the profile button */}
        {menuOpen && (
          <div
            className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl overflow-hidden z-50"
            style={{
              background: '#2a2a2c',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={() => goTo('/profile')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300
                         hover:bg-white/8 hover:text-white transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10">
                <UserCog size={14} />
              </div>
              Profile
            </button>

            <div className="h-px mx-3" style={{ background: 'rgba(255,255,255,0.07)' }} />

            <button
              onClick={() => goTo('/settings')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300
                         hover:bg-white/8 hover:text-white transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10">
                <Settings size={14} />
              </div>
              Settings
            </button>

            <div className="h-px mx-3" style={{ background: 'rgba(255,255,255,0.07)' }} />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400
                         hover:bg-red-500/10 transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10">
                <LogOut size={14} />
              </div>
              Sign out
            </button>
          </div>
        )}

        {/* Profile trigger button */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl
                     transition-all duration-200 hover:bg-white/8 group"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white
                          text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
            {user?.avatar || '?'}
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-xs font-semibold truncate leading-none">
              {user?.name || 'User'}
            </p>
            <p className="text-gray-500 text-[10px] truncate mt-0.5">
              {user?.email || ''}
            </p>
          </div>

          {/* Chevron — rotates when open */}
          <ChevronUp
            size={14}
            className={`text-gray-500 flex-shrink-0 transition-transform duration-200
              ${menuOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>
      </div>
    </aside>
  )
}
