import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Zap } from 'lucide-react'

/**
 * Landing page after OAuth redirect.
 * URL: /auth/callback?token=<signed-token>
 * Calls backend /auth/verify to decode the token, then logs the user in.
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Completing sign-in…')

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      setStatus(`Error: ${decodeURIComponent(error)}`)
      setTimeout(() => navigate('/signin'), 3000)
      return
    }

    if (!token) {
      setStatus('No token received. Redirecting…')
      setTimeout(() => navigate('/signin'), 2000)
      return
    }

    // Verify token with backend
    fetch(`http://localhost:8000/auth/verify?token=${encodeURIComponent(token)}`)
      .then(r => {
        if (!r.ok) throw new Error('Token verification failed')
        return r.json()
      })
      .then(user => {
        loginWithToken(user)
        navigate('/dashboard', { replace: true })
      })
      .catch(err => {
        setStatus(`Sign-in failed: ${err.message}`)
        setTimeout(() => navigate('/signin'), 3000)
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8e8ed]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
          <Zap size={28} className="text-white" />
        </div>
        <p className="text-gray-700 font-semibold text-lg mb-2">VoiceAgent</p>
        <p className="text-gray-400 text-sm">{status}</p>
        <div className="flex justify-center gap-1.5 mt-4">
          {[0,1,2].map(i => (
            <span key={i} className="typing-dot w-2 h-2 rounded-full bg-orange-400 block" />
          ))}
        </div>
      </div>
    </div>
  )
}
