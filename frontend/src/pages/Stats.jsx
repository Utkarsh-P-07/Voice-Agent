import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
  RadialBarChart, RadialBar,
} from 'recharts'
import {
  TrendingUp, CheckCircle2, Clock, Zap, Brain,
  Target, Award, BarChart2,
} from 'lucide-react'
import { getStats, getTodos, getMemories } from '../api'

/* ── Theme constants ─────────────────────────────────────────────────────── */
const P_COLORS  = { high: '#f97316', medium: '#fbbf24', low: '#4ade80' }
const C_COLORS  = { preference: '#a78bfa', event: '#22d3ee', goal: '#fb923c', general: '#94a3b8' }
const GRAD_ORANGE = 'linear-gradient(135deg,#f97316,#fb923c)'
const GRAD_GREEN  = 'linear-gradient(135deg,#22c55e,#4ade80)'
const GRAD_AMBER  = 'linear-gradient(135deg,#f59e0b,#fbbf24)'
const GRAD_PURPLE = 'linear-gradient(135deg,#6366f1,#8b5cf6)'
const GRAD_CYAN   = 'linear-gradient(135deg,#06b6d4,#22d3ee)'

/* ── Custom tooltip ──────────────────────────────────────────────────────── */
function NeuTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="neu-card-sm px-4 py-3 text-xs">
      {label && <p className="font-semibold text-gray-600 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill || '#f97316' }} className="font-bold">
          {p.name ? `${p.name}: ` : ''}{p.value}
        </p>
      ))}
    </div>
  )
}

/* ── KPI card ────────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, value, label, sub, gradient, iconBg }) {
  return (
    <div className="neu-card p-5 hover-lift flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg || gradient, boxShadow: '0 4px 12px rgba(249,115,22,0.25)' }}>
          <Icon size={18} className="text-white" />
        </div>
        {sub !== undefined && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-extrabold leading-none mb-1"
          style={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {value}
        </p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
    </div>
  )
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: GRAD_ORANGE, boxShadow: '0 3px 10px rgba(249,115,22,0.3)' }}>
        <Icon size={15} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800 leading-none">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ── Donut ring (SVG) ────────────────────────────────────────────────────── */
function DonutRing({ pct = 0, size = 130, label, sublabel }) {
  const r    = size / 2 - 14
  const cx   = size / 2
  const cy   = size / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 1)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      {/* Fill */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="url(#donut-grad)" strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="donut-ring"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      {/* Centre text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1f2937">
        {label}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#9ca3af">
        {sublabel}
      </text>
    </svg>
  )
}

/* ── Activity area chart (tasks created per day, last 7 days) ────────────── */
function buildActivityData(todos) {
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const ds = d.toISOString().slice(0, 10)
    const created  = todos.filter(t => t.created_at?.slice(0, 10) === ds).length
    const completed = todos.filter(t => t.done && t.updated_at?.slice(0, 10) === ds).length
    return { day: days[d.getDay()], created, completed }
  })
}

/* ── Score badge ─────────────────────────────────────────────────────────── */
function ScoreBadge({ score }) {
  const tier =
    score >= 80 ? { label: 'Excellent', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' } :
    score >= 60 ? { label: 'Good',      color: '#f97316', bg: 'rgba(249,115,22,0.1)' } :
    score >= 40 ? { label: 'Fair',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' } :
                  { label: 'Getting started', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
  return (
    <span className="text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: tier.bg, color: tier.color }}>
      {tier.label}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Stats() {
  const [stats,    setStats]    = useState(null)
  const [todos,    setTodos]    = useState([])
  const [memories, setMemories] = useState([])
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(true)

  function load() {
    setLoading(true)
    setError('')
    Promise.all([getStats(), getTodos(), getMemories()])
      .then(([s, t, m]) => {
        setStats(s.data)
        setTodos(t.data.todos)
        setMemories(m.data.memories)
      })
      .catch(err => setError(
        err.response?.data?.detail || err.message || 'Failed to load insights.'
      ))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  /* ── Loading ── */
  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-14 h-14 rounded-3xl mx-auto mb-4 animate-pulse"
          style={{ background: GRAD_ORANGE }} />
        <p className="text-gray-500 font-medium">Loading insights…</p>
        <p className="text-gray-400 text-xs mt-1">Crunching your data</p>
      </div>
    </div>
  )

  /* ── Error ── */
  if (error) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="neu-card p-8 text-center max-w-sm">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-red-500 text-xl">⚠</span>
        </div>
        <p className="font-bold text-gray-800 mb-1">Could not load insights</p>
        <p className="text-gray-400 text-sm mb-5">{error}</p>
        <button onClick={load} className="btn-accent mx-auto">Retry</button>
      </div>
    </div>
  )

  /* ── Derived data ── */
  const td    = stats.todos
  const md    = stats.memories
  const score = td.completion_pct

  const priorityData = [
    { name: 'High',   value: td.by_priority.high,   fill: P_COLORS.high   },
    { name: 'Medium', value: td.by_priority.medium, fill: P_COLORS.medium },
    { name: 'Low',    value: td.by_priority.low,    fill: P_COLORS.low    },
  ]

  const catData = Object.entries(md.by_category).map(([n, v]) => ({
    name:  n[0].toUpperCase() + n.slice(1),
    value: v,
    fill:  C_COLORS[n] || '#94a3b8',
  }))

  const activityData = buildActivityData(todos)

  // Radial data for the score gauge
  const radialData = [{ name: 'Score', value: score, fill: '#f97316' }]

  /* ── Render ── */
  return (
    <div className="p-7 max-w-5xl space-y-7 pb-10">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-1">Performance</p>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">Insights</h1>
          <p className="text-sm text-gray-400 mt-1">A full picture of your productivity</p>
        </div>
        <ScoreBadge score={score} />
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={BarChart2}    value={td.total}          label="Total Tasks"    gradient={GRAD_PURPLE} sub="all time" />
        <KpiCard icon={CheckCircle2} value={td.done}           label="Completed"      gradient={GRAD_GREEN}  sub={`${score}%`} />
        <KpiCard icon={Clock}        value={td.pending}        label="Pending"        gradient={GRAD_AMBER}  />
        <KpiCard icon={Brain}        value={md.total}          label="Memories saved" gradient={GRAD_CYAN}   />
      </div>

      {/* ── Score + Activity row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Completion donut */}
        <div className="neu-card p-6 hover-lift flex flex-col items-center justify-center gap-3">
          <SectionHeader icon={Target} title="Completion Rate" />
          <DonutRing
            pct={score / 100}
            size={140}
            label={`${score}%`}
            sublabel={`${td.done} / ${td.total} done`}
          />
          <div className="w-full mt-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Progress</span>
              <span className="font-semibold text-gray-600">{score}%</span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden"
              style={{ background: '#e5e7eb', boxShadow: 'inset 2px 2px 4px #d1d5db' }}>
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${score}%`, background: GRAD_ORANGE }} />
            </div>
          </div>
        </div>

        {/* 7-day activity area chart */}
        <div className="md:col-span-2 neu-card p-6 hover-lift">
          <SectionHeader icon={TrendingUp} title="7-Day Activity" sub="Tasks created vs completed" />
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-completed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<NeuTooltip />} />
              <Area type="monotone" dataKey="created"   name="Created"
                stroke="#f97316" strokeWidth={2} fill="url(#grad-created)"   dot={false} />
              <Area type="monotone" dataKey="completed" name="Completed"
                stroke="#22c55e" strokeWidth={2} fill="url(#grad-completed)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex gap-5 mt-3 justify-end">
            {[['#f97316','Created'],['#22c55e','Completed']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                <span className="text-[11px] text-gray-400 font-medium">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Priority bar + Memory pie ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Priority bar chart */}
        <div className="neu-card p-6 hover-lift">
          <SectionHeader icon={Zap} title="Tasks by Priority" sub="Distribution across levels" />
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={priorityData} barSize={40} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<NeuTooltip />} cursor={{ fill: 'rgba(249,115,22,0.05)', radius: 8 }} />
              <Bar dataKey="value" name="Tasks" radius={[10, 10, 0, 0]}>
                {priorityData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Memory category pie */}
        <div className="neu-card p-6 hover-lift">
          <SectionHeader icon={Brain} title="Memory Categories" sub="What you've been saving" />
          {catData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[170px] gap-3">
              <Brain size={32} className="text-gray-300" />
              <p className="text-sm text-gray-400">No memories saved yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={68} innerRadius={32} paddingAngle={5}>
                  {catData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<NeuTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Priority breakdown bars ──────────────────────────────────────── */}
      <div className="neu-card p-6 hover-lift">
        <SectionHeader icon={Award} title="Priority Breakdown" sub="Share of total tasks per level" />
        <div className="space-y-5">
          {priorityData.map(({ name, value, fill }) => {
            const pct = td.total ? Math.round((value / td.total) * 100) : 0
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: fill }} />
                    <span className="text-sm font-semibold text-gray-700">{name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{value} task{value !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold text-gray-800 w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden"
                  style={{ background: '#e5e7eb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background:
                        name === 'High'   ? 'linear-gradient(90deg,#f97316,#fb923c)' :
                        name === 'Medium' ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                                            'linear-gradient(90deg,#22c55e,#4ade80)',
                      boxShadow: `0 0 8px ${fill}55`,
                    }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Score gauge (radial) ─────────────────────────────────────────── */}
      <div className="neu-card p-6 hover-lift">
        <SectionHeader icon={Award} title="Productivity Score" sub="Based on task completion rate" />
        <div className="flex items-center gap-8">
          {/* Radial bar */}
          <div className="flex-shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="55%" outerRadius="85%"
                startAngle={210} endAngle={-30}
                data={[{ value: 100, fill: '#e5e7eb' }, { value: score, fill: '#f97316' }]}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={false} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          {/* Score details */}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-5xl font-extrabold gradient-text leading-none">{score}%</p>
              <p className="text-sm text-gray-400 mt-1">Overall completion rate</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Completed', value: td.done,    color: '#22c55e' },
                { label: 'Pending',   value: td.pending, color: '#f59e0b' },
                { label: 'High prio', value: td.by_priority.high,   color: '#f97316' },
                { label: 'Memories',  value: md.total,   color: '#a78bfa' },
              ].map(({ label, value, color }) => (
                <div key={label} className="neu-card-sm px-3 py-2.5">
                  <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
                  <p className="text-[11px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
