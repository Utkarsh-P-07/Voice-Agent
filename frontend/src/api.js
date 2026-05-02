import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Todos ─────────────────────────────────────────────────────────────────────
export const getTodos    = (done)        => api.get('/todos', { params: done !== undefined ? { done } : {} })
export const createTodo  = (title, priority) => api.post('/todos', { title, priority })
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
