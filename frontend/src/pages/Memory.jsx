import { useEffect, useState } from 'react'
import { Plus, Brain } from 'lucide-react'
import { getMemories, createMemory } from '../api'
import clsx from 'clsx'
import NeuSelect from '../components/NeuSelect'

const CATEGORY_OPTS = [
  { value: 'preference', label: 'Preference', dot: 'bg-purple-400' },
  { value: 'event',      label: 'Event',      dot: 'bg-cyan-400'   },
  { value: 'goal',       label: 'Goal',       dot: 'bg-orange-400' },
  { value: 'general',    label: 'General',    dot: 'bg-gray-400'   },
]

const CATS = ['All', 'preference', 'event', 'goal', 'general']
const CAT_STYLE = {
  preference: { pill: 'bg-purple-100 text-purple-600', dot: 'bg-purple-400' },
  event:      { pill: 'bg-cyan-100 text-cyan-600',     dot: 'bg-cyan-400'   },
  goal:       { pill: 'bg-orange-100 text-orange-600', dot: 'bg-orange-400' },
  general:    { pill: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400'   },
}

function MemCard({ memory }) {
  const cat = memory.category || 'general'
  const cs  = CAT_STYLE[cat] || CAT_STYLE.general
  return (
    <div className="neu-card p-5 hover-lift">
      <div className="flex items-center justify-between mb-3">
        <span className={`pill ${cs.pill}`}>{cat}</span>
        <span className="text-[11px] text-gray-400">{memory.timestamp?.slice(0,16).replace('T','  ')}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{memory.content}</p>
    </div>
  )
}

export default function Memory() {
  const [memories,  setMemories]  = useState([])
  const [filter,    setFilter]    = useState('All')
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState({ content: '', category: 'general' })

  async function load() {
    const cat = filter === 'All' ? '' : filter
    const { data } = await getMemories('', cat)
    setMemories(data.memories.slice().reverse())
  }
  useEffect(() => { load() }, [filter])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.content.trim()) return
    await createMemory(form.content.trim(), form.category)
    setForm({ content: '', category: 'general' })
    setShowForm(false)
    load()
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Memory Bank</h1>
          <p className="text-sm text-gray-400 mt-1">{memories.length} memories stored</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-accent">
          <Plus size={16} /> Save Memory
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="neu-card p-5 mb-6 space-y-3">
          <textarea autoFocus className="neu-input resize-none" rows={3}
            placeholder="What should I remember?"
            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          <div className="flex gap-3 items-center">
            <NeuSelect
              value={form.category}
              onChange={v => setForm(f => ({ ...f, category: v }))}
              options={CATEGORY_OPTS}
              className="w-44"
            />
            <button type="submit" className="btn-accent">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATS.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={clsx('px-4 py-1.5 rounded-2xl text-sm font-medium capitalize transition-all duration-200',
              filter === c ? 'text-white' : 'text-gray-500'
            )}
            style={filter === c
              ? { background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }
              : { background: '#eef0f5', boxShadow: '3px 3px 7px #d1d5db, -3px -3px 7px #ffffff' }
            }>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {memories.length === 0
          ? <div className="text-center py-16 text-gray-400">
              <Brain size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No memories stored yet.</p>
            </div>
          : memories.map((m, i) => <MemCard key={i} memory={m} />)
        }
      </div>
    </div>
  )
}
