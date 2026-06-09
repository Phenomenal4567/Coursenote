import { useEffect, useState } from 'react'

export default function StellaToast() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setShow(true), 2000)
    const hideTimer = setTimeout(() => setShow(false), 7000) // 2s delay + 5s visible
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: show ? '40%' : '-150px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '1rem 1.5rem',
        borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        fontSize: '0.95rem',
        width: '320px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        transition: 'top 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        color: 'var(--text)',
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>🙏</span>
      <span>Big thanks to <strong>STELLA</strong> for letting us use her notes!</span>
      <button
        onClick={() => setShow(false)}
        style={{
          marginLeft: 'auto',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '6px',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: '0.85rem',
          padding: '4px 10px',
          fontWeight: 600,
        }}
      >
        ✕ Close
      </button>
    </div>
  )
}