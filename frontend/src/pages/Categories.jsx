import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api'

const CATS = [
  { name: 'Personal',  icon: '👤', bg: '#eef2ff', color: '#6366f1' },
  { name: 'Work',      icon: '💼', bg: '#faf5ff', color: '#a855f7' },
  { name: 'Health',    icon: '❤️', bg: '#fff0ee', color: '#e8533a' },
  { name: 'Shopping',  icon: '🛒', bg: '#fefce8', color: '#ca8a04' },
  { name: 'Learning',  icon: '📚', bg: '#f0fdf4', color: '#22c55e' },
  { name: 'Other',     icon: '📌', bg: '#f5f5f5', color: '#888' },
]

export default function Categories() {
  const [todos, setTodos] = useState([])

  useEffect(() => { api.get('/todos/').then(r => setTodos(r.data)).catch(() => {}) }, [])

  return (
    <Layout>
      <div className="glass-card" style={{ minHeight: 'calc(100vh - 40px)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Categories</h1>
            <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>Organize your tasks by category</p>
          </div>
          <button className="accent-btn" style={{ padding: '10px 20px', borderRadius: 50, fontSize: 13 }}>
            + Add Category
          </button>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {CATS.map(cat => {
            const count = cat.name === 'Personal' ? todos.length : 0
            const pct = todos.length > 0 && cat.name === 'Personal' ? Math.round((todos.filter(t => t.done).length / todos.length) * 100) : 0
            return (
              <div key={cat.name} className="inner-card"
                style={{ padding: 24, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {cat.icon}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: cat.bg, padding: '4px 10px', borderRadius: 50 }}>
                    {count} tasks
                  </span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>{cat.name}</h3>
                <p style={{ fontSize: 12, color: '#bbb', margin: '0 0 14px' }}>
                  {cat.name === 'Personal' ? `${todos.filter(t => t.done).length} completed` : '0 completed'}
                </p>

                {/* Progress bar */}
                <div style={{ background: '#f0f0f0', borderRadius: 50, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: cat.color, borderRadius: 50, transition: 'width 0.6s ease' }} />
                </div>
                <p style={{ fontSize: 10, color: '#bbb', margin: '6px 0 0', textAlign: 'right' }}>{pct}%</p>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
