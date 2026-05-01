import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import api from '../api'

/* ── tiny donut chart ── */
function Donut({ pct, color, size = 56 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eee" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

/* ── bar chart ── */
function BarChart({ data }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, background: i === data.length - 1 ? '#2a2a2a' : '#e0e0e0',
          borderRadius: 4, height: `${(v / max) * 100}%`,
          minHeight: 4, transition: 'height 0.4s ease',
        }} />
      ))}
    </div>
  )
}

/* ── AI chat panel ── */
function ChatPanel({ todos }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text, time: 'Just now' }])
    setLoading(true)
    try {
      const r = await api.post('/agent/text', { text })
      setMessages(m => [...m, { role: 'agent', text: r.data.reply, time: 'Just now' }])
    } catch {
      setMessages(m => [...m, { role: 'agent', text: 'Sorry, something went wrong.', time: 'Just now' }])
    } finally {
      setLoading(false)
    }
  }

  const today = todos.filter(t => {
    if (!t.due_at) return false
    return new Date(t.due_at).toDateString() === new Date().toDateString()
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="accent-btn" style={{ fontSize: 12 }}>
          <span>🤖</span> AI Chatbot
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 22, marginBottom: 8 }}>🤖</p>
            <p style={{ fontSize: 12, color: '#bbb' }}>Ask me anything about your tasks!</p>
            <p style={{ fontSize: 11, color: '#ddd', marginTop: 4 }}>e.g. "What's on my list today?"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'user' && (
              <p style={{ fontSize: 11, color: '#aaa', marginBottom: 4, textAlign: 'right' }}>{m.time}</p>
            )}
            <div style={{
              background: m.role === 'user' ? 'transparent' : '#fff',
              border: m.role === 'user' ? 'none' : 'none',
              borderRadius: 14,
              padding: m.role === 'agent' ? '12px 14px' : '0',
              maxWidth: '85%',
              boxShadow: m.role === 'agent' ? '0 2px 10px rgba(0,0,0,0.07)' : 'none',
            }}>
              <p style={{ fontSize: 13, color: '#333', lineHeight: 1.5, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                {m.text}
              </p>
            </div>
          </div>
        ))}

        {/* Today's task mini-cards */}
        {messages.length === 0 && today.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {today.slice(0, 2).map(t => (
              <div key={t.id} className="inner-card" style={{ padding: '10px 14px', flex: 1, minWidth: 100 }}>
                <p style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>{t.priority}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{t.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Donut pct={t.done ? 100 : 30} color="#e8533a" size={36} />
                  <span style={{ fontSize: 11, color: '#888' }}>{t.done ? '100%' : '30%'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, background: '#e8533a', borderRadius: '50%', opacity: 0.6,
                animation: `wave 0.8s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type something..."
          className="input-field"
          style={{ paddingRight: 44 }}
        />
        <button onClick={send}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#aaa',
          }}>🎤</button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])
  const [summaryTab, setSummaryTab] = useState('Weekly')

  useEffect(() => {
    api.get('/todos/').then(r => setTodos(r.data)).catch(() => {})
  }, [])

  const done = todos.filter(t => t.done).length
  const total = todos.length || 1
  const pct = Math.round((done / total) * 100)
  const pending = todos.filter(t => !t.done).length

  // Bar chart data — last 7 days task counts (simulated from todos)
  const barData = [2, 4, 3, 6, 5, 8, todos.length || 1]

  const QUICK_ACTIONS = [
    { icon: '⏸', label: 'Tasks' },
    { icon: '👤', label: 'Assign' },
    { icon: '🎤', label: 'Voice' },
    { icon: '🔔', label: 'Remind' },
    { icon: '⚙', label: 'Settings' },
  ]

  return (
    <Layout>
      {/* Outer glass card */}
      <div className="glass-card" style={{ minHeight: 'calc(100vh - 40px)', padding: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Top section: headline + chat */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* Left: headline + progress + quick actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 38, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.15, margin: 0 }}>
                Let's start<br />strong!
              </h1>
            </div>

            {/* Progress card */}
            <div className="inner-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
                  You're {pct}% to your<br />daily goal
                </p>
                <div style={{ background: '#f0f0f0', borderRadius: 50, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#e8533a', borderRadius: 50, transition: 'width 0.6s ease' }} />
                </div>
                <p style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>{done} / {todos.length} tasks</p>
              </div>
              <div style={{
                width: 44, height: 44, background: '#e8533a', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18, flexShrink: 0,
              }}>⚡</div>
            </div>

            {/* Quick action pills */}
            <div style={{ display: 'flex', gap: 10 }}>
              {QUICK_ACTIONS.map(({ icon, label }) => (
                <button key={label} className="pill-btn" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 10, color: '#888', fontWeight: 500 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: AI chat panel */}
          <div className="inner-card" style={{ padding: 20, height: 320 }}>
            <ChatPanel todos={todos} />
          </div>
        </div>

        {/* Summary section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Summary</h2>
            <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', borderRadius: 50, padding: 4 }}>
              {['Daily', 'Weekly', 'Monthly'].map(t => (
                <button key={t} onClick={() => setSummaryTab(t)}
                  style={{
                    padding: '5px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
                    background: summaryTab === t ? '#2a2a2a' : 'transparent',
                    color: summaryTab === t ? '#fff' : '#888',
                  }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 180px', gap: 16, alignItems: 'stretch' }}>

            {/* Donut chart card */}
            <div className="inner-card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={60} cy={60} r={46} fill="none" stroke="#f0f0f0" strokeWidth={12} />
                  <circle cx={60} cy={60} r={46} fill="none" stroke="#e8533a" strokeWidth={12}
                    strokeDasharray={289} strokeDashoffset={289 * (1 - pct / 100)} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                  <circle cx={60} cy={60} r={46} fill="none" stroke="#2a2a2a" strokeWidth={12}
                    strokeDasharray={289} strokeDashoffset={289 * (1 - (done > 0 ? 0.3 : 0))}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    transform="rotate(180, 60, 60)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{pct}%</span>
                </div>
              </div>
            </div>

            {/* Stats card */}
            <div className="inner-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e8533a', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>Completed</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{done}/{todos.length}</p>
                    <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>tasks</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>Pending</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{pending}</p>
                    <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>tasks</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bar chart card */}
            <div className="inner-card" style={{ padding: 20 }}>
              <p style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Tasks this week</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>{todos.length}</p>
              <BarChart data={barData} />
            </div>

            {/* Dark stat card */}
            <div className="dark-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {/* Mini arc */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <svg width={80} height={50} viewBox="0 0 80 50">
                  <path d="M 10 45 A 30 30 0 0 1 70 45" fill="none" stroke="#444" strokeWidth={8} strokeLinecap="round" />
                  <path d="M 10 45 A 30 30 0 0 1 70 45" fill="none" stroke="#e8533a" strokeWidth={8}
                    strokeLinecap="round" strokeDasharray="94" strokeDashoffset={94 * (1 - pct / 100)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>Completion</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>{pct}%</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  )
}
