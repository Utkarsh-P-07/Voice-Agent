import { useEffect, useState } from 'react'
import { Plus, Search, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { getTodos, updateTodo, deleteTodo } from '../api'
import clsx from 'clsx'
import AddTaskModal from '../components/AddTaskModal'

const FILTERS = ['All', 'Pending', 'Done', 'High', 'Medium', 'Low']

const PRIORITY_STYLE = {
  high:   { pill: 'bg-orange-100 text-orange-600', dot: 'bg-orange-500' },
  medium: { pill: 'bg-amber-100 text-amber-600',   dot: 'bg-amber-400'  },
  low:    { pill: 'bg-green-100 text-green-600',   dot: 'bg-green-400'  },
}

function TaskRow({ todo, onRefresh }) {
  const ps = PRIORITY_STYLE[todo.priority] || PRIORITY_STYLE.medium

  async function toggle() {
    await updateTodo(todo.id, { done: !todo.done })
    onRefresh()
  }
  async function remove() {
    if (!confirm(`Delete "${todo.title}"?`)) return
    await deleteTodo(todo.id)
    onRefresh()
  }

  return (
    <div className="neu-card-sm flex items-center gap-4 px-5 py-4 group hover-lift">
      <button onClick={toggle} className="flex-shrink-0 transition-transform hover:scale-110">
        {todo.done
          ? <CheckCircle2 size={20} className="text-green-500" />
          : <Circle       size={20} className="text-gray-300 hover:text-orange-400" />
        }
      </button>

      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ps.dot}`} />

      <span className={clsx('flex-1 text-sm font-medium',
        todo.done ? 'line-through text-gray-400' : 'text-gray-700')}>
        {todo.title}
      </span>

      <span className={`pill ${ps.pill}`}>{todo.priority}</span>
      <span className="text-[11px] text-gray-400 hidden sm:block">{todo.created_at?.slice(0,10)}</span>

      <button onClick={remove}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default function Todos() {
  const [todos,    setTodos]    = useState([])
  const [filter,   setFilter]   = useState('All')
  const [search,   setSearch]   = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  async function load() {
    const { data } = await getTodos()
    setTodos(data.todos)
  }
  useEffect(() => { load() }, [])

  const visible = todos.filter(t => {
    if (filter === 'Pending' && t.done)  return false
    if (filter === 'Done'    && !t.done) return false
    if (['High','Medium','Low'].includes(filter) &&
        t.priority.toLowerCase() !== filter.toLowerCase()) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-7">
      {/* Add Task Modal */}
      <AddTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-400 mt-1">{todos.length} total · {todos.filter(t=>t.done).length} completed</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-accent">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-4 py-1.5 rounded-2xl text-sm font-medium transition-all duration-200',
              filter === f
                ? 'text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-700'
            )}
            style={filter === f
              ? { background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }
              : { background: '#eef0f5', boxShadow: '3px 3px 7px #d1d5db, -3px -3px 7px #ffffff' }
            }>
            {f}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="neu-input pl-10" placeholder="Search tasks…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div className="space-y-3">
        {visible.length === 0
          ? <div className="text-center py-16 text-gray-400">
              <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tasks match.</p>
            </div>
          : visible.map(t => <TaskRow key={t.id} todo={t} onRefresh={load} />)
        }
      </div>
    </div>
  )
}
