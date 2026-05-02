import { useEffect, useState } from 'react'
import { getStats, getMemories } from '../api'

const CAT_STYLE = {
  preference: 'bg-purple-100 text-purple-600',
  event:      'bg-cyan-100 text-cyan-600',
  goal:       'bg-orange-100 text-orange-600',
  general:    'bg-gray-100 text-gray-500',
}

export default function Profile() {
  const [stats,    setStats]    = useState(null)
  const [memories, setMemories] = useState([])

  useEffect(() => {
    Promise.all([getStats(), getMemories()]).then(([s, m]) => {
      setStats(s.data)
      setMemories(m.data.memories.slice(-5).reverse())
    })
  }, [])

  const td = stats?.todos
  const md = stats?.memories

  return (
    <div className="p-7 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-400 mt-1">Your AI agent overview</p>
      </div>

      {/* Avatar card */}
      <div className="neu-card p-6 flex items-center gap-6 mb-6 hover-lift">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}>
          👤
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Voice Agent User</h2>
          <p className="text-sm text-gray-400 mt-1">Powered by Groq · llama-3.3-70b-versatile</p>
          <p className="text-xs text-gray-400 mt-0.5">Whisper large-v3 · pyttsx3 TTS</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { val: td.total, lbl: 'Total Tasks',  grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
            { val: td.done,  lbl: 'Completed',    grad: 'linear-gradient(135deg,#22c55e,#4ade80)' },
            { val: md.total, lbl: 'Memories',     grad: 'linear-gradient(135deg,#f97316,#fb923c)' },
          ].map(({ val, lbl, grad }) => (
            <div key={lbl} className="neu-card p-5 text-center hover-lift">
              <p className="text-3xl font-extrabold mb-1"
                style={{ background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {val}
              </p>
              <p className="text-xs text-gray-400 font-medium">{lbl}</p>
            </div>
          ))}
        </div>
      )}

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
