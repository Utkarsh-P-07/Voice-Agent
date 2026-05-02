import { Trash2, Circle, CheckCircle2 } from 'lucide-react'
import { updateTodo, deleteTodo } from '../api'
import clsx from 'clsx'

const PRIORITY_STYLES = {
  high:   'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low:    'bg-green-100 text-green-600',
}

export default function TodoRow({ todo, onRefresh }) {
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
    <div className="card flex items-center gap-3 py-3 px-4 group">
      {/* Toggle */}
      <button onClick={toggle} className="flex-shrink-0 text-gray-300 hover:text-accent transition-colors">
        {todo.done
          ? <CheckCircle2 size={20} className="text-green-500" />
          : <Circle size={20} />
        }
      </button>

      {/* Title */}
      <span className={clsx(
        'flex-1 text-sm',
        todo.done ? 'line-through text-gray-400' : 'text-gray-800'
      )}>
        {todo.title}
      </span>

      {/* Priority pill */}
      <span className={clsx('pill text-[11px]', PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.medium)}>
        {todo.priority}
      </span>

      {/* Date */}
      <span className="text-[11px] text-gray-400 hidden sm:block">
        {todo.created_at?.slice(0, 10)}
      </span>

      {/* Delete */}
      <button
        onClick={remove}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
