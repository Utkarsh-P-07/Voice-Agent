import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import AddTaskModal from '../components/AddTaskModal'
import api from '../api'

const TABS = ['All', 'Active', 'Completed']

const PRIORITY_ICON = { high: { bg: '#fff0ee', color: '#e8533a' }, medium: { bg: '#fff7f0', color: '#f97316' }, low: { bg: '#f0fdf4', color: '#22c55e' } }

export default function Reminders() {
  const [todos, setTodos] = useState([])
  const [tab, setTab] = useState('Active')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const fetchTodos = () => {
    setLoading(true)
    api.get('/todos/').then(r => { setTodos(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(fetchTodos, [])

  const toggle = async (todo) => {
    await api.patch(`/todos/${todo.id}`, { done: !todo.done })
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
  }

  const withDue = todos.filter(t => t.due_at)
  const filtered = withDue.filter(t => {
    if (tab === 'Active') return !t.done
    if (tab === 'Completed') return t.done
    return true
  })

  const active = withDue.filter(t => !t.done).length
  const completed = withDue.filter(t => t.done).length

  return (
    <Layout>
      <div className="glass-card" style={{ minHeight: 'calc(100vh - 40px)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Reminders</h1>
            <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>{active} active · {completed} completed</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="accent-btn" style={{ padding: '10px 20px', borderRadius: 50, fontSize: 13 }}>
            + Add Reminder
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Total', value: withDue.length, icon: '⏰', bg: '#f5f5f5', color: '#555' },
            { label: 'Active', value: active, icon: '🔔', bg: '#fff0ee', color: '#e8533a' },
            { label: 'Completed', value: completed, icon: '✅', bg: '#f0fdf4', color: '#22c55e' },
          ].map(s => (
            <div key={s.label} className="inner-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', borderRadius: 50, padding: 4, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '7px 20px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                background: tab === t ? '#2a2a2a' : 'transparent', color: tab === t ? '#fff' : '#888' }}>
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="inner-card" style={{ flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 60, background: '#f5f5f5', borderRadius: 14 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>⏰</p>
              <p style={{ color: '#bbb', fontSize: 14 }}>No reminders here.</p>
            </div>
          ) : (
            filtered.map((todo, idx) => {
              const ps = PRIORITY_ICON[todo.priority] || PRIORITY_ICON.medium
              return (
                <div key={todo.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                    borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: ps.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⏰</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: todo.done ? '#bbb' : '#1a1a1a',
                      textDecoration: todo.done ? 'line-through' : 'none', margin: 0 }}>{todo.title}</p>
                    <p style={{ fontSize: 11, color: '#bbb', margin: '3px 0 0' }}>
                      {new Date(todo.due_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* Toggle */}
                  <button onClick={() => toggle(todo)}
                    style={{ position: 'relative', width: 46, height: 26, borderRadius: 50, border: 'none', cursor: 'pointer',
                      background: todo.done ? '#e8533a' : '#e0e0e0', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, width: 20, height: 20, background: '#fff', borderRadius: '50%',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s',
                      left: todo.done ? 23 : 3 }} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchTodos() }} />}
    </Layout>
  )
}
