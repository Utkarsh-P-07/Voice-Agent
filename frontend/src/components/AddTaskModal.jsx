import { useState, useEffect, useRef } from 'react'
import { X, Plus, CheckCircle2 } from 'lucide-react'
import { createTodo } from '../api'
import NeuSelect from './NeuSelect'

const PRIORITY_OPTS = [
  { value: 'low',    label: 'Low',    dot: 'bg-green-400'  },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400'  },
  { value: 'high',   label: 'High',   dot: 'bg-orange-500' },
]

const CATEGORIES = [
  { id: 'work',     label: 'Work',     emoji: '💼', color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  { id: 'personal', label: 'Personal', emoji: '🏠', color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  { id: 'health',   label: 'Health',   emoji: '💪', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  { id: 'learning', label: 'Learning', emoji: '📚', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  { id: 'finance',  label: 'Finance',  emoji: '💰', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { id: 'other',    label: 'Other',    emoji: '📌', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
]

export default function AddTaskModal({ open, onClose, onCreated }) {
  const [form,   setForm]   = useState({ title: '', priority: 'medium', category: 'work', notes: '' })
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm({ title: '', priority: 'medium', category: 'work', notes: '' })
      setDone(false)
      setSaving(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await createTodo(form.title.trim(), form.priority, form.category)
      setDone(true)
      onCreated()
      setTimeout(() => onClose(), 900)
    } catch {
      setSaving(false)
    }
  }

  const priorityColor =
    form.priority === 'high'   ? 'linear-gradient(135deg,#f97316,#fb923c)' :
    form.priority === 'medium' ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' :
                                 'linear-gradient(135deg,#22c55e,#4ade80)'

  const activeCat = CATEGORIES.find(c => c.id === form.category)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-7 relative"
        style={{
          background: '#eef0f5',
          boxShadow: '20px 20px 50px #c8cad0, -20px -20px 50px #ffffff',
          animation: 'fade-in-up 0.22s ease forwards',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center
                     text-gray-400 hover:text-gray-700 transition-all hover:scale-110"
          style={{ background: '#eef0f5', boxShadow: '3px 3px 7px #d1d5db, -3px -3px 7px #ffffff' }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: activeCat ? activeCat.color : 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.35)' }}>
            <span className="text-lg">{activeCat?.emoji || '➕'}</span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 leading-none">New Task</h2>
            <p className="text-xs text-gray-400 mt-0.5">What do you need to get done?</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Task title
            </label>
            <input
              ref={inputRef}
              className="neu-input w-full text-sm"
              placeholder="e.g. Buy groceries, Call dentist…"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => {
                const isActive = form.category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-semibold
                               transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]"
                    style={isActive
                      ? { background: cat.color, color: '#fff', boxShadow: `0 4px 12px ${cat.color}55` }
                      : { background: cat.bg, color: cat.color, boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.04)' }
                    }
                  >
                    <span className="text-sm">{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Priority
            </label>
            <NeuSelect
              value={form.priority}
              onChange={v => setForm(f => ({ ...f, priority: v }))}
              options={PRIORITY_OPTS}
              className="w-full"
            />
            <div className="mt-2 h-1.5 rounded-full overflow-hidden"
              style={{ background: '#e5e7eb', boxShadow: 'inset 1px 1px 3px #d1d5db' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: form.priority === 'high' ? '100%' : form.priority === 'medium' ? '60%' : '30%',
                  background: priorityColor,
                }} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Notes <span className="normal-case font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              className="neu-input w-full text-sm resize-none"
              rows={2}
              placeholder="Any extra details…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                         text-sm font-semibold text-white transition-all duration-200
                         hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', boxShadow: '0 6px 18px rgba(249,115,22,0.35)' }}
            >
              {done ? (
                <><CheckCircle2 size={16} /> Added!</>
              ) : saving ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <><Plus size={16} /> Add Task</>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl text-sm font-semibold text-gray-500
                         transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#eef0f5', boxShadow: '4px 4px 10px #d1d5db, -4px -4px 10px #ffffff' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
