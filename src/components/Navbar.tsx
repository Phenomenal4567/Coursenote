import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('__cn_theme__') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('__cn_theme__', next)
  }

  return (
    <nav>
      <Link href="/" className="nav-logo">
        <div className="nav-logo-icon">📚</div>
        Course<span>Notes</span>
      </Link>
      <div className="nav-right">
        <span className="badge-free">Free</span>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        />
      </div>
    </nav>
  )
}
