import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { getStats } from '../api'

const P_COLORS = { high: '#f97316', medium: '#fbbf24', low: '#4ade80' }
const C_COLORS = { preference: '#a78bfa', event: '#22d3ee', goal: '#fb923c', general: '#94a3b8' }

function StatCard({ value, label, sub, gradient }) {
  return (
    <div className="neu-card p-6 hover-lift">
      <p className="text-4xl font-extrabold mb-1"
        style={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {value}
      </p>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Stats() {
  const [stats, setStats] = useState(null)
  useEffect(() => { getStats().then(r => setStats(r.data)) }, [])

  if (!stats) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }} />
        <p className="text-gray-400 text-sm">Loading analytics…</p>
      </div>
    </div>
  )

  const td = stats.todos, md = stats.memories
  const priorityData = Object.entries(td.by_priority).map(([n, v]) => ({
    name: n[0].toUpperCase() + n.slice(1), value: v, fill: P_COLORS[n]
  }))
  const catData = Object.entries(md.by_category).map(([n, v]) => ({
    name: n[0].toUpperCase() + n.slice(1), value: v, fill: C_COLORS[n] || '#94a3b8'
  }))

  return (
    <div className="p-7 max-w-5xl">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Your productivity at a glance</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        <StatCard value={td.total}            label="Total Tasks"   sub="all time"       gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" />
        <StatCard value={td.done}             label="Completed"     sub="tasks done"     gradient="linear-gradient(135deg,#22c55e,#4ade80)" />
        <StatCard value={td.pending}          label="Pending"       sub="to do"          gradient="linear-gradient(135deg,#f59e0b,#fbbf24)" />
        <StatCard value={`${td.completion_pct}%`} label="Score"    sub="productivity"   gradient="linear-gradient(135deg,#f97316,#fb923c)" />
      </div>

      {/* Progress bar */}
      <div className="neu-card p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-800">Overall Completion</p>
          <span className="text-2xl font-extrabold gradient-text">{td.completion_pct}%</span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden"
          style={{ background: '#e5e7eb', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${td.completion_pct}%`, background: 'linear-gradient(90deg,#f97316,#fb923c)', boxShadow: '0 0 10px rgba(249,115,22,0.4)' }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{td.done} of {td.total} tasks completed</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Bar chart */}
        <div className="neu-card p-6">
          <p className="font-bold text-gray-800 mb-5">Tasks by Priority</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={priorityData} barSize={36}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(249,115,22,0.05)' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {priorityData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="neu-card p-6">
          <p className="font-bold text-gray-800 mb-5">Memories by Category</p>
          {catData.length === 0
            ? <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">No memories yet.</div>
            : <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={4}>
                    {catData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Priority breakdown */}
      <div className="neu-card p-6">
        <p className="font-bold text-gray-800 mb-5">Priority Breakdown</p>
        <div className="space-y-4">
          {Object.entries(td.by_priority).map(([p, count]) => (
            <div key={p} className="flex items-center gap-4">
              <span className="w-16 text-sm capitalize font-medium text-gray-600">{p}</span>
              <div className="flex-1 relative h-2.5 rounded-full overflow-hidden"
                style={{ background: '#e5e7eb', boxShadow: 'inset 1px 1px 3px #d1d5db' }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${td.total ? (count / td.total) * 100 : 0}%`,
                    background: p === 'high' ? 'linear-gradient(90deg,#f97316,#fb923c)'
                              : p === 'medium' ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                              : 'linear-gradient(90deg,#22c55e,#4ade80)',
                  }} />
              </div>
              <span className="w-6 text-sm font-bold text-gray-700 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
