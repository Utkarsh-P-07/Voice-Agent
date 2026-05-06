import { useEffect, useState, useCallback, useRef } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  Bell, BellOff, BellRing, Shield, Mic, Database, Cpu, Palette,
  Moon, Sun, Volume2, Trash2, RefreshCw, Info,
  ToggleLeft, ToggleRight, Zap, Globe, Lock,
  Smartphone, Monitor, Tablet, Plus, Send, QrCode, X, Clock
} from 'lucide-react'
import QRCode from 'qrcode'
import { getHealth, clearMemories, clearConversation, getTodos, deleteTodo,
         getVapidKey, subscribePush, unsubscribePush, getPushSubscriptions, sendTestPush,
         generateQR, listDevices, removeDevice } from '../api'
import { useAuth } from '../context/AuthContext'

/* ── Toggle switch ─────────────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
      style={value
        ? { background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }
        : { background: '#d1d5db' }
      }
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
        style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

/* ── Setting row ───────────────────────────────────────────────────────── */
function SettingRow({ icon: Icon, iconBg, label, description, children, onClick, danger }) {
  const base = "flex items-center gap-4 px-4 py-3.5 transition-all duration-150"
  return (
    <div
      className={`${base} ${onClick ? 'cursor-pointer hover:bg-white/40 active:bg-white/60' : ''} ${danger ? 'group' : ''}`}
      onClick={onClick}
    >
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-red-500' : 'text-gray-800'}`}>{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
      {onClick && !children && (
        <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
      )}
    </div>
  )
}

/* ── Section card ──────────────────────────────────────────────────────── */
function SettingSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{title}</p>
      <div className="neu-card overflow-hidden divide-y divide-gray-200/60">
        {children}
      </div>
    </div>
  )
}

/* ── Status badge ──────────────────────────────────────────────────────── */
function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
      ok ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-400'}`} />
      {label}
    </span>
  )
}

/* ── Confirm modal ─────────────────────────────────────────────────────── */
function ConfirmModal({ open, title, description, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="neu-card p-6 w-full max-w-sm fade-in-up">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(239,68,68,0.1)' }}>
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-gray-600 transition-all hover:bg-white/60"
            style={{ background: '#eef0f5', boxShadow: '3px 3px 8px #d1d5db, -3px -3px 8px #ffffff' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#ef4444,#f87171)', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ msg, type = 'success' }) {
  if (!msg) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 fade-in-up">
      <div className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl ${
        type === 'success' ? 'text-green-700' : 'text-red-600'
      }`}
        style={type === 'success'
          ? { background: 'rgba(240,253,244,0.95)', border: '1px solid rgba(34,197,94,0.25)', backdropFilter: 'blur(12px)' }
          : { background: 'rgba(254,242,242,0.95)', border: '1px solid rgba(239,68,68,0.25)', backdropFilter: 'blur(12px)' }
        }>
        {type === 'success'
          ? <CheckCircle2 size={16} className="text-green-500" />
          : <XCircle size={16} className="text-red-400" />
        }
        {msg}
      </div>
    </div>
  )
}

/* ── QR Modal ──────────────────────────────────────────────────────────── */
function QRModal({ open, onClose }) {
  const canvasRef  = useRef(null)
  const [link,     setLink]     = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [timeLeft, setTimeLeft] = useState(300)   // 5 min

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    setTimeLeft(300)

    generateQR()
      .then(async ({ data }) => {
        setLink(data.link)
        setTimeLeft(data.expires_in)
        // Draw QR onto canvas
        await QRCode.toCanvas(canvasRef.current, data.link, {
          width:            220,
          margin:           2,
          color: { dark: '#1c1c1e', light: '#eef0f5' },
        })
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to generate QR code.')
        setLoading(false)
      })
  }, [open])

  // Countdown timer
  useEffect(() => {
    if (!open || loading || error) return
    const id = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(id); return 0 }
      return t - 1
    }), 1000)
    return () => clearInterval(id)
  }, [open, loading, error])

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-xs rounded-3xl p-6 relative fade-in-up"
        style={{ background: '#eef0f5', boxShadow: '20px 20px 50px #c8cad0, -20px -20px 50px #ffffff' }}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center
                     text-gray-400 hover:text-gray-600 transition-colors"
          style={{ background: '#e2e4ea', boxShadow: '2px 2px 5px #d1d5db, -2px -2px 5px #ffffff' }}>
          <X size={13} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
            <QrCode size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Add a device</p>
            <p className="text-xs text-gray-400">Scan with the other device's camera</p>
          </div>
        </div>

        {/* QR area */}
        <div className="flex flex-col items-center">
          {loading && (
            <div className="w-[220px] h-[220px] flex items-center justify-center rounded-2xl"
              style={{ background: '#e2e4ea' }}>
              <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-400 animate-spin" />
            </div>
          )}
          {error && (
            <div className="w-[220px] h-[220px] flex flex-col items-center justify-center gap-2 rounded-2xl"
              style={{ background: '#e2e4ea' }}>
              <XCircle size={28} className="text-red-400" />
              <p className="text-xs text-red-400 text-center px-4">{error}</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="rounded-2xl"
            style={{ display: loading || error ? 'none' : 'block' }}
          />
        </div>

        {/* Timer */}
        {!loading && !error && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Clock size={12} className={timeLeft < 60 ? 'text-red-400' : 'text-gray-400'} />
            <span className={`text-xs font-mono font-semibold ${timeLeft < 60 ? 'text-red-400' : 'text-gray-500'}`}>
              {timeLeft > 0 ? `Expires in ${mins}:${secs}` : 'Expired — close and try again'}
            </span>
          </div>
        )}

        {/* Instructions */}
        {!loading && !error && timeLeft > 0 && (
          <div className="mt-4 px-3 py-2.5 rounded-2xl text-xs text-gray-500 leading-relaxed text-center"
            style={{ background: '#e2e4ea', boxShadow: 'inset 2px 2px 5px #d1d5db' }}>
            Open the camera app on the other device and point it at this QR code.
            It will open a page to choose permissions and link automatically.
          </div>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [health,  setHealth]  = useState(null)
  const [toast,   setToast]   = useState({ msg: '', type: 'success' })
  const [confirm, setConfirm] = useState(null)   // { title, description, action }

  // Preferences (stored in localStorage)
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('va_prefs')) || {} } catch { return {} }
  })

  function setPref(key, val) {
    const next = { ...prefs, [key]: val }
    setPrefs(next)
    localStorage.setItem('va_prefs', JSON.stringify(next))
  }

  useEffect(() => {
    getHealth().then(r => setHealth(r.data)).catch(() => setHealth({ status: 'error' }))
  }, [])

  // ── Push notification state ────────────────────────────────────────────────
  const [pushPermission,  setPushPermission]  = useState(Notification?.permission ?? 'default')
  const [pushSubscribed,  setPushSubscribed]  = useState(false)
  const [pushDevices,     setPushDevices]     = useState([])
  const [pushLoading,     setPushLoading]     = useState(false)
  const [swReady,         setSwReady]         = useState(false)
  const [qrOpen,          setQrOpen]          = useState(false)
  const [linkedDevices,   setLinkedDevices]   = useState([])

  // Check SW + existing subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg => {
      setSwReady(true)
      return reg.pushManager.getSubscription()
    }).then(sub => {
      setPushSubscribed(!!sub)
    }).catch(() => {})
    loadDevices()
  }, [])

  async function loadDevices() {
    try {
      const { data } = await getPushSubscriptions()
      setPushDevices(data.subscriptions || [])
    } catch { setPushDevices([]) }
    try {
      const { data } = await listDevices()
      setLinkedDevices(data.devices || [])
    } catch { setLinkedDevices([]) }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw     = atob(base64)
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
  }

  function deviceLabel() {
    const ua = navigator.userAgent
    if (/iPhone|iPad/.test(ua))  return 'iPhone / iPad'
    if (/Android/.test(ua))      return 'Android device'
    if (/Macintosh/.test(ua))    return 'Mac — ' + (navigator.platform || 'Browser')
    if (/Windows/.test(ua))      return 'Windows — ' + getBrowserName()
    return getBrowserName()
  }

  function getBrowserName() {
    const ua = navigator.userAgent
    if (ua.includes('Chrome'))  return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari'))  return 'Safari'
    if (ua.includes('Edge'))    return 'Edge'
    return 'Browser'
  }

  function deviceIcon(name = '') {
    const n = name.toLowerCase()
    if (n.includes('iphone') || n.includes('android')) return Smartphone
    if (n.includes('ipad') || n.includes('tablet'))    return Tablet
    return Monitor
  }

  async function handleEnablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      flash('Push notifications are not supported in this browser.', 'error')
      return
    }
    setPushLoading(true)
    try {
      // 1. Request permission
      const perm = await Notification.requestPermission()
      setPushPermission(perm)
      if (perm !== 'granted') {
        flash('Notification permission denied.', 'error')
        return
      }

      // 2. Get VAPID public key
      const { data: vapidData } = await getVapidKey()
      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey)

      // 3. Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
      const subJson = sub.toJSON()

      // 4. Send to backend
      await subscribePush(subJson, deviceLabel())
      setPushSubscribed(true)
      await loadDevices()
      flash('Notifications enabled on this device! ✅')
    } catch (err) {
      flash('Failed to enable notifications: ' + err.message, 'error')
    } finally {
      setPushLoading(false)
    }
  }

  async function handleDisablePush() {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribePush(sub.endpoint)
        await sub.unsubscribe()
      }
      setPushSubscribed(false)
      await loadDevices()
      flash('Notifications disabled on this device.')
    } catch {
      flash('Failed to disable notifications.', 'error')
    } finally {
      setPushLoading(false)
    }
  }

  async function handleRemoveDevice(endpoint) {
    try {
      await unsubscribePush(endpoint)
      await loadDevices()
      flash('Device removed.')
    } catch {
      flash('Failed to remove device.', 'error')
    }
  }

  async function handleTestPush() {
    try {
      await sendTestPush()
      flash('Test notification sent!')
    } catch {
      flash('Failed to send test notification.', 'error')
    }
  }

  function flash(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000)
  }

  function askConfirm(title, description, action) {
    setConfirm({ title, description, action })
  }

  async function runConfirmed() {
    const action = confirm.action
    setConfirm(null)
    await action()
  }

  async function handleClearTodos() {
    try {
      const { data } = await getTodos()
      await Promise.all(data.todos.map(t => deleteTodo(t.id)))
      flash('All todos deleted.')
    } catch { flash('Failed to clear todos.', 'error') }
  }

  async function handleClearMemories() {
    try {
      await clearMemories()
      flash('All memories cleared.')
    } catch { flash('Failed to clear memories.', 'error') }
  }

  async function handleClearConversation() {
    try {
      await clearConversation()
      flash('Conversation history cleared.')
    } catch { flash('Failed to clear conversation.', 'error') }
  }

  return (
    <div className="p-7">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your preferences and data</p>
      </div>

      {/* ── Account ─────────────────────────────────────────────────────── */}
      <SettingSection title="Account">
        <div className="flex items-center gap-4 px-4 py-4">
          {user?.picture
            ? <img src={user.picture} alt="avatar" className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" />
            : (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-lg font-bold"
                style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
                {user?.avatar || user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Guest'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || 'Not signed in'}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
              {user?.provider === 'google' ? '🔵 Google' : user?.provider === 'github' ? '⚫ GitHub' : '✉️ Email'}
            </span>
          </div>
        </div>
      </SettingSection>

      {/* ── Notifications & Devices ─────────────────────────────────── */}
      <SettingSection title="Notifications & Devices">

        {/* This device — push enable/disable */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              pushPermission === 'granted' ? 'bg-gradient-to-br from-green-400 to-green-500'
              : pushPermission === 'denied' ? 'bg-gradient-to-br from-red-400 to-red-500'
              : 'bg-gradient-to-br from-blue-400 to-blue-500'
            }`}>
              {pushPermission === 'granted'
                ? <BellRing size={16} className="text-white" />
                : pushPermission === 'denied'
                ? <BellOff  size={16} className="text-white" />
                : <Bell     size={16} className="text-white" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">This device</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {pushPermission === 'granted' && pushSubscribed  ? 'Notifications active'
                : pushPermission === 'granted' && !pushSubscribed ? 'Permission granted — not subscribed'
                : pushPermission === 'denied'                     ? 'Blocked in browser settings'
                : 'Enable push notifications on this device'}
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
              pushPermission === 'granted' && pushSubscribed  ? 'bg-green-100 text-green-600'
              : pushPermission === 'denied'                   ? 'bg-red-100 text-red-500'
              : 'bg-gray-100 text-gray-500'
            }`}>
              {pushPermission === 'granted' && pushSubscribed ? 'ON' : pushPermission === 'denied' ? 'BLOCKED' : 'OFF'}
            </span>
          </div>

          {pushPermission === 'denied' ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-2xl text-xs text-amber-700"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span>Blocked. Open browser site settings, allow notifications, then reload.</span>
            </div>
          ) : !('serviceWorker' in navigator) ? (
            <p className="text-xs text-gray-400 px-1">Push not supported in this browser.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {!pushSubscribed ? (
                <button onClick={handleEnablePush} disabled={pushLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white
                             transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
                  {pushLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Bell size={14} />}
                  Enable here
                </button>
              ) : (
                <>
                  <button onClick={handleTestPush}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-600
                               transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: '#eef0f5', boxShadow: '3px 3px 8px #d1d5db, -3px -3px 8px #ffffff' }}>
                    <Send size={13} /> Test
                  </button>
                  <button onClick={handleDisablePush} disabled={pushLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-red-500
                               transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    style={{ background: '#eef0f5', boxShadow: '3px 3px 8px #d1d5db, -3px -3px 8px #ffffff' }}>
                    {pushLoading ? <div className="w-4 h-4 rounded-full border-2 border-red-200 border-t-red-400 animate-spin" /> : <BellOff size={13} />}
                    Disable
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Add Device button ──────────────────────────────────────── */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setQrOpen(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl
                       text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 14px rgba(249,115,22,0.3)', color: '#fff' }}
          >
            <QrCode size={15} />
            Add another device via QR
          </button>
        </div>

        {/* ── Linked devices list ────────────────────────────────────── */}
        {linkedDevices.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Linked devices ({linkedDevices.length})
            </p>
            <div className="flex flex-col gap-2">
              {linkedDevices.map((dev, i) => {
                const DevIcon = deviceIcon(dev.device_name)
                return (
                  <div key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                    style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
                      <DevIcon size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{dev.device_name || 'Unknown device'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-[10px] text-gray-400">Added {dev.created_at?.slice(0, 10)}</p>
                        {dev.allow_calendar && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-500">Calendar</span>}
                        {dev.allow_alarm    && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-500">Alarm</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDevice(dev.endpoint)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300
                                 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Notification type toggles */}
        <SettingRow
          icon={BellRing} iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
          label="Notify on new task" description="Push to all devices when a task is added"
        >
          <Toggle value={prefs.notifyNewTask ?? true} onChange={v => setPref('notifyNewTask', v)} />
        </SettingRow>
        <SettingRow
          icon={CheckCircle2} iconBg="bg-gradient-to-br from-green-400 to-green-500"
          label="Notify on task done" description="Confirm when a task is marked complete"
        >
          <Toggle value={prefs.notifyDone ?? false} onChange={v => setPref('notifyDone', v)} />
        </SettingRow>

      </SettingSection>

      {/* QR Modal */}
      <QRModal open={qrOpen} onClose={() => { setQrOpen(false); loadDevices() }} />

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <SettingSection title="Appearance">
        <SettingRow
          icon={Sun} iconBg="bg-gradient-to-br from-amber-400 to-amber-500"
          label="Theme" description="Light mode is currently active"
        >
          <span className="text-xs text-gray-400 font-medium">Light</span>
        </SettingRow>
        <SettingRow
          icon={Zap} iconBg="bg-gradient-to-br from-purple-400 to-purple-500"
          label="Animations" description="Smooth transitions and effects"
        >
          <Toggle value={prefs.animations ?? true} onChange={v => setPref('animations', v)} />
        </SettingRow>
      </SettingSection>

      {/* ── Voice & AI ──────────────────────────────────────────────────── */}
      <SettingSection title="Voice & AI">
        <SettingRow
          icon={Mic} iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
          label="Voice Input" description="Groq Whisper large-v3"
        >
          <StatusBadge ok={health?.groq_configured} label={health?.groq_configured ? 'Active' : 'No key'} />
        </SettingRow>
        <SettingRow
          icon={Volume2} iconBg="bg-gradient-to-br from-green-400 to-green-500"
          label="Text-to-Speech" description="pyttsx3 — local, offline"
        >
          <Toggle value={prefs.tts ?? true} onChange={v => setPref('tts', v)} />
        </SettingRow>
        <SettingRow
          icon={Cpu} iconBg="bg-gradient-to-br from-indigo-400 to-indigo-500"
          label="AI Model" description="Chat and task understanding"
        >
          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg">
            {health?.model ?? '…'}
          </span>
        </SettingRow>
        <SettingRow
          icon={Globe} iconBg="bg-gradient-to-br from-cyan-400 to-cyan-500"
          label="Auto-suggest Tasks" description="AI suggests tasks based on context"
        >
          <Toggle value={prefs.autoSuggest ?? false} onChange={v => setPref('autoSuggest', v)} />
        </SettingRow>
      </SettingSection>

      {/* ── System Status ───────────────────────────────────────────────── */}
      <SettingSection title="System Status">
        <SettingRow
          icon={Cpu} iconBg="bg-gradient-to-br from-gray-500 to-gray-600"
          label="Backend Server" description="http://localhost:8000"
        >
          <StatusBadge ok={health?.status === 'ok'} label={health ? (health.status === 'ok' ? 'Online' : 'Error') : '…'} />
        </SettingRow>
        <SettingRow
          icon={Database} iconBg="bg-gradient-to-br from-teal-400 to-teal-500"
          label="Database" description={health?.db === 'mongodb' ? 'MongoDB Atlas' : 'Local JSON fallback'}
        >
          <StatusBadge
            ok={health?.db_connected !== false}
            label={health?.db === 'mongodb' ? (health?.db_connected ? 'Connected' : 'Error') : 'Local'}
          />
        </SettingRow>
        <SettingRow
          icon={Lock} iconBg="bg-gradient-to-br from-emerald-400 to-emerald-500"
          label="Groq API Key" description="Required for voice and AI features"
        >
          <StatusBadge ok={health?.groq_configured} label={health?.groq_configured ? 'Set' : 'Missing'} />
        </SettingRow>
      </SettingSection>

      {/* ── Privacy & Data ──────────────────────────────────────────────── */}
      <SettingSection title="Privacy & Data">
        <SettingRow
          icon={Shield} iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          label="Save Conversation History" description="Persist chat across sessions"
        >
          <Toggle value={prefs.saveHistory ?? true} onChange={v => setPref('saveHistory', v)} />
        </SettingRow>
        <SettingRow
          icon={Database} iconBg="bg-gradient-to-br from-violet-400 to-violet-500"
          label="Memory Learning" description="Let AI remember your preferences"
        >
          <Toggle value={prefs.memoryLearning ?? true} onChange={v => setPref('memoryLearning', v)} />
        </SettingRow>
      </SettingSection>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <SettingSection title="Danger Zone">
        <SettingRow
          icon={Trash2} iconBg="bg-gradient-to-br from-red-400 to-red-500"
          label="Clear All Todos" description="Permanently delete every task"
          danger
          onClick={() => askConfirm(
            'Delete all todos?',
            'This will permanently remove every task. This action cannot be undone.',
            handleClearTodos
          )}
        />
        <SettingRow
          icon={Trash2} iconBg="bg-gradient-to-br from-red-400 to-red-500"
          label="Clear All Memories" description="Wipe everything the AI has learned"
          danger
          onClick={() => askConfirm(
            'Clear all memories?',
            'The AI will forget all stored preferences, goals, and events.',
            handleClearMemories
          )}
        />
        <SettingRow
          icon={RefreshCw} iconBg="bg-gradient-to-br from-orange-400 to-orange-500"
          label="Clear Conversation" description="Reset the chat history"
          danger
          onClick={() => askConfirm(
            'Clear conversation history?',
            'All chat messages will be removed. Your tasks and memories are unaffected.',
            handleClearConversation
          )}
        />
      </SettingSection>

      {/* App version */}
      <div className="flex items-center justify-center gap-2 mt-2 mb-4">
        <Info size={12} className="text-gray-300" />
        <p className="text-xs text-gray-300">Voice Todo Agent · v2.0.0</p>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        description={confirm?.description}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />

      {/* Toast */}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  )
}
