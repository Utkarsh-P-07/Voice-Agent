import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from './AuthLayout'
import SocialButtons from '../../components/SocialButtons'

export default function SignIn() {
  const { signIn }   = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const from         = location.state?.from?.pathname || '/dashboard'

  const [form,       setForm]       = useState({ email: '', password: '' })
  const [showPw,     setShowPw]     = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 600)) // simulate network
      signIn(form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Demo quick-fill
  function demoLogin() {
    setForm({ email: 'demo@voiceagent.ai', password: 'demo1234' })
  }

  return (
    <AuthLayout mode="signin">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-gray-400 text-sm">Sign in to your VoiceAgent workspace</p>
      </div>

      {/* Demo banner */}
      <button onClick={demoLogin}
        className="w-full mb-6 py-3 px-4 rounded-2xl text-sm font-medium text-orange-600
                   flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
        <Zap size={14} />
        Fill demo credentials
      </button>

      {/* Error */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-2xl text-sm text-red-600 font-medium"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Email address
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="email"
              className="neu-input pl-11"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Password
            </label>
            <button type="button"
              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type={showPw ? 'text' : 'password'}
              className="neu-input pl-11 pr-11"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <div
            onClick={() => setRememberMe(v => !v)}
            className="w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
            style={rememberMe
              ? { background: '#f97316', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }
              : { background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }
            }
          >
            <svg
              className="w-3 h-3 text-white transition-opacity duration-200"
              style={{ opacity: rememberMe ? 1 : 0 }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
        </label>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm
                     flex items-center justify-center gap-2 transition-all duration-200
                     hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 6px 20px rgba(249,115,22,0.35)' }}>
          {loading
            ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <>Sign In <ArrowRight size={16} /></>
          }
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social buttons */}
      <SocialButtons />

      {/* Sign up link */}
      <p className="text-center text-sm text-gray-400 mt-8">
        Don't have an account?{' '}
        <Link to="/signup" className="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
