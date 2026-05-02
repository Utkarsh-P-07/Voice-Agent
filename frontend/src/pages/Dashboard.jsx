import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Mic, MicOff, Lightbulb, Focus, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { getTodos, getStats, createTodo, sendVoice } from '../api'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import NeuSelect from '../components/NeuSelect'
import AddTaskModal from '../components/AddTaskModal'

const PRIORITY_OPTS = [
  { value: 'low',    label: 'Low',    dot: 'bg-green-400' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400'  },
  { value: 'high',   label: 'High',   dot: 'bg-orange-500' },
]

/* ── Donut ring ──────────────────────────────────────────────────────────── */
function DonutRing({ pct = 0, size = 110 }) {
  const r = size / 2 - 12
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 1)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="url(#og)" strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="donut-ring" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <defs>
        <linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f2937">
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="#9ca3af">done</text>
    </svg>
  )
}

/* ── Weekly bar chart ────────────────────────────────────────────────────── */
function WeeklyChart({ todos }) {
  const days = ['S','M','T','W','T','F','S']
  const counts = Array(7).fill(0)
  todos.forEach(t => { counts[new Date(t.created_at).getDay()]++ })
  const max = Math.max(...counts, 1)
  const today = new Date().getDay()
  const W = 200, H = 70, bw = 18, gap = 10

  return (
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`}>
      {counts.map((v, i) => {
        const bh = Math.max(4, (v / max) * H)
        const x  = i * (bw + gap) + 6
        const y  = H - bh
        const isToday = i === today
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="5"
              fill={isToday ? 'url(#og2)' : '#e5e7eb'} />
            <text x={x + bw / 2} y={H + 14} textAnchor="middle"
              fontSize="9" fill={isToday ? '#f97316' : '#9ca3af'}
              fontWeight={isToday ? '600' : '400'}>{days[i]}</text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="og2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ── Quick action button ─────────────────────────────────────────────────── */
function QABtn({ icon: Icon, label, onClick, accent = false }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 group cursor-pointer select-none">
      <div className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center
                       transition-all duration-200 group-hover:scale-105 group-active:scale-95`}
        style={accent
          ? { background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 6px 16px rgba(249,115,22,0.35)' }
          : { background: '#eef0f5', boxShadow: '4px 4px 10px #d1d5db, -4px -4px 10px #ffffff' }
        }>
        <Icon size={20} className={accent ? 'text-white' : 'text-gray-600'} />
      </div>
      <span className={`text-[11px] font-medium ${accent ? 'text-orange-500' : 'text-gray-500'}`}>{label}</span>
    </button>
  )
}

/* ── Stat mini card ──────────────────────────────────────────────────────── */
function MiniStat({ icon: Icon, value, label, color }) {
  return (
    <div className="stat-card hover-lift">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}

/* ── Voice mic button ────────────────────────────────────────────────────── */
function VoiceMicButton({ onTaskAdded }) {
  const { isRecording, startRecording, stopRecording, audioBlob } = useVoiceRecorder()
  const [phase,      setPhase]      = useState('idle')   // idle | listening | processing | done | error
  const [transcript, setTranscript] = useState('')
  const [errMsg,     setErrMsg]     = useState('')
  const doneTimer = useRef(null)

  // When audioBlob is ready, send to backend
  useEffect(() => {
    if (!audioBlob) return
    setPhase('processing')
    sendVoice(audioBlob)
      .then(({ data }) => {
        const text = data.transcript?.trim()
        if (text) {
          setTranscript(text)
          setPhase('done')
          onTaskAdded()                          // refresh todo list
          doneTimer.current = setTimeout(() => {
            setPhase('idle')
            setTranscript('')
          }, 3000)
        } else {
          setErrMsg("Didn't catch that — try again")
          setPhase('error')
          doneTimer.current = setTimeout(() => setPhase('idle'), 2500)
        }
      })
      .catch(() => {
        setErrMsg('Voice error — is the backend running?')
        setPhase('error')
        doneTimer.current = setTimeout(() => setPhase('idle'), 2500)
      })
    return () => clearTimeout(doneTimer.current)
  }, [audioBlob])

  function handleClick() {
    if (phase === 'processing') return
    if (isRecording) {
      stopRecording()
      setPhase('processing')
    } else {
      setPhase('listening')
      startRecording()
    }
  }

  // Styles per phase
  const btnStyle =
    phase === 'listening'  ? { background: 'linear-gradient(135deg,#ef4444,#f87171)', boxShadow: '0 0 0 0 rgba(239,68,68,0.5)' } :
    phase === 'processing' ? { background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' } :
    phase === 'done'       ? { background: 'linear-gradient(135deg,#22c55e,#4ade80)', boxShadow: '0 8px 24px rgba(34,197,94,0.4)' } :
    phase === 'error'      ? { background: 'linear-gradient(135deg,#ef4444,#f87171)', boxShadow: '0 8px 24px rgba(239,68,68,0.35)' } :
                             { background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 8px 28px rgba(249,115,22,0.45)' }

  const label =
    phase === 'listening'  ? 'Tap to stop' :
    phase === 'processing' ? 'Processing…' :
    phase === 'done'       ? 'Task added!' :
    phase === 'error'      ? 'Try again'   :
                             'Voice Task'

  return (
    <div className="flex flex-col items-center justify-center gap-3 select-none">

      {/* Outer pulse ring — only while listening */}
      <div className="relative flex items-center justify-center">
        {phase === 'listening' && (
          <>
            <span className="absolute w-24 h-24 rounded-full animate-ping"
              style={{ background: 'rgba(239,68,68,0.15)', animationDuration: '1s' }} />
            <span className="absolute w-20 h-20 rounded-full animate-ping"
              style={{ background: 'rgba(239,68,68,0.1)', animationDuration: '1.4s', animationDelay: '0.2s' }} />
          </>
        )}

        {/* Main button */}
        <button
          onClick={handleClick}
          disabled={phase === 'processing'}
          className="relative w-16 h-16 rounded-full flex items-center justify-center
                     transition-all duration-300 hover:scale-110 active:scale-95
                     disabled:cursor-not-allowed disabled:opacity-80"
          style={btnStyle}
        >
          {phase === 'processing' ? (
            <div className="w-6 h-6 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
          ) : phase === 'done' ? (
            <CheckCircle2 size={26} className="text-white" />
          ) : isRecording ? (
            <MicOff size={26} className="text-white" />
          ) : (
            <Mic size={26} className="text-white" />
          )}
        </button>
      </div>

      {/* Label */}
      <div className="text-center min-h-[32px]">
        <p className={`text-xs font-semibold transition-colors ${
          phase === 'listening'  ? 'text-red-500' :
          phase === 'done'       ? 'text-green-600' :
          phase === 'error'      ? 'text-red-400' :
          phase === 'processing' ? 'text-amber-500' :
                                   'text-gray-500'
        }`}>{label}</p>
        {phase === 'done' && transcript && (
          <p className="text-[10px] text-gray-400 mt-0.5 max-w-[90px] truncate" title={transcript}>
            "{transcript}"
          </p>
        )}
        {phase === 'error' && (
          <p className="text-[10px] text-red-400 mt-0.5 max-w-[90px] text-center leading-tight">
            {errMsg}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats,     setStats]     = useState(null)
  const [todos,     setTodos]     = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [tabView,   setTabView]   = useState('Weekly')

  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  async function load() {
    const [s, t] = await Promise.all([getStats(), getTodos()])
    setStats(s.data)
    setTodos(t.data.todos)
  }
  useEffect(() => { load() }, [])

  const td      = stats?.todos
  const done    = td?.done    ?? 0
  const total   = td?.total   ?? 0
  const pending = td?.pending ?? 0
  const score   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="p-7 min-h-full flex flex-col gap-6">

      {/* ── Add Task Modal ───────────────────────────────────────────────── */}
      <AddTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium mb-1">{greet} 👋</p>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            Let's stay <span className="gradient-text">productive!</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {total > 0
              ? `You have ${pending} task${pending !== 1 ? 's' : ''} remaining today.`
              : 'No tasks yet — add your first one!'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
        </div>
      </div>

      {/* ── Mic button — full-width card at the top ─────────────────────── */}
      <div className="neu-card p-6 flex flex-col items-center justify-center gap-2 hover-lift">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">Voice Task</p>
        <VoiceMicButton onTaskAdded={load} />
        <p className="text-xs text-gray-400 mt-1">Tap the mic and say your task out loud</p>
      </div>

      {/* ── Today's Tasks + Quick Actions row ───────────────────────────── */}
      <div className="grid grid-cols-4 gap-5 items-stretch">

        {/* Today's Tasks card — 3 cols */}
        <div className="col-span-3 neu-card p-6 hover-lift flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Today's Tasks</p>
              <p className="text-lg font-bold text-gray-800">
                {todos.length === 0
                  ? 'No tasks yet — add your first one!'
                  : `${pending} task${pending !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{done}/{total} done</span>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
                <CheckCircle2 size={18} className="text-white" />
              </div>
            </div>
          </div>

          {/* Task list */}
          {todos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
              <CheckCircle2 size={32} className="text-gray-200" />
              <p className="text-sm text-gray-400">No tasks yet. Use the mic or Add Task to get started.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-48 pr-1">
              {todos.slice().reverse().map(t => {
                const dotColor = t.done ? 'bg-green-400'
                  : t.priority === 'high'   ? 'bg-orange-500'
                  : t.priority === 'medium' ? 'bg-amber-400'
                  : 'bg-gray-300'
                const pillStyle = t.done
                  ? 'bg-green-100 text-green-600'
                  : t.priority === 'high'   ? 'bg-orange-100 text-orange-600'
                  : t.priority === 'medium' ? 'bg-amber-100 text-amber-600'
                  : 'bg-gray-100 text-gray-500'
                return (
                  <div key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all hover:bg-white/60"
                    style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className={`flex-1 text-sm font-medium truncate ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {t.title}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pillStyle}`}>
                      {t.done ? 'done' : t.priority}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Mini progress bar at bottom */}
          {todos.length > 0 && (
            <div className="mt-4">
              <div className="relative h-2 rounded-full overflow-hidden"
                style={{ background: '#e5e7eb', boxShadow: 'inset 2px 2px 4px #d1d5db' }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{ width: `${score}%`, background: 'linear-gradient(90deg,#f97316,#fb923c)' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{done} completed</span>
                <span className="font-semibold text-orange-500">{score}%</span>
                <span>{total} total</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions — 1 col, same width as weekly chart */}
        <div className="col-span-1 neu-card p-5 hover-lift flex flex-col">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-4">Quick Actions</p>
          <div className="flex flex-col gap-3 flex-1 justify-center">
            {[
              { icon: Plus,         label: 'Add Task', onClick: () => setModalOpen(true), accent: true },
              { icon: Lightbulb,    label: 'Suggest',  onClick: () => {} },
              { icon: Focus,        label: 'Focus',    onClick: () => {} },
            ].map(({ icon: Icon, label, onClick, accent }) => (
              <button key={label} onClick={onClick}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={accent
                  ? { background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }
                  : { background: '#eef0f5', boxShadow: '3px 3px 8px #d1d5db, -3px -3px 8px #ffffff' }
                }>
                <Icon size={15} className={accent ? 'text-white' : 'text-gray-500'} />
                <span className={`text-xs font-semibold ${accent ? 'text-white' : 'text-gray-600'}`}>{label}</span>
              </button>
            ))}
            <Link to="/todos"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
              style={{ background: '#eef0f5', boxShadow: '3px 3px 8px #d1d5db, -3px -3px 8px #ffffff' }}>
              <CheckCircle2 size={15} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">All Tasks</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom: Stats + Chart ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-5">

        {/* Stat cards */}
        <MiniStat icon={CheckCircle2} value={done}    label="Completed"        color="bg-gradient-to-br from-green-400 to-green-500" />
        <MiniStat icon={Clock}        value={pending}  label="Pending"          color="bg-gradient-to-br from-amber-400 to-amber-500" />
        <MiniStat icon={TrendingUp}   value={`${score}%`} label="Productivity" color="bg-gradient-to-br from-orange-400 to-orange-500" />

        {/* Weekly chart card */}
        <div className="col-span-1 neu-card p-5 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700">Weekly</p>
            <div className="flex gap-1">
              {['D','W','M'].map(t => (
                <button key={t} onClick={() => setTabView(t === 'D' ? 'Daily' : t === 'W' ? 'Weekly' : 'Monthly')}
                  className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors
                    ${tabView.startsWith(t === 'D' ? 'D' : t === 'W' ? 'W' : 'M')
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-400 hover:text-gray-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <WeeklyChart todos={todos} />
        </div>
      </div>

      {/* ── Recent tasks ─────────────────────────────────────────────────── */}
      {todos.length > 0 && (
        <div className="neu-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-800">Recent Tasks</p>
            <Link to="/todos" className="text-xs text-orange-500 hover:text-orange-600 font-medium">See all →</Link>
          </div>
          <div className="space-y-2">
            {todos.slice(-4).reverse().map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-2xl transition-all hover:bg-white/50">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.done ? 'bg-green-400' :
                  t.priority === 'high' ? 'bg-orange-500' :
                  t.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'
                }`} />
                <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {t.title}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  t.done ? 'bg-green-100 text-green-600' :
                  t.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                  t.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {t.done ? 'done' : t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
