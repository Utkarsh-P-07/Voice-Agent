import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(form.name, form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#c8c8c8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 900, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 560 }}>

        {/* Left illustration */}
        <div style={{ background: '#fdf0eb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 60, right: 40, width: 70, height: 70, background: 'rgba(232,83,58,0.10)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: 40, left: 30, width: 45, height: 45, background: 'rgba(232,83,58,0.07)', borderRadius: '50%' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 28 }}>
              {[14, 22, 16, 28, 18, 24, 12].map((h, i) => (
                <div key={i} style={{ width: 5, height: h, background: '#e8533a', borderRadius: 3, opacity: 0.6 }} />
              ))}
              <div style={{ width: 52, height: 52, background: '#e8533a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 8px', boxShadow: '0 8px 24px rgba(232,83,58,0.3)' }}>🎤</div>
              {[12, 24, 18, 28, 16, 22, 14].map((h, i) => (
                <div key={i} style={{ width: 5, height: h, background: '#e8533a', borderRadius: 3, opacity: 0.6 }} />
              ))}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.3, margin: '0 0 12px' }}>
              Your voice.<br />Your tasks.<br />Your way.
            </h2>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, maxWidth: 220, margin: '0 auto' }}>
              Add tasks, set reminders, and achieve more every day.
            </p>
          </div>
        </div>

        {/* Right form */}
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 30, height: 30, background: '#e8533a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>V</div>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>VoiceTodo</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>Create Account</h1>
          <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 22px' }}>Let's get you started</p>

          {error && <div style={{ background: '#fff0ee', color: '#e8533a', fontSize: 13, padding: '10px 14px', borderRadius: 12, marginBottom: 14 }}>{error}</div>}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Full Name</label>
              <input type="text" placeholder="Enter your name" required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} className="input-field"
                style={{ background: '#f5f5f5', border: 'none', borderRadius: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Email</label>
              <input type="email" placeholder="you@example.com" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} className="input-field"
                style={{ background: '#f5f5f5', border: 'none', borderRadius: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} placeholder="Create a password" required minLength={8}
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field" style={{ background: '#f5f5f5', border: 'none', borderRadius: 12, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#aaa' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="accent-btn"
              style={{ justifyContent: 'center', padding: '13px', borderRadius: 12, fontSize: 14, marginTop: 4 }}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span style={{ fontSize: 11, color: '#bbb' }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['🌐', 'Google'], ['🍎', 'Apple']].map(([icon, label]) => (
              <button key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: '#f5f5f5', border: 'none', borderRadius: 12, fontSize: 13, color: '#555', cursor: 'pointer', fontWeight: 500 }}>
                {icon} {label}
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 18 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#e8533a', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
