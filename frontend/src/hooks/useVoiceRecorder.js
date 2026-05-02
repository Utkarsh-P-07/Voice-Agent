import { useState, useRef, useCallback } from 'react'

/**
 * Hook that records audio from the microphone using MediaRecorder.
 * Returns { isRecording, startRecording, stopRecording, audioBlob }
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob]     = useState(null)
  const mediaRef   = useRef(null)
  const chunksRef  = useRef([])

  const startRecording = useCallback(async () => {
    chunksRef.current = []
    setAudioBlob(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(100)
      mediaRef.current = mr
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone error:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  return { isRecording, startRecording, stopRecording, audioBlob }
}
