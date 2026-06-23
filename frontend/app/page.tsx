'use client';

import { useState } from 'react'
import NotesApp from '@/components/NotesApp'
import Login from '@/components/Login'
import Register from '@/components/Register'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    )
  }

  return <NotesApp />
}
