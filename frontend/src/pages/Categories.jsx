import { useEffect, useState } from 'react'
import { Plus, Trash2, Tag } from 'lucide-react'
import { getTodos, createTodo, deleteTodo, updateTodo } from '../api'
import NeuSelect from '../components/NeuSelect'

const PRIORITY_OPTS = [
  { value: 'low',    label: 'Low',    dot: 'bg-green-400' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400'  },
  { value: 'high',   label: 'High',   dot: 'bg-orange-500' },
]

// Built-in categories with colours
const DEFAULT_CATS = [
  { id: 'work',     label: 'Work',     color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  { id: 'personal', label: 'Personal', color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  { id: 'health',   label: 'Health',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  { id: 'learning', label: 'Learning', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
  { id: 'finance',  label: 'Finance',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  { id: 'other',    label: 'Other',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
]

function getCategoryFromTitle(title) {
  const t = title.toLowerCase()
  if (/work|meeting|project|client|office|email|report/.test(t))   return 'work'
  if (/gym|health|doctor|medicine|exercise|run|sleep/.test(t))     return 'health'
  if (/learn|study|course|book|read|practice/.test(t))             return 'learning'
  if (/buy|pay|bill|bank|money|budget|invoice/.test(t))            return 'finance'
  if (/family|friend|home|personal|hobby/.test(t))                 return 'personal'
  return 'other'
}

export default function Categories() {
  const [todos,    setTodos]    = useState([])
  const [active,   setActive]   = useState('work')
  const [adding,   setAdding]   = useState(false)
  const [form,     setForm]     = useState({ title: '', priority: 'medium' })

  async function load() {
    const { data } = await getTodos()
    setTodos(data.todos)
  }
  useEffect(() => { load() }, [])

  // Group todos by inferred category
  const grouped = {}
  DEFAULT_CATS.forEach(c => { grouped[c.id] = [] })
  todos.forEach(t => {
    const cat = getCategoryFromTitle(t.title)
    grouped[cat].push(t)
  })

  const activeCat  = DEFAULT_CATS.find(c => c.id === active)
  const activeTodos = grouped[active] || []

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await createTodo(form.title.trim(), form.priority)
    setForm({ title: '', priority: 'medium' })
    setAdding(false)
    load()
  }

  async function handleDelete(id) {
    await deleteTodo(id)
    load()
  }

  async function handleToggle(todo) {
    await updateTodo(todo.id, { done: !todo.done })
    load()
  }

  return (
    <div className="p-7">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold text-gray-900">Categories</h1>
        <p className="text-sm text-gray-400 mt-1">Tasks organised by category</p>
      </div>

      {/* Category cards row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {DEFAULT_CATS.map(cat => {
          const count    = grouped[cat.id]?.length || 0
          const isActive = cat.id === active
          return (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all duration-200 hover:scale-105"
              style={isActive
                ? { background: cat.color, boxShadow: `0 6px 16px ${cat.color}55` }
                : { background: cat.bg, border: `1.5px solid ${cat.color}33` }
              }
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: isActive ? 'rgba(255,255,255,0.2)' : cat.bg }}>
                <Tag size={16} style={{ color: isActive ? '#fff' : cat.color }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: isActive ? '#fff' : cat.color }}>
                {cat.label}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : cat.color + '22',
                  color: isActive ? '#fff' : cat.color,
                }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Active category task list */}
      <div className="neu-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: activeCat?.color, boxShadow: `0 4px 12px ${activeCat?.color}44` }}>
              <Tag size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800">{activeCat?.label}</p>
              <p className="text-xs text-gray-400">{activeTodos.length} tasks</p>
            </div>
          </div>
          <button onClick={() => setAdding(v => !v)} className="btn-accent text-xs">
            <Plus size={14} /> Add Task
          </button>
        </div>

        {adding && (
          <form onSubmit={handleAdd} className="flex gap-3 mb-5 items-center">
            <input autoFocus className="neu-input flex-1 text-sm"
              placeholder={`New ${activeCat?.label.toLowerCase()} task…`}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <NeuSelect
              value={form.priority}
              onChange={v => setForm(f => ({ ...f, priority: v }))}
              options={PRIORITY_OPTS}
              className="w-32"
            />
            <button type="submit" className="btn-accent text-xs px-3 py-2">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost text-xs">✕</button>
          </form>
        )}

        {/* Tasks */}
        {activeTodos.length === 0 ? (
          <div className="text-center py-12">
            <Tag size={36} className="mx-auto mb-3 opacity-20" style={{ color: activeCat?.color }} />
            <p className="text-sm text-gray-400">No {activeCat?.label.toLowerCase()} tasks yet.</p>
            <button onClick={() => setAdding(true)}
              className="mt-3 text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: activeCat?.color }}>
              + Add one
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTodos.map(t => (
              <div key={t.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl group transition-all"
                style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>

                {/* Toggle */}
                <button onClick={() => handleToggle(t)}
                  className="w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
                  style={t.done
                    ? { background: '#22c55e', boxShadow: '0 2px 6px rgba(34,197,94,0.3)' }
                    : { background: activeCat?.bg, border: `1.5px solid ${activeCat?.color}55` }
                  }>
                  {t.done && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <span className={`flex-1 text-sm font-medium ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {t.title}
                </span>

                {/* Priority */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: t.priority === 'high' ? 'rgba(249,115,22,0.1)' :
                                t.priority === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                    color: t.priority === 'high' ? '#f97316' :
                           t.priority === 'medium' ? '#f59e0b' : '#22c55e',
                  }}>
                  {t.priority}
                </span>

                {/* Delete */}
                <button onClick={() => handleDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
