import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import AddTaskModal from '../components/AddTaskModal'
import VoiceModal from '../components/VoiceModal'
import api from '../api'

const TABS = ['All', 'Today', 'Upcoming', 'Completed']

const PRIORITY_STYLE = {
  high:   { bg: '#fff0ee', color: '#e8533a', dot: '#e8533a' },
  medium: { bg: '#fff7f0', color: '#f97316', dot: '#f97316' },
  low:    { bg: '#f0fdf4', color: '#22c55e', dot: '#22c55e' },
}

export default function Tasks() {
  const location = useLocation()
  const [todos, setTodos] = useState([])
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showVoice, setShowVoice] = useState(false)

  useEffect(() => {
    if (location.state?.openAdd) setShowAdd(true)
    if (location.state?.openVoice) setShowVoice(true)
  }, [location.state])

  const fetchTodos = () => {
    setLoading(true)
    api.get('/todos/').then(r => { setTodos(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(fetchTodos, [])

  const toggleDone = async (todo) => {
    await api.patch(`/todos/${todo.id}`, { done: !todo.done })
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
  }

  const deleteTodo = async (id) => {
    await api.delete(`/todos/${id}`)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const filtered = todos.filter(t => {
    if (!t.title.toLowerCase().includes(search.toLowerCase())) return false
    const now = new Date()
    if (tab === 'Today') return t.due_at && new Date(t.due_at).toDateString() === now.toDateString()
    if (tab === 'Upcoming') return !t.done && t.due_at && new Date(t.due_at) > now
    if (tab === 'Completed') return t.done
    return true
  })

  const done = todos.filter(t => t.done).length
  const pending = todos.filter(t => !t.done).length

  return (
    <Layout>
      <div className="glass-card" style={{ minHeight: 'calc(100vh - 40px)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>My Tasks</h1>
            <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>{todos.length} total · {done} done · {pending} pending</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowVoice(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#fff', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 500, color: '#555', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              🎤 Voice
            </button>
            <button onClick={() => setShowAdd(true)} className="accent-btn" style={{ padding: '10px 20px', borderRadius: 50, fontSize: 13 }}>
              + Add Task
            </button>
          </div>
        </div>

        {/* Search + tabs */}
        <div className="inner-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: 14 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              style={{ width: '100%', background: '#f5f5f5', border: 'none', borderRadius: 50, padding: '10px 16px 10px 38px', fontSize: 13, color: '#555', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', borderRadius: 50, padding: 4 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '6px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
                  background: tab === t ? '#2a2a2a' : 'transparent', color: tab === t ? '#fff' : '#888' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div className="inner-card" style={{ flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, background: '#f5f5f5', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>✅</p>
              <p style={{ color: '#bbb', fontSize: 14 }}>No tasks found.</p>
            </div>
          ) : (
            <div>
              {filtered.map((todo, idx) => {
                const ps = PRIORITY_STYLE[todo.priority] || PRIORITY_STYLE.medium
                return (
                  <div key={todo.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                      borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
                      transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Checkbox */}
                    <button onClick={() => toggleDone(todo)}
                      style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${todo.done ? '#e8533a' : '#ddd'}`,
                        background: todo.done ? '#e8533a' : 'transparent', flexShrink: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {todo.done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </button>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: todo.done ? '#bbb' : '#1a1a1a',
                        textDecoration: todo.done ? 'line-through' : 'none', margin: 0 }}>{todo.title}</p>
                      {todo.due_at && (
                        <p style={{ fontSize: 11, color: '#bbb', margin: '3px 0 0' }}>
                          {new Date(todo.due_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    {/* Priority badge */}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 50,
                      background: ps.bg, color: ps.color, textTransform: 'capitalize' }}>
                      {todo.priority}
                    </span>

                    {/* Delete */}
                    <button onClick={() => deleteTodo(todo.id)}
                      style={{ background: 'none', border: 'none', color: '#ddd', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e8533a'}
                      onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchTodos() }} />}
      {showVoice && <VoiceModal onClose={() => setShowVoice(false)} onSaved={() => { setShowVoice(false); fetchTodos() }} />}
    </Layout>
  )
}
