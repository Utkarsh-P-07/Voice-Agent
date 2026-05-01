import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard', icon: '▦', label: 'Dashboard' },
  { to: '/tasks', icon: '◈', label: 'Tasks' },
  { to: '/calendar', icon: '◫', label: 'Calendar' },
  { to: '/reminders', icon: '◷', label: 'Reminders' },
  { to: '/categories', icon: '⊟', label: 'Categories' },
  { to: '/insights', icon: '◉', label: 'Insights' },
  { to: '/settings', icon: '⚙', label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside style={{
      width: 200,
      minHeight: '100vh',
      background: '#2d2d2d',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      zIndex: 20,
      borderRadius: '0 0 0 0',
      padding: '24px 14px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, paddingLeft: 6 }}>
        <div style={{
          width: 32, height: 32, background: '#e8533a', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14,
        }}>V</div>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>VoiceTodo</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span style={{ fontSize: 15, width: 18, textAlign: 'center', opacity: 0.8 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* CTA card */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 18,
        padding: '16px 14px',
        marginBottom: 16,
      }}>
        <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Let the voice<br />do the work.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>
          Add tasks, set reminders, and achieve more every day.
        </p>
        {/* Mini waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 12 }}>
          {[6, 10, 7, 13, 9, 11, 6].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: '#e8533a', borderRadius: 3, opacity: 0.7 }} />
          ))}
        </div>
        <button
          onClick={() => navigate('/tasks')}
          style={{
            background: '#e8533a', color: '#fff', border: 'none', borderRadius: 50,
            padding: '7px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%',
          }}>
          Get Started
        </button>
      </div>

      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 6 }}>
        <div style={{
          width: 28, height: 28, background: '#e8533a', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontSize: 11, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
        </div>
        <button onClick={() => { logout(); navigate('/login') }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: 0 }}
          title="Logout">↩</button>
      </div>
    </aside>
  )
}
