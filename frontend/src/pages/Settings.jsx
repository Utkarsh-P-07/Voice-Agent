import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import api from '../api'

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      style={{ position: 'relative', width: 46, height: 26, borderRadius: 50, border: 'none', cursor: 'pointer',
        background: checked ? '#e8533a' : '#e0e0e0', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, width: 20, height: 20, background: '#fff', borderRadius: '50%',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s', left: checked ? 23 : 3 }} />
    </button>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="inner-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  )
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{label}</p>
        {desc && <p style={{ fontSize: 11, color: '#bbb', margin: '2px 0 0' }}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}

const selectStyle = {
  background: '#f5f5f5', border: 'none', borderRadius: 50, padding: '8px 16px',
  fontSize: 12, color: '#555', outline: 'none', cursor: 'pointer', minWidth: 120,
}

const inputStyle = {
  background: '#f5f5f5', border: 'none', borderRadius: 12, padding: '9px 14px',
  fontSize: 12, color: '#555', outline: 'none', width: '100%',
}

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const [prefs, setPrefs] = useState({
    push: true, whatsapp: false, sms: false, email: false,
    phone_number: '', email_address: '',
  })
  const [saved, setSaved] = useState(false)
  const [pushStatus, setPushStatus] = useState('unknown')
  const [pushError, setPushError] = useState('')
  const [voice, setVoice] = useState('Sara')
  const [speed, setSpeed] = useState(1.0)
  const [lang, setLang] = useState('English')
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarMsg, setCalendarMsg] = useState('')
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameMsg, setNameMsg] = useState('')

  useEffect(() => {
    if (user?.notification_prefs) {
      setPrefs(p => ({ ...p, ...user.notification_prefs }))
    }
    setCalendarConnected(!!user?.calendar_connected)
    setNewName(user?.name || '')
    if ('Notification' in window) setPushStatus(Notification.permission)
    else setPushStatus('unsupported')

    // Check if returning from calendar OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar') === 'connected') {
      setCalendarConnected(true)
      setCalendarMsg('✅ Google Calendar connected!')
      refreshUser()
      window.history.replaceState({}, '', '/settings')
    } else if (params.get('calendar') === 'error') {
      setCalendarMsg('❌ Calendar connection failed. Try again.')
      window.history.replaceState({}, '', '/settings')
    }
  }, [user])

  const enablePush = async () => {
    setPushError('')
    try {
      const permission = await Notification.requestPermission()
      setPushStatus(permission)
      if (permission !== 'granted') return

      if (!('serviceWorker' in navigator)) {
        setPushError('Service workers not supported in this browser.')
        return
      }
      const r = await api.get('/notifications/vapid-public-key')
      if (!r.data.public_key) {
        setPushError('Push notifications not configured on the server yet.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: r.data.public_key,
      })
      await api.post('/notifications/subscribe', { subscription: sub.toJSON() })
    } catch (err) {
      setPushError(err.response?.data?.detail || 'Failed to enable push notifications.')
    }
  }

  const savePrefs = async () => {
    try {
      await api.patch('/notifications/preferences', prefs)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save prefs:', err)
    }
  }

  const connectCalendar = async () => {
    setCalendarMsg('')
    try {
      const r = await api.get('/calendar/connect')
      if (r.data.auth_url) {
        window.location.href = r.data.auth_url
      } else {
        setCalendarMsg('⚠️ ' + (r.data.message || 'Google Calendar not configured on this server.'))
      }
    } catch {
      setCalendarMsg('❌ Failed to connect. Try again.')
    }
  }

  const disconnectCalendar = async () => {
    try {
      await api.delete('/calendar/disconnect')
      setCalendarConnected(false)
      setCalendarMsg('Calendar disconnected.')
      refreshUser()
    } catch {
      setCalendarMsg('❌ Failed to disconnect.')
    }
  }

  const saveName = async () => {
    if (!newName.trim()) return
    try {
      await api.patch('/auth/me', { name: newName.trim() })
      setNameMsg('✅ Name updated')
      setEditName(false)
      refreshUser()
      setTimeout(() => setNameMsg(''), 2000)
    } catch (err) {
      setNameMsg('❌ ' + (err.response?.data?.detail || 'Failed to update'))
    }
  }

  return (
    <Layout>
      <div className="glass-card" style={{ minHeight: 'calc(100vh - 40px)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>Manage your preferences</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <Section title="General" icon="⚙">
              <Row label="Language" desc="App display language">
                <select value={lang} onChange={e => setLang(e.target.value)} style={selectStyle}>
                  <option>English</option><option>Spanish</option><option>French</option>
                </select>
              </Row>
            </Section>

            <Section title="Voice" icon="🎤">
              <Row label="Voice Assistant" desc="Choose the voice for responses">
                <select value={voice} onChange={e => setVoice(e.target.value)} style={selectStyle}>
                  <option>Sara</option><option>James</option><option>Emma</option>
                </select>
              </Row>
              <Row label={`Voice Speed (${speed}x)`} desc="How fast the agent speaks">
                <input type="range" min="0.5" max="2" step="0.1" value={speed}
                  onChange={e => setSpeed(parseFloat(e.target.value))}
                  style={{ width: 100, accentColor: '#e8533a' }} />
              </Row>
            </Section>

            <Section title="Google Calendar" icon="📅">
              {calendarMsg && (
                <p style={{ fontSize: 12, color: calendarMsg.startsWith('✅') ? '#22c55e' : '#e8533a', margin: 0 }}>{calendarMsg}</p>
              )}
              <Row label="Sync tasks" desc="Create calendar events for tasks with due dates">
                {calendarConnected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✅ Connected</span>
                    <button onClick={disconnectCalendar}
                      style={{ background: 'none', border: 'none', color: '#e8533a', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button onClick={connectCalendar}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: 50, fontSize: 12, color: '#555', cursor: 'pointer', fontWeight: 500 }}>
                    <img src="https://www.google.com/favicon.ico" style={{ width: 14, height: 14 }} alt="" />
                    Connect
                  </button>
                )}
              </Row>
            </Section>

          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <Section title="Notifications" icon="🔔">
              <Row label="Task Reminders" desc="Get notified when tasks are due">
                <Toggle checked={prefs.push} onChange={v => setPrefs(p => ({ ...p, push: v }))} />
              </Row>
              <Row label="WhatsApp" desc="Reminders via WhatsApp">
                <Toggle checked={prefs.whatsapp} onChange={v => setPrefs(p => ({ ...p, whatsapp: v }))} />
              </Row>
              {prefs.whatsapp && (
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 5 }}>Phone number (with country code)</label>
                  <input type="tel" placeholder="+1234567890" value={prefs.phone_number || ''}
                    onChange={e => setPrefs(p => ({ ...p, phone_number: e.target.value }))}
                    style={inputStyle} />
                </div>
              )}
              <Row label="Email Reminders" desc="Reminders via email">
                <Toggle checked={prefs.email} onChange={v => setPrefs(p => ({ ...p, email: v }))} />
              </Row>
              {prefs.email && (
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 5 }}>Reminder email address</label>
                  <input type="email" placeholder="you@example.com" value={prefs.email_address || ''}
                    onChange={e => setPrefs(p => ({ ...p, email_address: e.target.value }))}
                    style={inputStyle} />
                </div>
              )}
              {pushError && <p style={{ fontSize: 12, color: '#e8533a', margin: 0 }}>{pushError}</p>}
              {pushStatus === 'granted' ? (
                <p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>✅ Browser push enabled on this device</p>
              ) : pushStatus === 'denied' ? (
                <p style={{ fontSize: 12, color: '#e8533a', margin: 0 }}>❌ Push blocked — enable in browser settings</p>
              ) : pushStatus !== 'unsupported' && (
                <button onClick={enablePush}
                  style={{ background: 'none', border: 'none', color: '#e8533a', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, fontWeight: 600 }}>
                  Enable browser push notifications →
                </button>
              )}
              <button onClick={savePrefs} className="accent-btn"
                style={{ justifyContent: 'center', padding: '11px', borderRadius: 50, fontSize: 13, marginTop: 4 }}>
                {saved ? '✅ Saved' : 'Save Settings'}
              </button>
            </Section>

            <Section title="Account" icon="👤">
              {nameMsg && <p style={{ fontSize: 12, color: nameMsg.startsWith('✅') ? '#22c55e' : '#e8533a', margin: 0 }}>{nameMsg}</p>}
              <Row label="Name" desc={editName ? '' : user?.name}>
                {editName ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={newName} onChange={e => setNewName(e.target.value)}
                      style={{ ...inputStyle, width: 140 }} />
                    <button onClick={saveName} className="accent-btn" style={{ padding: '6px 14px', borderRadius: 50, fontSize: 12 }}>Save</button>
                    <button onClick={() => setEditName(false)}
                      style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditName(true)}
                    style={{ background: 'none', border: 'none', color: '#e8533a', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                )}
              </Row>
              <Row label="Email" desc={user?.email}>
                <span style={{ fontSize: 11, color: '#bbb' }}>Contact support to change</span>
              </Row>
            </Section>

          </div>
        </div>
      </div>
    </Layout>
  )
}
