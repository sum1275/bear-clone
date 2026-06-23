'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface RegisterProps {
  onSwitchToLogin: () => void
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await register(username, email, password)
      // Clear form after successful registration
      setUsername('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
          Register
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
              placeholder="Choose a username"
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

          <div style={{ marginBottom: '15px' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: '5px', color: '#333', fontSize: '14px' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
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

          <div style={{ marginBottom: '15px' }}>
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
              placeholder="At least 6 characters"
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
              htmlFor="confirmPassword"
              style={{ display: 'block', marginBottom: '5px', color: '#333', fontSize: '14px' }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
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
            disabled={loading || !username || !email || !password || !confirmPassword}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#cccccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '15px',
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline',
            }}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  )
}
