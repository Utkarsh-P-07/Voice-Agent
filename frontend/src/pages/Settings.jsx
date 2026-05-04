import { useEffect, useState } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  Bell, Shield, Mic, Database, Cpu, Palette,
  Moon, Sun, Volume2, Trash2, RefreshCw, Info,
  ToggleLeft, ToggleRight, Zap, Globe, Lock
} from 'lucide-react'
import { getHealth, clearMemories, clearConversation, getTodos, deleteTodo } from '../api'
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

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <SettingSection title="Appearance">
        <SettingRow
          icon={Sun} iconBg="bg-gradient-to-br from-amber-400 to-amber-500"
          label="Theme" description="Light mode is currently active"
        >
          <span className="text-xs text-gray-400 font-medium">Light</span>
        </SettingRow>
        <SettingRow
          icon={Bell} iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
          label="Notifications" description="Task reminders and updates"
        >
          <Toggle value={prefs.notifications ?? true} onChange={v => setPref('notifications', v)} />
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
