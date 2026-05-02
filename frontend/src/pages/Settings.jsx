import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { getHealth, clearMemories, clearConversation, getTodos, deleteTodo } from '../api'

function Section({ title, icon, children }) {
  return (
    <div className="neu-card p-6 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h2 className="font-bold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const [health, setHealth] = useState(null)
  const [msg,    setMsg]    = useState('')

  useEffect(() => {
    getHealth().then(r => setHealth(r.data)).catch(() => setHealth({ status: 'error' }))
  }, [])

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  async function handleClearTodos() {
    if (!confirm('Delete ALL todos?')) return
    const { data } = await getTodos()
    await Promise.all(data.todos.map(t => deleteTodo(t.id)))
    flash('All todos cleared.')
  }
  async function handleClearMemories() {
    if (!confirm('Delete ALL memories?')) return
    await clearMemories()
    flash('All memories cleared.')
  }
  async function handleClearConversation() {
    if (!confirm('Clear conversation history?')) return
    await clearConversation()
    flash('Conversation cleared.')
  }

  return (
    <div className="p-7 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Configure your AI agent</p>
      </div>

      {msg && (
        <div className="mb-5 px-5 py-3 rounded-2xl text-sm font-medium text-green-700 flex items-center gap-2"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}

      <Section title="API Status" icon="🔑">
        {health ? (
          <div className="space-y-3">
            {[
              { label: 'Backend', ok: health.status === 'ok', val: health.status },
              { label: 'Groq API Key', ok: health.groq_configured, val: health.groq_configured ? 'Configured' : 'Not set' },
              { label: 'Model', ok: true, val: health.model },
            ].map(({ label, ok, val }) => (
              <div key={label} className="flex items-center justify-between py-2 px-4 rounded-2xl"
                style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
                <span className="text-sm text-gray-600">{label}</span>
                <div className="flex items-center gap-2">
                  {ok
                    ? <CheckCircle2 size={14} className="text-green-500" />
                    : <XCircle      size={14} className="text-red-400" />
                  }
                  <span className={`text-sm font-semibold ${ok ? 'text-gray-800' : 'text-red-500'}`}>{val}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            Checking…
          </div>
        )}
      </Section>

      <Section title="Voice Configuration" icon="🎤">
        <div className="space-y-2">
          {[
            ['STT Engine',    'Groq Whisper large-v3'],
            ['TTS Engine',    'pyttsx3 (local, offline)'],
            ['Silence Threshold', '1.8 seconds'],
            ['Max Recording', '30 seconds'],
            ['Browser API',   'MediaRecorder (WebM)'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2 px-4 rounded-2xl"
              style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
              <span className="text-sm text-gray-500">{k}</span>
              <span className="text-sm font-semibold text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Data Storage" icon="💾">
        <div className="space-y-2">
          {['todos.json', 'memory.json', 'conversation.json'].map(f => (
            <div key={f} className="flex items-center gap-3 py-2 px-4 rounded-2xl"
              style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
              <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
              <code className="text-sm text-gray-600 font-mono">data/{f}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Danger Zone" icon="⚠️">
        <div className="space-y-3">
          {[
            { label: 'Clear all todos',            action: handleClearTodos },
            { label: 'Clear all memories',         action: handleClearMemories },
            { label: 'Clear conversation history', action: handleClearConversation },
          ].map(({ label, action }) => (
            <button key={label} onClick={action}
              className="w-full text-left px-5 py-3 rounded-2xl text-sm font-medium
                         text-red-500 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                {label}
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}
