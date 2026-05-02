import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import OAuthCallback from './pages/auth/OAuthCallback'
import Dashboard from './pages/Dashboard'
import Todos from './pages/Todos'
import Memory from './pages/Memory'
import Stats from './pages/Stats'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes */}
        <Route path="/signin"         element={<SignIn />} />
        <Route path="/signup"         element={<SignUp />} />
        <Route path="/auth/callback"  element={<OAuthCallback />} />

        {/* Protected app routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="todos"     element={<Todos />} />
          <Route path="memory"    element={<Memory />} />
          <Route path="stats"     element={<Stats />} />
          <Route path="profile"   element={<Profile />} />
          <Route path="settings"  element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
