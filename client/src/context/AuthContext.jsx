import React, { createContext, useContext, useMemo, useState } from 'react'
import authService from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession())
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    let mounted = true
    async function initUser() {
      const currentSession = authService.getSession()
      if (!currentSession?.token) {
        if (mounted) setLoading(false)
        return
      }
      try {
        const { data } = await authService.getCurrentUser()
        if (mounted) {
          const fetchedUser = Array.isArray(data) ? data[0] : data
          const newSession = { ...currentSession, user: fetchedUser }
          authService.saveSession(newSession)
          setSession(newSession)
        }
      } catch (err) {
        if (mounted) {
          authService.clearSession()
          setSession(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    initUser()
    return () => { mounted = false }
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    token: session?.token || null,
    isAuthenticated: Boolean(session?.token),
    loading,
    async login(payload) {
      setLoading(true)
      try {
        const next = await authService.login(payload)
        const { data } = await authService.getCurrentUser()
        const fetchedUser = Array.isArray(data) ? data[0] : data
        const completeSession = { ...next, user: fetchedUser }
        authService.saveSession(completeSession)
        setSession(completeSession)
        return completeSession
      } finally {
        setLoading(false)
      }
    },
    async logout() {
      await authService.logout()
      setSession(null)
    }
  }), [session, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
