import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach Bearer token from localStorage on every request
api.interceptors.request.use(config => {
  try {
    const user = JSON.parse(localStorage.getItem('va_user'))
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`
    }
  } catch {
    // ignore parse errors
  }
  return config
})

// ── Todos ─────────────────────────────────────────────────────────────────────
export const getTodos    = (done)        => api.get('/todos', { params: done !== undefined ? { done } : {} })
export const createTodo  = (title, priority, category = 'general') => api.post('/todos', { title, priority, category })
export const updateTodo  = (id, patch)   => api.patch(`/todos/${id}`, patch)
export const deleteTodo  = (id)          => api.delete(`/todos/${id}`)

// ── Memories ──────────────────────────────────────────────────────────────────
export const getMemories    = (query, category) => api.get('/memories', { params: { query, category } })
export const createMemory   = (content, category) => api.post('/memories', { content, category })
export const clearMemories  = ()                  => api.delete('/memories')

// ── Chat ──────────────────────────────────────────────────────────────────────
export const sendChat        = (message)    => api.post('/chat', { message })
export const getConversation = ()           => api.get('/conversation')
export const clearConversation = ()         => api.delete('/conversation')

// ── Voice ─────────────────────────────────────────────────────────────────────
export const sendVoice = (blob) => {
  const form = new FormData()
  form.append('audio', blob, 'recording.webm')
  return api.post('/voice', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = () => api.get('/stats')

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = () => api.get('/health')

// ── Profile OTP ───────────────────────────────────────────────────────────────
export const requestOtp   = (field, new_value)       => api.post('/profile/request-otp', { field, new_value })
export const verifyOtp    = (field, new_value, otp)  => api.post('/profile/verify-otp', { field, new_value, otp })
export const applyChange  = (verified_token)         => api.post('/profile/apply-change', { verified_token })
export const getProfileMe = ()                       => api.get('/profile/me')

// ── Push Notifications ────────────────────────────────────────────────────────
export const getVapidKey         = ()           => api.get('/push/vapid-public-key')
export const subscribePush       = (sub, name)  => api.post('/push/subscribe', { ...sub, device_name: name })
export const unsubscribePush     = (endpoint)   => api.delete('/push/unsubscribe', { data: { endpoint } })
export const getPushSubscriptions = ()          => api.get('/push/subscriptions')
export const sendTestPush        = ()           => api.post('/push/test')

// ── Device Linking ────────────────────────────────────────────────────────────
export const generateQR    = ()         => api.post('/devices/generate-qr')
export const claimDevice   = (body)     => axios.post('http://localhost:8000/api/devices/claim', body)
export const listDevices   = ()         => api.get('/devices/list')
export const removeDevice  = (endpoint) => api.delete(`/devices/${encodeURIComponent(endpoint)}`)
