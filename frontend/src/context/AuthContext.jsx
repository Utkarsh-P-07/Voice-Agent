import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => {
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', r.data.access_token)
    setUser(r.data.user)
  }

  const signup = async (name, email, password) => {
    const r = await api.post('/auth/signup', { name, email, password })
    localStorage.setItem('token', r.data.access_token)
    setUser(r.data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const r = await api.get('/auth/me')
      setUser(r.data)
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
