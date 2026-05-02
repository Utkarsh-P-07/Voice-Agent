import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Mic, Lightbulb, Focus, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react'
import { getTodos, getStats, createTodo } from '../api'

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

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [todos,   setTodos]   = useState([])
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ title: '', priority: 'medium' })
  const [tabView, setTabView] = useState('Weekly')

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  async function load() {
    const [s, t] = await Promise.all([getStats(), getTodos()])
    setStats(s.data)
    setTodos(t.data.todos)
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await createTodo(form.title.trim(), form.priority)
    setForm({ title: '', priority: 'medium' })
    setAdding(false)
    load()
  }

  const td      = stats?.todos
  const done    = td?.done    ?? 0
  const total   = td?.total   ?? 0
  const pending = td?.pending ?? 0
  const pct     = total > 0 ? done / total : 0
  const score   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="p-7 min-h-full flex flex-col gap-6">

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

      {/* ── Progress + Quick actions row ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Progress card */}
        <div className="col-span-2 neu-card p-6 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Daily Progress</p>
              <p className="text-lg font-bold text-gray-800">
                {total ? `You're ${score}% to your daily goal` : 'Start adding tasks!'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
              <Zap size={18} className="text-white" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 rounded-full mb-2 overflow-hidden"
            style={{ background: '#e5e7eb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${score}%`,
                background: 'linear-gradient(90deg, #f97316, #fb923c)',
                boxShadow: '0 0 10px rgba(249,115,22,0.4)',
              }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{done} completed</span>
            <span>{total} total</span>
          </div>
        </div>

        {/* Donut */}
        <div className="neu-card p-5 flex flex-col items-center justify-center hover-lift">
          <DonutRing pct={pct} size={110} />
          <p className="text-xs text-gray-400 mt-2">Completion rate</p>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <div className="neu-card p-5">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-4">Quick Actions</p>
        <div className="flex items-center gap-6">
          <QABtn icon={Plus}       label="Add Task"    onClick={() => setAdding(v => !v)} accent />
          <QABtn icon={Mic}        label="Voice Input" onClick={() => {}} />
          <QABtn icon={Lightbulb}  label="Suggest"     onClick={() => {}} />
          <QABtn icon={Focus}      label="Focus Mode"  onClick={() => {}} />
          <Link to="/todos" className="flex flex-col items-center gap-2 group cursor-pointer select-none">
            <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
              style={{ background: '#eef0f5', boxShadow: '4px 4px 10px #d1d5db, -4px -4px 10px #ffffff' }}>
              <CheckCircle2 size={20} className="text-gray-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-500">All Tasks</span>
          </Link>
        </div>

        {/* Inline add form */}
        {adding && (
          <form onSubmit={handleAdd} className="mt-4 flex gap-3 items-center">
            <input autoFocus className="neu-input flex-1" placeholder="What needs to be done?"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <select className="neu-input w-28" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" className="btn-accent">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost">✕</button>
          </form>
        )}
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
