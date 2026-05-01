import { useState } from 'react'
import api from '../api'

const PRIORITIES = ['low', 'medium', 'high']
const CATEGORIES = ['Personal', 'Work', 'Health', 'Shopping', 'Learning', 'Other']
const P_COLOR = { low: '#22c55e', medium: '#f97316', high: '#e8533a' }

const inputStyle = {
  width: '100%', background: '#f5f5f5', border: 'none', borderRadius: 12,
  padding: '11px 16px', fontSize: 13, color: '#333', outline: 'none',
}

export default function AddTaskModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '', priority: 'medium', category: 'Personal' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setLoading(true)
    setError('')
    try {
      let due_at = null
      if (form.date) {
        const parsed = new Date(`${form.date}T${form.time || '00:00'}`)
        if (isNaN(parsed.getTime())) {
          setError('Invalid date or time')
          setLoading(false)
          return
        }
        due_at = parsed.toISOString()
      }
      await api.post('/todos/', {
        title: form.title.trim(),
        priority: form.priority,
        category: form.category,
        description: form.description,
        due_at,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f5f5f5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Add New Task</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: 50, fontSize: 12, color: '#888', cursor: 'pointer', fontWeight: 500 }}>
              Cancel
            </button>
            <button onClick={submit} disabled={loading}
              style={{ padding: '8px 18px', background: '#e8533a', border: 'none', borderRadius: 50, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: '#fff0ee', color: '#e8533a', fontSize: 12, padding: '10px 14px', borderRadius: 12 }}>{error}</div>}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Buy groceries" style={inputStyle} required />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description (Optional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Add more details..." rows={2}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</label>
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.15s',
                      background: form.priority === p ? P_COLOR[p] : '#f5f5f5',
                      color: form.priority === p ? '#fff' : '#aaa' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
