import { useEffect, useState, useRef } from 'react'
import { Edit3, Save, X, Mail, Phone, MapPin, Calendar, ChevronLeft, ChevronRight, FileText, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react'
import { getStats, getMemories, requestOtp, verifyOtp, applyChange, getProfileMe } from '../api'
import { useAuth } from '../context/AuthContext'

const CAT_STYLE = {
  preference: 'bg-purple-100 text-purple-600',
  event:      'bg-cyan-100 text-cyan-600',
  goal:       'bg-orange-100 text-orange-600',
  general:    'bg-gray-100 text-gray-500',
}

const PROVIDER_BADGE = {
  google: { label: 'Google',  bg: 'bg-blue-100',   text: 'text-blue-600'   },
  github: { label: 'GitHub',  bg: 'bg-gray-200',   text: 'text-gray-700'   },
  email:  { label: 'Email',   bg: 'bg-orange-100', text: 'text-orange-600' },
}

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

/* ── Custom date picker ─────────────────────────────────────────────────── */
function DatePicker({ value, onChange }) {
  const today     = new Date()
  const parsed    = value ? new Date(value) : null
  const [open, setOpen]       = useState(false)
  const [viewYear, setViewYear]   = useState((parsed || today).getFullYear())
  const [viewMonth, setViewMonth] = useState((parsed || today).getMonth())
  const [pickingYear, setPickingYear] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function selectDay(d) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  function selectToday() {
    const y = today.getFullYear(), m = today.getMonth(), d = today.getDate()
    setViewYear(y); setViewMonth(m)
    const mm = String(m + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    onChange(`${y}-${mm}-${dd}`)
    setOpen(false)
  }

  function clearDate() { onChange(''); setOpen(false) }

  const yearRange = Array.from({ length: 100 }, (_, i) => today.getFullYear() - i)

  const isSelected = (d) => {
    if (!parsed || !d) return false
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === d
  }
  const isToday = (d) => {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d
  }

  const displayValue = parsed
    ? `${String(parsed.getDate()).padStart(2,'0')} / ${String(parsed.getMonth()+1).padStart(2,'0')} / ${parsed.getFullYear()}`
    : ''

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen(o => !o); setPickingYear(false) }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm outline-none border border-orange-300 transition-colors cursor-pointer text-left"
        style={{ background: '#f8f9fb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
        <span className={displayValue ? 'text-gray-800 font-medium' : 'text-gray-400 italic'}>
          {displayValue || 'DD / MM / YYYY'}
        </span>
        <Calendar size={14} className="text-orange-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 rounded-2xl overflow-hidden"
          style={{ width: '280px', background: '#e8eaf0', boxShadow: '6px 6px 16px #c8cad0, -6px -6px 16px #ffffff' }}>

          {pickingYear ? (
            <div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <span className="text-sm font-bold text-gray-800">Select Year</span>
                <button onClick={() => setPickingYear(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1 p-3 max-h-52 overflow-y-auto">
                {yearRange.map(y => (
                  <button key={y} onClick={() => { setViewYear(y); setPickingYear(false) }}
                    className="py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={y === viewYear
                      ? { background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }
                      : { color: '#4b5563' }}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={prevMonth}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:bg-white/60"
                  style={{ boxShadow: '2px 2px 5px #c8cad0, -2px -2px 5px #ffffff' }}>
                  <ChevronLeft size={14} className="text-gray-600" />
                </button>
                <button onClick={() => setPickingYear(true)}
                  className="flex items-center gap-1 text-sm font-bold text-gray-800 hover:text-orange-500 transition-colors">
                  {MONTHS[viewMonth]}, {viewYear}
                  <ChevronRight size={12} className="rotate-90 text-gray-400" />
                </button>
                <button onClick={nextMonth}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:bg-white/60"
                  style={{ boxShadow: '2px 2px 5px #c8cad0, -2px -2px 5px #ffffff' }}>
                  <ChevronRight size={14} className="text-gray-600" />
                </button>
              </div>

              <div className="grid grid-cols-7 px-3 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 px-3 pb-2 gap-y-0.5">
                {cells.map((d, i) => (
                  <div key={i} className="flex items-center justify-center">
                    {d ? (
                      <button onClick={() => selectDay(d)}
                        className="w-8 h-8 rounded-xl text-xs font-semibold transition-all"
                        style={isSelected(d)
                          ? { background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }
                          : isToday(d)
                          ? { background: 'rgba(249,115,22,0.12)', color: '#f97316', fontWeight: 700 }
                          : { color: '#374151' }}>
                        {d}
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200">
                <button onClick={clearDate}
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                  Clear
                </button>
                <button onClick={selectToday}
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                  Today
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── OTP Verification Modal ─────────────────────────────────────────────── */
/**
 * Steps:
 *   'input'   — user types the new value
 *   'otp'     — OTP sent, user enters the 6-digit code
 *   'success' — change applied
 */
function OtpModal({ field, currentValue, onClose, onSuccess }) {
  const [step, setStep]         = useState('input')
  const [newValue, setNewValue] = useState('')
  const [otpCode, setOtpCode]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [sentTo, setSentTo]     = useState('')

  const isEmail   = field === 'email'
  const fieldLabel = isEmail ? 'Email Address' : 'Contact Number'
  const inputType  = isEmail ? 'email' : 'tel'
  const Icon       = isEmail ? Mail : Phone

  async function handleRequestOtp() {
    if (!newValue.trim()) { setError(`Please enter a new ${fieldLabel.toLowerCase()}.`); return }
    setError(''); setLoading(true)
    try {
      const res = await requestOtp(field, newValue.trim())
      setSentTo(res.data.message || `OTP sent`)
      setStep('otp')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to send OTP. Check SMTP settings.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyAndApply() {
    if (otpCode.trim().length !== 6) { setError('Enter the 6-digit code.'); return }
    setError(''); setLoading(true)
    try {
      // Step 1: verify OTP → get verified_token
      const vRes = await verifyOtp(field, newValue.trim(), otpCode.trim())
      const { verified_token } = vRes.data

      // Step 2: apply the change server-side
      const aRes = await applyChange(verified_token)
      onSuccess(field, aRes.data.new_value)
      setStep('success')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 rounded-3xl p-6"
        style={{ background: '#e8eaf0', boxShadow: '8px 8px 20px #c8cad0, -8px -8px 20px #ffffff' }}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Verify {fieldLabel} Change</h3>
            <p className="text-xs text-gray-400">OTP confirmation required</p>
          </div>
        </div>

        {step === 'input' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {isEmail
                ? 'Enter your new email address. An OTP will be sent there to confirm you own it.'
                : 'Enter your new contact number. An OTP will be sent to your account email.'}
            </p>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <Icon size={11} /> New {fieldLabel}
            </label>
            <input
              type={inputType}
              value={newValue}
              onChange={e => { setNewValue(e.target.value); setError('') }}
              placeholder={isEmail ? 'new@example.com' : '+91 98765 43210'}
              className="w-full px-3 py-2 rounded-xl text-sm text-gray-800 outline-none border border-orange-300 focus:border-orange-400 transition-colors mb-1"
              style={{ background: '#f8f9fb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}
              onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
            />
            {currentValue && (
              <p className="text-xs text-gray-400 mb-3">Current: <span className="font-medium text-gray-600">{currentValue}</span></p>
            )}
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button onClick={handleRequestOtp} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {loading ? 'Sending OTP…' : 'Send Verification Code'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl text-sm text-green-700 bg-green-50 border border-green-200">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              <span>{sentTo}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Enter the 6-digit code. It expires in 10 minutes.
            </p>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <ShieldCheck size={11} /> Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="123456"
              className="w-full px-3 py-2 rounded-xl text-sm text-gray-800 outline-none border border-orange-300 focus:border-orange-400 transition-colors tracking-[0.4em] text-center font-bold text-lg mb-1"
              style={{ background: '#f8f9fb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}
              onKeyDown={e => e.key === 'Enter' && handleVerifyAndApply()}
            />
            {error && <p className="text-xs text-red-500 mb-3 mt-1">{error}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setStep('input'); setOtpCode(''); setError('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                Back
              </button>
              <button onClick={handleVerifyAndApply} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {loading ? 'Verifying…' : 'Confirm Change'}
              </button>
            </div>
            <button onClick={handleRequestOtp} disabled={loading}
              className="w-full mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors">
              Resend code
            </button>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,#22c55e,#4ade80)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}>
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">{fieldLabel} Updated!</h4>
            <p className="text-sm text-gray-500 mb-5">Your {fieldLabel.toLowerCase()} has been successfully changed.</p>
            <button onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, updateUser } = useAuth()
  const [stats,    setStats]    = useState(null)
  const [memories, setMemories] = useState([])
  const [isEditing, setIsEditing] = useState(false)

  // Extra profile fields stored locally (dob, city, state, bio)
  const [extra, setExtra] = useState(() => {
    try { return JSON.parse(localStorage.getItem('va_profile_extra')) || {} }
    catch { return {} }
  })
  const [draft, setDraft] = useState({})

  // Server-synced contact (fetched from backend on mount)
  const [serverContact, setServerContact] = useState('')

  // OTP modal state
  const [otpModal, setOtpModal] = useState(null) // null | 'email' | 'contact'

  useEffect(() => {
    Promise.all([getStats(), getMemories(), getProfileMe()]).then(([s, m, p]) => {
      setStats(s.data)
      setMemories(m.data.memories.slice(-5).reverse())
      // Seed contact from server if available, fall back to localStorage
      const serverC = p.data?.contact || ''
      setServerContact(serverC)
      if (serverC && !extra.contact) {
        setExtra(prev => ({ ...prev, contact: serverC }))
      }
    }).catch(() => {
      // stats/memories still work even if profile/me fails
      Promise.all([getStats(), getMemories()]).then(([s, m]) => {
        setStats(s.data)
        setMemories(m.data.memories.slice(-5).reverse())
      })
    })
  }, [])

  function handleEdit()   { setDraft({ ...extra }); setIsEditing(true) }
  function handleCancel() { setIsEditing(false) }
  function handleSave() {
    // Only save non-sensitive fields (dob, city, state, bio) locally
    const { contact: _c, ...safeFields } = draft
    setExtra(prev => ({ ...prev, ...safeFields }))
    localStorage.setItem('va_profile_extra', JSON.stringify({ ...extra, ...safeFields }))
    setIsEditing(false)
  }

  function field(key)         { return isEditing ? draft[key] || '' : extra[key] || '' }
  function setField(key, val) { setDraft(d => ({ ...d, [key]: val })) }

  /** Called by OtpModal on success */
  function handleOtpSuccess(changedField, newValue) {
    if (changedField === 'email') {
      // Update auth context so the header/avatar reflects the new email
      updateUser({ email: newValue })
    } else if (changedField === 'contact') {
      setServerContact(newValue)
      setExtra(prev => {
        const updated = { ...prev, contact: newValue }
        localStorage.setItem('va_profile_extra', JSON.stringify(updated))
        return updated
      })
    }
  }

  // Reusable read-only / editable text field (for non-sensitive fields)
  function TextField({ icon: Icon, label, fieldKey, placeholder, type = 'text' }) {
    return (
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          <Icon size={11} /> {label}
        </label>
        {isEditing ? (
          <input type={type} value={field(fieldKey)} onChange={e => setField(fieldKey, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl text-sm text-gray-800 outline-none border border-orange-300 focus:border-orange-400 transition-colors"
            style={{ background: '#f8f9fb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }} />
        ) : (
          <p className="px-3 py-2 rounded-xl text-sm text-gray-700"
            style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff', minHeight: '38px' }}>
            {extra[fieldKey] || <span className="text-gray-400 italic">Not set</span>}
          </p>
        )}
      </div>
    )
  }

  /**
   * Secure field — read-only display normally.
   * "Change" button only appears while in edit mode.
   */
  function SecureField({ icon: Icon, label, value, fieldKey }) {
    return (
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          <Icon size={11} /> {label}
          <span className="ml-1 flex items-center gap-0.5 text-[10px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
            <ShieldCheck size={9} /> Verified
          </span>
        </label>
        <div className="flex items-center gap-2">
          <p className="flex-1 px-3 py-2 rounded-xl text-sm text-gray-700 truncate"
            style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff', minHeight: '38px' }}>
            {value || <span className="text-gray-400 italic">Not set</span>}
          </p>
          {isEditing && (
            <button
              onClick={() => setOtpModal(fieldKey)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 border border-orange-300 hover:bg-orange-50 transition-colors"
              style={{ background: '#f8f9fb', boxShadow: '2px 2px 5px #d1d5db, -2px -2px 5px #ffffff' }}>
              <Edit3 size={11} /> Change
            </button>
          )}
        </div>
      </div>
    )
  }

  const td      = stats?.todos
  const md      = stats?.memories
  const badge   = PROVIDER_BADGE[user?.provider] || PROVIDER_BADGE.email
  const initials = user?.avatar || user?.name?.[0]?.toUpperCase() || '?'

  const dobDisplay = extra.dob
    ? (() => { const d = new Date(extra.dob); return `${String(d.getDate()).padStart(2,'0')} / ${String(d.getMonth()+1).padStart(2,'0')} / ${d.getFullYear()}` })()
    : null

  return (
    <div className="p-7">

      {/* OTP Modal */}
      {otpModal && (
        <OtpModal
          field={otpModal}
          currentValue={otpModal === 'email' ? user?.email : (serverContact || extra.contact || '')}
          onClose={() => setOtpModal(null)}
          onSuccess={(f, v) => { handleOtpSuccess(f, v); setOtpModal(null) }}
        />
      )}

      {/* Page header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Your AI agent overview</p>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={14} /> Cancel
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
              <Save size={14} /> Save
            </button>
          </div>
        ) : (
          <button onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
            <Edit3 size={14} /> Edit Profile
          </button>
        )}
      </div>

      {/* Avatar card */}
      <div className="neu-card p-6 flex items-center gap-6 mb-6 hover-lift">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-extrabold text-white flex-shrink-0 select-none"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}>
          {user?.picture
            ? <img src={user.picture} alt="avatar" className="w-full h-full object-cover rounded-3xl" />
            : initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-gray-900 truncate">{user?.name || 'Voice Agent User'}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <Mail size={12} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-400 truncate">{user?.email || '—'}</p>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Powered by Groq · llama-3.3-70b-versatile</p>
          <p className="text-xs text-gray-400 mt-0.5">Whisper large-v3 · pyttsx3 TTS</p>
        </div>
      </div>

      {/* Quick stats strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { val: td.total,              lbl: 'Total Tasks',  grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)', sub: `${td.completion_pct}% done` },
            { val: td.done,               lbl: 'Completed',    grad: 'linear-gradient(135deg,#22c55e,#4ade80)', sub: `${td.pending} pending`       },
            { val: md.total,              lbl: 'Memories',     grad: 'linear-gradient(135deg,#f97316,#fb923c)', sub: 'stored'                       },
          ].map(({ val, lbl, grad, sub }) => (
            <div key={lbl} className="neu-card p-4 text-center hover-lift">
              <p className="text-2xl font-extrabold mb-0.5"
                style={{ background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {val}
              </p>
              <p className="text-xs font-semibold text-gray-600">{lbl}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* About Me card */}
      <div className="neu-card p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-1">About Me</h2>
        {isEditing && (
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <ShieldCheck size={11} className="text-orange-400" />
            Email and contact changes require OTP verification
          </p>
        )}
        {!isEditing && <div className="mb-4" />}
        <div className="space-y-4">

          {/* Secure fields — always outside the normal edit flow */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SecureField icon={Mail}  label="Email"      value={user?.email}                          fieldKey="email"   />
            <SecureField icon={Phone} label="Contact No" value={serverContact || extra.contact || ''} fieldKey="contact" />
          </div>

          <hr className="border-gray-200" />

          {/* Read-only name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <Mail size={11} /> Name
            </label>
            <p className="px-3 py-2 rounded-xl text-sm text-gray-700 font-medium"
              style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff', minHeight: '38px' }}>
              {user?.name || '—'}
            </p>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* DOB */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                <Calendar size={11} /> Date of Birth
              </label>
              {isEditing ? (
                <DatePicker value={draft.dob || ''} onChange={v => setField('dob', v)} />
              ) : (
                <p className="px-3 py-2 rounded-xl text-sm text-gray-700"
                  style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff', minHeight: '38px' }}>
                  {dobDisplay || <span className="text-gray-400 italic">Not set</span>}
                </p>
              )}
            </div>

            <TextField icon={MapPin} label="City"  fieldKey="city"  placeholder="e.g. Mumbai" />
            <TextField icon={MapPin} label="State" fieldKey="state" placeholder="e.g. Maharashtra" />
          </div>

          {/* Bio */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <FileText size={11} /> Bio
            </label>
            {isEditing ? (
              <textarea
                rows={3}
                value={field('bio')}
                onChange={e => setField('bio', e.target.value)}
                placeholder="Write a short bio about yourself…"
                className="w-full px-3 py-2 rounded-xl text-sm text-gray-800 outline-none border border-orange-300 focus:border-orange-400 resize-none transition-colors"
                style={{ background: '#f8f9fb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}
              />
            ) : (
              <p className="px-3 py-2 rounded-xl text-sm text-gray-700 leading-relaxed"
                style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff', minHeight: '72px' }}>
                {extra.bio || <span className="text-gray-400 italic">No bio added yet</span>}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Recent memories */}
      <div className="neu-card p-6">
        <h2 className="font-bold text-gray-800 mb-4">Recent Memories</h2>
        {memories.length === 0
          ? <p className="text-sm text-gray-400">No memories stored yet.</p>
          : <div className="space-y-3">
              {memories.map((m, i) => (
                <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-2xl"
                  style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
                  <span className={`pill mt-0.5 flex-shrink-0 ${CAT_STYLE[m.category] || CAT_STYLE.general}`}>
                    {m.category}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{m.content}</p>
                </div>
              ))}
            </div>
        }
      </div>

    </div>
  )
}
