import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api'

/* ── helpers ── */
function getDayLabel(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString([], { weekday: 'short' })
}

function getDateNDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

/* ── Bar chart (pure SVG, no deps) ── */
function BarChart({ data, color = '#e8533a', height = 120 }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = 28
  const gap = 14
  const totalW = data.length * (barW + gap) - gap
  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${height + 24}`} preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * height, 4)
        const x = i * (barW + gap)
        const y = height - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={6}
              fill={d.highlight ? color : '#ebebeb'} />
            <text x={x + barW / 2} y={height + 16} textAnchor="middle"
              fontSize={10} fill="#bbb" fontFamily="inherit">{d.label}</text>
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                fontSize={10} fill={d.highlight ? color : '#bbb'} fontFamily="inherit" fontWeight="600">
                {d.value}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ── Donut chart ── */
function DonutChart({ segments, size = 140 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 14
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  let offset = 0
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={14} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={14}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

/* ── Sparkline ── */
function Sparkline({ data, color = '#e8533a', height = 40 }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 120, h = height
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - (data[data.length - 1] / max) * h}
        r={3} fill={color} />
    </svg>
  )
}

/* ── Stat card ── */
function StatCard({ label, value, sub, icon, bg, color, sparkData }) {
  return (
    <div className="inner-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
      <div>
        <p style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', margin: 0, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#555', margin: '4px 0 2px' }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>{sub}</p>}
      </div>
    </div>
  )
}

/* ── Progress ring ── */
function Ring({ pct, color, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>{pct}%</span>
      </div>
    </div>
  )
}

export default function Insights() {
  const [todos, setTodos] = useState([])
  const [period, setPeriod] = useState('Week')

  useEffect(() => {
    api.get('/todos/').then(r => setTodos(r.data)).catch(() => {})
  }, [])

  /* ── derived stats ── */
  const total = todos.length
  const done = todos.filter(t => t.done).length
  const pending = todos.filter(t => !t.done).length
  const overdue = todos.filter(t => !t.done && t.due_at && new Date(t.due_at) < new Date()).length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

  /* last 7 days bar data */
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = getDateNDaysAgo(6 - i)
    const next = getDateNDaysAgo(5 - i)
    const count = todos.filter(t => {
      if (!t.due_at) return false
      const d = new Date(t.due_at)
      return d >= day && d < next
    }).length
    return { label: getDayLabel(6 - i), value: count, highlight: i === 6 }
  })

  /* completed per day (sparkline) */
  const completedSpark = Array.from({ length: 7 }, (_, i) => {
    const day = getDateNDaysAgo(6 - i)
    const next = getDateNDaysAgo(5 - i)
    return todos.filter(t => t.done && t.due_at && new Date(t.due_at) >= day && new Date(t.due_at) < next).length
  })

  /* priority breakdown */
  const highCount = todos.filter(t => t.priority === 'high').length
  const medCount = todos.filter(t => t.priority === 'medium').length
  const lowCount = todos.filter(t => t.priority === 'low').length

  const donutSegments = [
    { label: 'High', value: highCount, color: '#e8533a' },
    { label: 'Medium', value: medCount, color: '#f97316' },
    { label: 'Low', value: lowCount, color: '#22c55e' },
    { label: 'Done', value: done, color: '#6366f1' },
  ].filter(s => s.value > 0)

  /* streak — consecutive days with at least 1 task */
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const day = getDateNDaysAgo(i)
    const next = getDateNDaysAgo(i - 1)
    const hasTask = todos.some(t => t.due_at && new Date(t.due_at) >= day && new Date(t.due_at) < next)
    if (hasTask) streak++
    else if (i > 0) break
  }

  /* today */
  const todayTasks = todos.filter(t => t.due_at && new Date(t.due_at).toDateString() === new Date().toDateString())

  return (
    <Layout>
      <div className="glass-card" style={{ minHeight: 'calc(100vh - 40px)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Insights</h1>
            <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>Track your productivity performance</p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', borderRadius: 50, padding: 4 }}>
            {['Week', 'Month', 'All'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: '7px 18px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
                  background: period === p ? '#2a2a2a' : 'transparent', color: period === p ? '#fff' : '#888' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Top stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard label="Total Tasks" value={total} sub="All time" icon="📋"
            bg="#f0f4ff" color="#6366f1" sparkData={last7.map(d => d.value)} />
          <StatCard label="Completed" value={done} sub={`${completionRate}% rate`} icon="✅"
            bg="#f0fdf4" color="#22c55e" sparkData={completedSpark} />
          <StatCard label="Pending" value={pending} sub="In progress" icon="⏳"
            bg="#fff7f0" color="#f97316" sparkData={null} />
          <StatCard label="Overdue" value={overdue} sub="Need attention" icon="⚠️"
            bg="#fff0ee" color="#e8533a" sparkData={null} />
        </div>

        {/* Middle row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* Completion rate ring */}
          <div className="inner-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Completion Rate</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Ring pct={completionRate} color="#e8533a" size={100} stroke={10} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Done', value: done, color: '#e8533a' },
                  { label: 'Pending', value: pending, color: '#f0f0f0' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#888' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginLeft: 'auto' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority breakdown donut */}
          <div className="inner-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Priority Breakdown</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <DonutChart segments={donutSegments.length > 0 ? donutSegments : [{ value: 1, color: '#f0f0f0' }]} size={100} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>{total}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {[
                  { label: 'High', value: highCount, color: '#e8533a' },
                  { label: 'Medium', value: medCount, color: '#f97316' },
                  { label: 'Low', value: lowCount, color: '#22c55e' },
                  { label: 'Done', value: done, color: '#6366f1' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#888', flex: 1 }}>{item.label}</span>
                    <div style={{ flex: 2, background: '#f0f0f0', borderRadius: 50, height: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, height: '100%', background: item.color, borderRadius: 50, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', minWidth: 16, textAlign: 'right' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Streak + today */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Streak card */}
            <div className="dark-card" style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 22 }}>🔥</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak</span>
              </div>
              <div>
                <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>{streak}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>days in a row</p>
              </div>
            </div>
            {/* Today card */}
            <div className="inner-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📅</div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{todayTasks.length}</p>
                <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>tasks today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

          {/* Weekly bar chart */}
          <div className="inner-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Tasks This Week</h3>
                <p style={{ fontSize: 11, color: '#bbb', margin: '3px 0 0' }}>Daily task distribution</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#e8533a', margin: 0 }}>{last7.reduce((s, d) => s + d.value, 0)}</p>
                <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>total</p>
              </div>
            </div>
            <BarChart data={last7} color="#e8533a" height={100} />
          </div>

          {/* Performance score */}
          <div className="inner-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Performance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Completion', pct: completionRate, color: '#e8533a' },
                { label: 'On-time', pct: total > 0 ? Math.round(((total - overdue) / total) * 100) : 100, color: '#22c55e' },
                { label: 'High priority done', pct: highCount > 0 ? Math.round((todos.filter(t => t.priority === 'high' && t.done).length / highCount) * 100) : 0, color: '#6366f1' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.pct}%</span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 50, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 50, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Score */}
            <div style={{ marginTop: 'auto', background: '#f9f9f9', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#bbb', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Score</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: completionRate >= 70 ? '#22c55e' : completionRate >= 40 ? '#f97316' : '#e8533a', margin: 0 }}>
                {completionRate >= 70 ? '🌟' : completionRate >= 40 ? '👍' : '💪'} {completionRate}
              </p>
              <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0' }}>
                {completionRate >= 70 ? 'Excellent work!' : completionRate >= 40 ? 'Good progress' : 'Keep going!'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
