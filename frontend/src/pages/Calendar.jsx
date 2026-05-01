import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay() }

export default function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [todos, setTodos] = useState([])
  const [selected, setSelected] = useState(today.getDate())

  useEffect(() => { api.get('/todos/').then(r => setTodos(r.data)).catch(() => {}) }, [])

  const prev = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const next = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)

  const todosOnDay = (day) => todos.filter(t => {
    if (!t.due_at) return false
    const d = new Date(t.due_at)
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })

  const selectedTodos = todosOnDay(selected)
  const days = getDaysInMonth(year, month)
  const firstDay = getFirstDay(year, month)

  const PDOT = { high: '#e8533a', medium: '#f97316', low: '#22c55e' }

  return (
    <Layout>
      <div className="glass-card" style={{ minHeight: 'calc(100vh - 40px)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Calendar</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={prev}
              style={{ width: 36, height: 36, background: '#fff', border: 'none', borderRadius: 50, cursor: 'pointer', fontSize: 16, color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', minWidth: 140, textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={next}
              style={{ width: 36, height: 36, background: '#fff', border: 'none', borderRadius: 50, cursor: 'pointer', fontSize: 16, color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>›</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, flex: 1 }}>

          {/* Calendar grid */}
          <div className="inner-card" style={{ padding: 24 }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#bbb', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(days).fill(null).map((_, i) => {
                const day = i + 1
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                const isSel = day === selected
                const hasTodos = todosOnDay(day).length > 0
                return (
                  <button key={day} onClick={() => setSelected(day)}
                    style={{
                      aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: isSel || isToday ? 700 : 400, transition: 'all 0.15s',
                      background: isSel ? '#e8533a' : isToday ? '#fff0ee' : 'transparent',
                      color: isSel ? '#fff' : isToday ? '#e8533a' : '#444',
                    }}>
                    {day}
                    {hasTodos && (
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.7)' : '#e8533a', marginTop: 2 }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Events panel */}
          <div className="inner-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                {MONTHS[month]} {selected}
              </h3>
              <span style={{ fontSize: 11, color: '#bbb' }}>{selectedTodos.length} events</span>
            </div>

            {selectedTodos.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 32 }}>📅</span>
                <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>No tasks on this day</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedTodos.map(t => (
                  <div key={t.id} style={{ background: '#f9f9f9', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PDOT[t.priority] || '#bbb', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{t.title}</p>
                      {t.due_at && <p style={{ fontSize: 11, color: '#bbb', margin: '3px 0 0' }}>{new Date(t.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
