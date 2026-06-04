import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, logout as apiLogout } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Auth is cookie-based — just probe /auth/me/ to check session
    getMe()
      .then(r => setUser(r.data))
      .catch(() => {})   // 401 = not logged in; handled silently here
      .finally(() => setLoading(false))
  }, [])

  // token param kept for API compatibility but no longer stored
  const signIn = (_token, userData) => {
    setUser(userData)
  }

  const signOut = async () => {
    try { await apiLogout() } catch {}
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
