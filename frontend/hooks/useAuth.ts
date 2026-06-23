'use client'
import { useState, useEffect, useCallback } from 'react'

interface User {
  id: number
  username: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load token from sessionStorage/localStorage on mount and listen for changes
  useEffect(() => {
    const loadAuth = () => {
      // Check sessionStorage first (more secure, current tab only)
      let savedToken = sessionStorage.getItem('token')
      let savedUser = sessionStorage.getItem('user')

      // Fall back to localStorage if sessionStorage empty (browser reopened)
      if (!savedToken) {
        savedToken = localStorage.getItem('token')
        savedUser = localStorage.getItem('user')
        // Restore to sessionStorage for this session
        if (savedToken) {
          sessionStorage.setItem('token', savedToken)
          if (savedUser) sessionStorage.setItem('user', savedUser)
        }
      }

      if (savedToken) {
        setToken(savedToken)
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      } else {
        setToken(null)
        setUser(null)
      }
      setLoading(false)
    }

    loadAuth()

    // Listen for storage changes (other tabs/windows)
    window.addEventListener('storage', loadAuth)
    // Listen for custom auth change event (same tab)
    window.addEventListener('authChange', loadAuth)
    return () => {
      window.removeEventListener('storage', loadAuth)
      window.removeEventListener('authChange', loadAuth)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Login failed')
      }

      const data = await response.json()
      const userToken = data.data.token
      const userData = {
        id: data.data.id,
        username: data.data.username,
        email: data.data.email,
        created_at: data.data.created_at,
      }

      // Store in both sessionStorage (secure) and localStorage (persistent)
      sessionStorage.setItem('token', userToken)
      sessionStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token', userToken)
      localStorage.setItem('user', JSON.stringify(userData))
      setToken(userToken)
      setUser(userData)
      window.dispatchEvent(new Event('authChange'))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Registration failed')
      }

      const data = await response.json()
      const userToken = data.data.token
      const userData = {
        id: data.data.id,
        username: data.data.username,
        email: data.data.email,
        created_at: data.data.created_at,
      }

      // Store in both sessionStorage (secure) and localStorage (persistent)
      sessionStorage.setItem('token', userToken)
      sessionStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token', userToken)
      localStorage.setItem('user', JSON.stringify(userData))
      setToken(userToken)
      setUser(userData)
      window.dispatchEvent(new Event('authChange'))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    // Clear from both storages
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setError(null)
    window.dispatchEvent(new Event('authChange'))
  }, [])

  return {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  }
}
