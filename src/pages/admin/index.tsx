import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid password')
      } else {
        // Token stored as httpOnly cookie by the API route
        router.push('/admin/dashboard')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Admin Login — CourseNotes</title></Head>
      <Navbar />
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="nav-logo-icon">📚</div>
            <span style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>
              Admin Panel
            </span>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label htmlFor="password">Admin Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
              />
            </div>
            <button className="btn-submit" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Logging in…' : 'Login →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
