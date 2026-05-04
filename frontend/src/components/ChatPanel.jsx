import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Sparkles, Bot, User } from 'lucide-react'
import { sendChat, sendVoice } from '../api'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import clsx from 'clsx'

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3">
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot w-2 h-2 rounded-full bg-orange-300 block" />
      ))}
    </div>
  )
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-2.5 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center',
        isUser
          ? 'bg-gradient-to-br from-orange-500 to-orange-400'
          : 'bg-gradient-to-br from-gray-700 to-gray-600'
      )}>
        {isUser
          ? <User size={12} className="text-white" />
          : <Bot  size={12} className="text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={clsx('max-w-[78%]', isUser ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
        <div className={clsx(
          'px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'text-white rounded-2xl rounded-tr-sm'
            : 'text-gray-700 rounded-2xl rounded-tl-sm',
        )}
          style={isUser
            ? { background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 12px rgba(249,115,22,0.25)' }
            : { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
          }
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
      </div>
    </div>
  )
}

/* Activity summary strip */
function ActivityStrip({ messages }) {
  const userMsgs = messages.filter(m => m.role === 'user').length
  return (
    <div className="mx-4 mb-3 rounded-2xl p-3 flex gap-4"
      style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)' }}>
      <div className="text-center flex-1">
        <p className="text-lg font-bold text-gray-800">{userMsgs}</p>
        <p className="text-[10px] text-gray-400">Queries</p>
      </div>
      <div className="w-px bg-orange-100" />
      <div className="text-center flex-1">
        <p className="text-lg font-bold text-gray-800">{messages.filter(m => m.role === 'assistant').length}</p>
        <p className="text-[10px] text-gray-400">Responses</p>
      </div>
      <div className="w-px bg-orange-100" />
      <div className="text-center flex-1">
        <p className="text-lg font-bold gradient-text">{Math.max(0, userMsgs - 1)}</p>
        <p className="text-[10px] text-gray-400">Tasks done</p>
      </div>
    </div>
  )
}

export default function ChatPanel() {
  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hi! I'm your AI voice assistant. Ask me to add tasks, list todos, or remember something important.",
    time: now(),
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState('')
  const bottomRef = useRef(null)
  const { isRecording, startRecording, stopRecording, audioBlob } = useVoiceRecorder()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { if (audioBlob) handleVoiceSend(audioBlob) }, [audioBlob])

  function addMsg(role, content) {
    setMessages(prev => [...prev, { role, content, time: now() }])
  }

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    addMsg('user', text)
    setLoading(true)
    try {
      const { data } = await sendChat(text)
      addMsg('assistant', data.reply)
    } catch (e) {
      addMsg('assistant', `Error: ${e.response?.data?.detail || e.message}`)
    } finally { setLoading(false) }
  }

  async function handleVoiceSend(blob) {
    setStatus('Transcribing…')
    setLoading(true)
    try {
      const { data } = await sendVoice(blob)
      if (data.transcript) addMsg('user', data.transcript)
      addMsg('assistant', data.reply)
    } catch (e) {
      addMsg('assistant', `Voice error: ${e.response?.data?.detail || e.message}`)
    } finally { setLoading(false); setStatus('') }
  }

  function toggleMic() {
    if (isRecording) { stopRecording(); setStatus('') }
    else             { startRecording(); setStatus('Listening…') }
  }

  return (
    <aside className="w-[320px] flex-shrink-0 flex flex-col h-full bg-[#e8e8ed] border-l border-gray-300/70">

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 4px 10px rgba(249,115,22,0.35)' }}>
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">AI Assistant</p>
              <p className="text-[10px] text-gray-400">Powered by Groq</p>
            </div>
          </div>
          {status
            ? <span className="text-[11px] text-orange-500 font-semibold animate-pulse">{status}</span>
            : <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
                Online
              </span>
          }
        </div>
      </div>

      {/* Activity strip */}
      <ActivityStrip messages={messages} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}

        {/* Suggested prompts — shown only when conversation is fresh */}
        {messages.length <= 2 && !loading && (
          <div className="mt-2 mb-4 flex flex-col flex-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Try asking…</p>
            <div className="flex flex-col gap-2 flex-1">
              {[
                { icon: '✅', text: 'Add a high priority task: Review project plan' },
                { icon: '📋', text: 'Show me my pending tasks' },
                { icon: '🧠', text: 'Remember that I prefer morning meetings' },
                { icon: '📊', text: 'How many tasks have I completed?' },
              ].map(({ icon, text }) => (
                <button key={text}
                  onClick={() => { setInput(text) }}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-3 rounded-2xl text-xs text-gray-600 font-medium transition-all hover:scale-[1.01] active:scale-[0.99] flex-1"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                  <span className="text-base leading-none flex-shrink-0">{icon}</span>
                  <span className="leading-snug">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center flex-shrink-0">
              <Bot size={12} className="text-white" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.9)' }}
              className="rounded-2xl rounded-tl-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-3">
        <div className="neu-card-sm flex items-center gap-2 px-4 py-3">
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            placeholder="Ask me anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                       disabled:opacity-30 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 3px 8px rgba(249,115,22,0.3)' }}
          >
            <Send size={13} className="text-white" />
          </button>
          <button
            onClick={toggleMic}
            className={clsx(
              'relative w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95',
              isRecording ? 'bg-red-500' : 'bg-gray-800'
            )}
            style={!isRecording ? { boxShadow: '0 3px 8px rgba(0,0,0,0.2)' } : {}}
          >
            {isRecording && <span className="mic-pulse" />}
            {isRecording
              ? <MicOff size={13} className="text-white relative z-10" />
              : <Mic    size={13} className="text-white" />
            }
          </button>
        </div>
      </div>
    </aside>
  )
}
