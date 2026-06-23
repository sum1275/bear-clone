'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface LoginProps {
  onSwitchToRegister: () => void
}

export default function Login({ onSwitchToRegister }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(username, password)
      // Clear form after successful login
      setUsername('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          Bear Notes
        </h1>

        <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '18px', color: '#666' }}>
          Login
        </h2>

        {error && (
          <div
            style={{
              padding: '12px',
              marginBottom: '15px',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label
              htmlFor="username"
              style={{ display: 'block', marginBottom: '5px', color: '#333', fontSize: '14px' }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '5px', color: '#333', fontSize: '14px' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#cccccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '15px',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline',
            }}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  )
}
