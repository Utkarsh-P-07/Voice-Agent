import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('va_user')) || null }
    catch { return null }
  })

  // Email/password sign-in (localStorage demo)
  function signIn(email, password) {
    const stored = JSON.parse(localStorage.getItem('va_accounts') || '[]')
    const found  = stored.find(a => a.email === email && a.password === password)
    if (!found) throw new Error('Invalid email or password.')
    const u = { name: found.name, email: found.email, avatar: found.name[0].toUpperCase(), provider: 'email' }
    _persist(u)
    return u
  }

  // Email/password sign-up (localStorage demo)
  function signUp(name, email, password) {
    const stored = JSON.parse(localStorage.getItem('va_accounts') || '[]')
    if (stored.find(a => a.email === email)) throw new Error('Email already registered.')
    localStorage.setItem('va_accounts', JSON.stringify([...stored, { name, email, password }]))
    const u = { name, email, avatar: name[0].toUpperCase(), provider: 'email' }
    _persist(u)
    return u
  }

  // Called after OAuth callback — token already verified by backend
  function loginWithToken(userPayload) {
    const u = {
      name:     userPayload.name    || 'User',
      email:    userPayload.email   || '',
      avatar:   userPayload.avatar  || (userPayload.name?.[0] || 'U').toUpperCase(),
      picture:  userPayload.picture || '',
      provider: userPayload.provider || 'oauth',
    }
    _persist(u)
    return u
  }

  function signOut() {
    setUser(null)
    localStorage.removeItem('va_user')
  }

  function _persist(u) {
    setUser(u)
    localStorage.setItem('va_user', JSON.stringify(u))
  }

  // Redirect to backend OAuth endpoint
  function oauthRedirect(provider) {
    window.location.href = `http://localhost:8000/auth/${provider}`
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loginWithToken, oauthRedirect }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
