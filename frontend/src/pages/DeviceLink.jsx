import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, Calendar, AlarmClock, CheckCircle2, XCircle, Loader2, Smartphone, ShieldCheck } from 'lucide-react'
import axios from 'axios'

const BACKEND = 'http://localhost:8000'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function deviceLabel() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua))   return 'iPhone'
  if (/iPad/.test(ua))     return 'iPad'
  if (/Android/.test(ua))  return 'Android — ' + (ua.includes('Chrome') ? 'Chrome' : 'Browser')
  if (/Macintosh/.test(ua)) return 'Mac — ' + (ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : 'Safari')
  if (/Windows/.test(ua))  return 'Windows — ' + (ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : 'Edge')
  return 'Browser'
}

/* ── Permission card ─────────────────────────────────────────────────────── */
function PermCard({ icon: Icon, color, title, description, value, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!value)}
      className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 select-none
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}`}
      style={value
        ? { background: 'rgba(249,115,22,0.07)', border: '1.5px solid rgba(249,115,22,0.3)' }
        : { background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff', border: '1.5px solid transparent' }
      }
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
      </div>
      {/* Checkbox */}
      <div
        className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200"
        style={value
          ? { background: '#f97316', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }
          : { background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }
        }
      >
        {value && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  )
}

export default function DeviceLink() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [phase, setPhase] = useState('permissions') // permissions | linking | success | error
  const [errMsg, setErrMsg] = useState('')

  // Permission toggles
  const [allowPush,     setAllowPush]     = useState(true)
  const [allowCalendar, setAllowCalendar] = useState(false)
  const [allowAlarm,    setAllowAlarm]    = useState(false)

  useEffect(() => {
    if (!token) {
      setPhase('error')
      setErrMsg('No pairing token found. Please scan the QR code again.')
    }
  }, [token])

  async function handleLink() {
    if (!token) return
    setPhase('linking')

    try {
      let endpoint = ''
      let keys     = { p256dh: '', auth: '' }

      if (allowPush) {
        // 1. Request notification permission
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          setPhase('error')
          setErrMsg('Notification permission was denied. Please allow notifications and try again.')
          return
        }

        // 2. Register service worker
        if (!('serviceWorker' in navigator)) {
          setPhase('error')
          setErrMsg('This browser does not support push notifications.')
          return
        }
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        // 3. Get VAPID key
        const { data: vapidData } = await axios.get(`${BACKEND}/api/push/vapid-public-key`)
        const appServerKey = urlBase64ToUint8Array(vapidData.publicKey)

        // 4. Subscribe
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: appServerKey,
        })
        const subJson = sub.toJSON()
        endpoint = subJson.endpoint
        keys     = subJson.keys
      }

      // 5. Claim the token on the backend
      await axios.post(`${BACKEND}/api/devices/claim`, {
        token,
        endpoint,
        keys,
        device_name:    deviceLabel(),
        allow_push:     allowPush,
        allow_calendar: allowCalendar,
        allow_alarm:    allowAlarm,
      })

      setPhase('success')
    } catch (err) {
      setPhase('error')
      setErrMsg(err?.response?.data?.detail || err.message || 'Something went wrong.')
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#e8e8ed' }}>
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="rounded-3xl p-7 fade-in-up"
          style={{ background: '#eef0f5', boxShadow: '20px 20px 50px #c8cad0, -20px -20px 50px #ffffff' }}>

          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
              <Smartphone size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 text-center">Link this device</h1>
            <p className="text-xs text-gray-400 mt-1 text-center">
              Choose what this device is allowed to do
            </p>
          </div>

          {/* ── Permissions phase ─────────────────────────────────────── */}
          {phase === 'permissions' && (
            <>
              <div className="flex flex-col gap-3 mb-6">
                <PermCard
                  icon={Bell}
                  color="bg-gradient-to-br from-orange-400 to-orange-500"
                  title="Push Notifications"
                  description="Receive alerts when tasks are added or reminders are due"
                  value={allowPush}
                  onChange={setAllowPush}
                />
                <PermCard
                  icon={Calendar}
                  color="bg-gradient-to-br from-blue-400 to-blue-500"
                  title="Google Calendar"
                  description="Automatically add tasks as Google Calendar events"
                  value={allowCalendar}
                  onChange={setAllowCalendar}
                />
                <PermCard
                  icon={AlarmClock}
                  color="bg-gradient-to-br from-purple-400 to-purple-500"
                  title="Alarm-style alerts"
                  description="Persistent notifications that require interaction to dismiss"
                  value={allowAlarm}
                  onChange={setAllowAlarm}
                />
              </div>

              <button
                onClick={handleLink}
                disabled={!allowPush && !allowCalendar && !allowAlarm}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm
                           flex items-center justify-center gap-2 transition-all
                           hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 6px 20px rgba(249,115,22,0.35)' }}
              >
                <ShieldCheck size={16} />
                Link device with selected permissions
              </button>

              <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
                This device will be linked to your VoiceAgent account.<br />
                You can remove it anytime from Settings.
              </p>
            </>
          )}

          {/* ── Linking phase ─────────────────────────────────────────── */}
          {phase === 'linking' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 size={36} className="text-orange-400 animate-spin" />
              <p className="text-sm font-semibold text-gray-700">Linking device…</p>
              <p className="text-xs text-gray-400">Requesting permissions and registering</p>
            </div>
          )}

          {/* ── Success phase ─────────────────────────────────────────── */}
          {phase === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-900">Device linked!</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  You'll now receive notifications on this device whenever a task is added.
                </p>
              </div>
              <div className="w-full flex flex-col gap-2 mt-2">
                {allowPush     && <div className="flex items-center gap-2 text-xs text-green-600"><CheckCircle2 size={13} /> Push notifications enabled</div>}
                {allowCalendar && <div className="flex items-center gap-2 text-xs text-blue-600"><CheckCircle2 size={13} /> Google Calendar connected</div>}
                {allowAlarm    && <div className="flex items-center gap-2 text-xs text-purple-600"><CheckCircle2 size={13} /> Alarm-style alerts enabled</div>}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">You can close this page.</p>
            </div>
          )}

          {/* ── Error phase ───────────────────────────────────────────── */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <XCircle size={32} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-900">Linking failed</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{errMsg}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-gray-600 transition-all hover:scale-[1.02]"
                style={{ background: '#eef0f5', boxShadow: '3px 3px 8px #d1d5db, -3px -3px 8px #ffffff' }}
              >
                Try again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
