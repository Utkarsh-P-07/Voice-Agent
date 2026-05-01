import { useVoiceAgent } from '../hooks/useVoiceAgent'

const HINTS = [
  '"Add a task to buy groceries"',
  '"Remind me to call mom tomorrow"',
  '"Schedule a meeting at 3 PM"',
]

const STATUS_CONFIG = {
  idle:      { bg: '#e8533a', scale: 1,    label: 'Hold to speak',  labelColor: '#bbb' },
  listening: { bg: '#e8533a', scale: 1.12, label: 'Listening...',   labelColor: '#e8533a' },
  thinking:  { bg: '#f97316', scale: 1,    label: 'Processing...',  labelColor: '#f97316' },
  speaking:  { bg: '#22c55e', scale: 1,    label: 'Speaking...',    labelColor: '#22c55e' },
}

export default function VoiceModal({ onClose, onSaved }) {
  const { status, transcript, agentReply, error, startListening, stopListening } = useVoiceAgent(onSaved)
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f5f5f5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Add Task with Voice</h2>
          <button onClick={onClose}
            style={{ padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: 50, fontSize: 12, color: '#888', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
        </div>

        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

          {/* Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 40 }}>
            {(status === 'listening'
              ? [14, 26, 18, 34, 22, 30, 16]
              : [6, 10, 6, 10, 6, 10, 6]
            ).map((h, i) => (
              <div key={i}
                className={status === 'listening' ? 'wave-bar' : ''}
                style={{ width: 5, height: h, background: status === 'listening' ? '#e8533a' : '#e0e0e0', borderRadius: 3 }} />
            ))}
          </div>

          {/* Mic button */}
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={e => { e.preventDefault(); startListening() }}
            onTouchEnd={stopListening}
            disabled={status === 'thinking' || status === 'speaking'}
            style={{
              width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: status === 'thinking' ? 'wait' : 'pointer',
              background: cfg.bg, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: `scale(${cfg.scale})`, transition: 'all 0.2s',
              boxShadow: status === 'listening' ? '0 0 0 12px rgba(232,83,58,0.15)' : '0 8px 24px rgba(232,83,58,0.3)',
              userSelect: 'none',
            }}>
            {status === 'thinking' ? '⏳' : status === 'speaking' ? '🔊' : '🎤'}
          </button>

          {/* Status label */}
          <p style={{ fontSize: 13, fontWeight: 600, color: cfg.labelColor, margin: 0 }}>{cfg.label}</p>

          {/* Error */}
          {error && (
            <div style={{ width: '100%', background: '#fff0ee', borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 13, color: '#e8533a', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div style={{ width: '100%', background: '#f5f5f5', borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 10, color: '#bbb', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>You said</p>
              <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{transcript}</p>
            </div>
          )}

          {/* Agent reply */}
          {agentReply && (
            <div style={{ width: '100%', background: '#fff0ee', borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 10, color: '#e8533a', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</p>
              <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{agentReply}</p>
            </div>
          )}

          {/* Hints */}
          {status === 'idle' && !transcript && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#bbb', fontWeight: 600, margin: '0 0 6px' }}>Try saying:</p>
              {HINTS.map((h, i) => (
                <p key={i} style={{ fontSize: 11, color: '#ccc', margin: '3px 0' }}>{h}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
