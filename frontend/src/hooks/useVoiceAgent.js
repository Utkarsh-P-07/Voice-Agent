import { useState, useRef } from 'react'
import api from '../api'

export function useVoiceAgent(onReply) {
  const [status, setStatus] = useState('idle') // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('')
  const [agentReply, setAgentReply] = useState('')
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startListening = async () => {
    setError('')
    setTranscript('')
    setAgentReply('')

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access denied. Please allow mic access in your browser settings.')
      return
    }

    setStatus('listening')
    chunksRef.current = []

    // Pick best supported format
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setStatus('thinking')

      const blob = new Blob(chunksRef.current, { type: mimeType })
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
      const formData = new FormData()
      formData.append('audio', blob, `recording.${ext}`)

      try {
        const r = await api.post('/agent/voice', formData)
        setTranscript(r.data.transcript)
        setAgentReply(r.data.reply)
        setStatus('speaking')
        speak(r.data.reply, () => {
          setStatus('idle')
          onReply && onReply(r.data)
        })
      } catch (err) {
        const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
        setError(msg)
        setStatus('idle')
      }
    }

    recorder.start()
  }

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const speak = (text, onEnd) => {
    if (!window.speechSynthesis) { onEnd?.(); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.onend = onEnd
    utterance.onerror = onEnd
    window.speechSynthesis.speak(utterance)
  }

  return { status, transcript, agentReply, error, startListening, stopListening }
}
