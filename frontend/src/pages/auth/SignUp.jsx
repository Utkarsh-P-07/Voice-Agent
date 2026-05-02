import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from './AuthLayout'
import SocialButtons from '../../components/SocialButtons'

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e']

function getStrength(pw) {
  let score = 0
  if (pw.length >= 8)              score++
  if (/[A-Z]/.test(pw))            score++
  if (/[0-9]/.test(pw))            score++
  if (/[^A-Za-z0-9]/.test(pw))    score++
  return score
}

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()

  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [showCf,  setShowCf]  = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [agreed,  setAgreed]  = useState(false)

  const strength = getStrength(form.password)

  const rules = [
    { label: 'At least 8 characters',    ok: form.password.length >= 8 },
    { label: 'One uppercase letter',      ok: /[A-Z]/.test(form.password) },
    { label: 'One number',               ok: /[0-9]/.test(form.password) },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError('Please fill in all fields.'); return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.'); return
    }
    if (strength < 2) {
      setError('Please choose a stronger password.'); return
    }
    if (!agreed) {
      setError('Please accept the terms to continue.'); return
    }
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 700))
      signUp(form.name.trim(), form.email.trim(), form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout mode="signup">
      {/* Heading */}
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Create account</h1>
        <p className="text-gray-400 text-sm">Start your AI productivity journey — free forever</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-2xl text-sm text-red-600 font-medium"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Full name
          </label>
          <div className="relative">
            <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" className="neu-input pl-11" placeholder="Jane Smith"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoComplete="name" />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Email address
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="email" className="neu-input pl-11" placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email" />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type={showPw ? 'text' : 'password'} className="neu-input pl-11 pr-11"
              placeholder="Create a strong password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Strength bar */}
          {form.password && (
            <div className="mt-2.5 space-y-2">
              <div className="flex gap-1.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i <= strength ? STRENGTH_COLORS[strength] : '#e5e7eb' }} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  {rules.map(r => (
                    <div key={r.label} className="flex items-center gap-1">
                      <CheckCircle2 size={11} className={r.ok ? 'text-green-500' : 'text-gray-300'} />
                      <span className={`text-[10px] ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
                {strength > 0 && (
                  <span className="text-[11px] font-semibold" style={{ color: STRENGTH_COLORS[strength] }}>
                    {STRENGTH_LABELS[strength]}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Confirm password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type={showCf ? 'text' : 'password'} className="neu-input pl-11 pr-11"
              placeholder="Repeat your password"
              value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              autoComplete="new-password" />
            <button type="button" onClick={() => setShowCf(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {/* Match indicator */}
          {form.confirm && (
            <p className={`text-[11px] mt-1.5 font-medium flex items-center gap-1
              ${form.password === form.confirm ? 'text-green-500' : 'text-red-400'}`}>
              <CheckCircle2 size={11} />
              {form.password === form.confirm ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input type="checkbox" className="sr-only peer"
              checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <div onClick={() => setAgreed(v => !v)}
              className="w-5 h-5 rounded-lg flex items-center justify-center transition-all cursor-pointer"
              style={agreed
                ? { background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }
                : { background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }
              }>
              {agreed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-500 leading-relaxed">
            I agree to the{' '}
            <span className="text-orange-500 font-semibold cursor-pointer hover:text-orange-600">Terms of Service</span>
            {' '}and{' '}
            <span className="text-orange-500 font-semibold cursor-pointer hover:text-orange-600">Privacy Policy</span>
          </span>
        </label>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm
                     flex items-center justify-center gap-2 transition-all duration-200
                     hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 6px 20px rgba(249,115,22,0.35)' }}>
          {loading
            ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <>Create Account <ArrowRight size={16} /></>
          }
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or sign up with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social */}
      <SocialButtons />

      {/* Sign in link */}
      <p className="text-center text-sm text-gray-400 mt-8">
        Already have an account?{' '}
        <Link to="/signin" className="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
