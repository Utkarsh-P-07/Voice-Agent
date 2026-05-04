import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getTodos, createTodo } from '../api'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function Calendar() {
  const today = new Date()
  const [cur,    setCur]    = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [todos,  setTodos]  = useState([])
  const [selected, setSelected] = useState(null)   // selected date string YYYY-MM-DD
  const [adding,   setAdding]   = useState(false)
  const [newTask,  setNewTask]  = useState('')

  async function load() {
    const { data } = await getTodos()
    setTodos(data.todos)
  }
  useEffect(() => { load() }, [])

  function prev() {
    setCur(c => {
      const m = c.month === 0 ? 11 : c.month - 1
      const y = c.month === 0 ? c.year - 1 : c.year
      return { year: y, month: m }
    })
  }
  function next() {
    setCur(c => {
      const m = c.month === 11 ? 0 : c.month + 1
      const y = c.month === 11 ? c.year + 1 : c.year
      return { year: y, month: m }
    })
  }

  // Map todos to date strings
  const todosByDate = {}
  todos.forEach(t => {
    const d = t.created_at?.slice(0, 10)
    if (d) {
      if (!todosByDate[d]) todosByDate[d] = []
      todosByDate[d].push(t)
    }
  })

  const daysInMonth = getDaysInMonth(cur.year, cur.month)
  const firstDay    = getFirstDay(cur.year, cur.month)
  const cells       = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )

  function dateStr(day) {
    return `${cur.year}-${String(cur.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  async function handleAddTask(e) {
    e.preventDefault()
    if (!newTask.trim() || !selected) return
    await createTodo(newTask.trim(), 'medium')
    setNewTask('')
    setAdding(false)
    load()
  }

  const selectedTodos = selected ? (todosByDate[selected] || []) : []

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">View and manage tasks by date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendar grid */}
        <div className="lg:col-span-2 neu-card p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prev}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#eef0f5', boxShadow: '3px 3px 7px #d1d5db, -3px -3px 7px #ffffff' }}>
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-800">
              {MONTHS[cur.month]} {cur.year}
            </h2>
            <button onClick={next}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#eef0f5', boxShadow: '3px 3px 7px #d1d5db, -3px -3px 7px #ffffff' }}>
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const ds       = dateStr(day)
              const isToday  = ds === today.toISOString().slice(0, 10)
              const isSel    = ds === selected
              const hasTodos = todosByDate[ds]?.length > 0

              return (
                <button
                  key={ds}
                  onClick={() => setSelected(isSel ? null : ds)}
                  className="relative aspect-square rounded-2xl flex flex-col items-center justify-center
                             text-sm font-medium transition-all duration-200 hover:scale-105"
                  style={
                    isSel
                      ? { background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff', boxShadow: '0 4px 12px rgba(249,115,22,0.35)' }
                      : isToday
                        ? { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1.5px solid rgba(249,115,22,0.4)' }
                        : { background: '#eef0f5', color: '#374151', boxShadow: '2px 2px 5px #d1d5db, -2px -2px 5px #ffffff' }
                  }
                >
                  {day}
                  {hasTodos && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full
                      ${isSel ? 'bg-white' : 'bg-orange-400'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel — selected day tasks */}
        <div className="neu-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-gray-800">
                {selected
                  ? new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
                  : 'Select a day'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selected ? `${selectedTodos.length} task${selectedTodos.length !== 1 ? 's' : ''}` : 'Click a date to view tasks'}
              </p>
            </div>
            {selected && (
              <button onClick={() => setAdding(v => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 3px 8px rgba(249,115,22,0.3)' }}>
                <Plus size={14} className="text-white" />
              </button>
            )}
          </div>

          {/* Add task form */}
          {adding && selected && (
            <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
              <input autoFocus className="neu-input flex-1 text-xs" placeholder="Task title…"
                value={newTask} onChange={e => setNewTask(e.target.value)} />
              <button type="submit" className="btn-accent text-xs px-3 py-2">Add</button>
            </form>
          )}

          {/* Task list */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {!selected && (
              <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                <ChevronLeft size={28} className="rotate-180 mb-2 opacity-40" />
                <p className="text-xs">Pick a date</p>
              </div>
            )}
            {selected && selectedTodos.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">No tasks on this day.</p>
            )}
            {selectedTodos.map(t => (
              <div key={t.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
                style={{ background: '#eef0f5', boxShadow: 'inset 2px 2px 5px #d1d5db, inset -2px -2px 5px #ffffff' }}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.done ? 'bg-green-400' :
                  t.priority === 'high' ? 'bg-orange-500' :
                  t.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'
                }`} />
                <span className={`text-xs font-medium flex-1 ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
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
      </div>
    </div>
  )
}
