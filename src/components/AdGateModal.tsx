import { useState, useEffect, useRef, useCallback } from 'react'

const PARTNERS = {
  pickinvoice: {
    url: 'https://pickinvoiceng.vercel.app',
    name: 'PickInvoice',
    icon: '🧾',
    desc: 'Free invoice generator for Nigerian businesses',
  },
  pickbook: {
    url: 'https://pickbookng.up.railway.app',
    name: 'PickBook',
    icon: '📖',
    desc: 'Nigerian novel & book reading app',
  },
}

type Partner = keyof typeof PARTNERS
type Step = 1 | 2 | 3

interface Props {
  fileId: string | null
  onClose: () => void
  onDownloadReady: () => void
}

const TOTAL_SECS = 20
const CIRCUMFERENCE = 251.2

export default function AdGateModal({ fileId, onClose, onDownloadReady }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tabClosed, setTabClosed] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Waiting for partner tab to open…')
  const [statusClass, setStatusClass] = useState('')
  const [tokenSecs, setTokenSecs] = useState(60)
  const [adSessionToken, setAdSessionToken] = useState<string | null>(null)

  const partnerTabRef = useRef<Window | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const tokenTimerRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  const isOpen = fileId !== null

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedPartner(null)
      setElapsed(0)
      setPaused(false)
      setTabClosed(false)
      setStatusMsg('Waiting for partner tab to open…')
      setStatusClass('')
    }
  }, [isOpen, fileId])

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearTimers() }
  }, [])

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (tokenTimerRef.current) clearInterval(tokenTimerRef.current)
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
  }

  // ─── START AD SESSION ──────────────────────────────────────────
  async function startAdSession(partnerId: Partner): Promise<string | null> {
    try {
      const res = await fetch('/api/ad/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, partnerId }),
      })
      const data = await res.json()
      return data.sessionToken || null
    } catch {
      return null
    }
  }

  // ─── HEARTBEAT ────────────────────────────────────────────────
  function startHeartbeat(token: string) {
    heartbeatRef.current = setInterval(async () => {
      const tabActive = !!(partnerTabRef.current && !partnerTabRef.current.closed)
      try {
        const res = await fetch('/api/ad/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token, tabActive }),
        })
        const data = await res.json()
        if (data.completed) {
          clearTimers()
          onTimerComplete(token)
        }
      } catch {
        // silent fail — client timer is source of truth for UX; server validates on download
      }
    }, 5000)
  }

  // ─── OPEN PARTNER TAB ─────────────────────────────────────────
  async function openPartnerTab() {
    if (!selectedPartner || !fileId) return

    const token = await startAdSession(selectedPartner)
    setAdSessionToken(token)

    const partner = PARTNERS[selectedPartner]
    partnerTabRef.current = window.open(partner.url, '_blank')

    setStep(2)
    setTabClosed(false)
    setElapsed(0)
    setPaused(false)
    setStatusMsg('Timer running… keep the partner tab open!')
    setStatusClass('')

    if (token) startHeartbeat(token)
    startClientTimer()

    // Watch for this page's visibility
    document.addEventListener('visibilitychange', handleVisChange)
    window.addEventListener('focus', handleFocus)
  }

  function handleVisChange() {
    if (document.hidden) {
      // User left this tab — assume on partner tab
      setPaused(false)
    } else {
      // User came back — pause timer
      setPaused(true)
    }
  }

  function handleFocus() {
    setPaused(true)
  }

  function startClientTimer() {
    clearInterval(timerRef.current!)
    let localElapsed = 0

    timerRef.current = setInterval(() => {
      // Check if partner tab closed
      if (partnerTabRef.current && partnerTabRef.current.closed) {
        clearTimers()
        setTabClosed(true)
        setStatusMsg('Partner tab was closed.')
        return
      }

      if (document.hasFocus()) {
        // We're focused — timer paused (user is on this tab)
        setPaused(true)
        return
      }

      // Running
      setPaused(false)
      localElapsed++
      setElapsed(localElapsed)

      if (localElapsed === 10) {
        setStatusMsg('⚡ Halfway there! Keep the tab open.')
        setStatusClass('mid')
      }

      if (localElapsed >= TOTAL_SECS) {
        clearTimers()
        onTimerComplete(adSessionToken)
      }
    }, 1000)
  }

  function onTimerComplete(token: string | null) {
    document.removeEventListener('visibilitychange', handleVisChange)
    window.removeEventListener('focus', handleFocus)
    setStatusMsg('✅ Verified! Generating your download token…')
    setStatusClass('done')

    setTimeout(() => {
      setStep(3)
      setTokenSecs(60)
      startTokenCountdown()
    }, 700)
  }

  function startTokenCountdown() {
    let secs = 60
    tokenTimerRef.current = setInterval(() => {
      secs--
      setTokenSecs(secs)
      if (secs <= 0) {
        clearInterval(tokenTimerRef.current!)
      }
    }, 1000)
  }

  function handleClose() {
    clearTimers()
    document.removeEventListener('visibilitychange', handleVisChange)
    window.removeEventListener('focus', handleFocus)
    if (partnerTabRef.current && !partnerTabRef.current.closed) {
      partnerTabRef.current.close()
    }
    onClose()
  }

  function handleFinalDownload() {
    clearTimers()
    onDownloadReady()
    handleClose()
  }

  const remaining = TOTAL_SECS - elapsed
  const progressOffset = (elapsed / TOTAL_SECS) * CIRCUMFERENCE
  const partner = selectedPartner ? PARTNERS[selectedPartner] : null

  if (!isOpen) return null

  return (
    <div className={`ad-overlay open`} onClick={(e) => e.target === e.currentTarget && step === 1 && handleClose()}>
      <div className="modal">

        {/* ── STEP 1: PARTNER SELECTION ── */}
        {step === 1 && (
          <div>
            <div className="modal-header">
              <div className="modal-title">Support the Platform</div>
              <div className="modal-step">Step 1 of 2</div>
            </div>
            <p className="modal-desc">
              CourseNotes is free! Choose a partner site to visit for <strong>20 seconds</strong> to unlock your download.
              After <strong>2 downloads</strong>, the ad gate is permanently removed for your device.
            </p>

            <div className="partner-grid">
              {(Object.entries(PARTNERS) as [Partner, typeof PARTNERS[Partner]][]).map(([id, p]) => (
                <div
                  key={id}
                  className={`partner-card${selectedPartner === id ? ' selected' : ''}`}
                  onClick={() => setSelectedPartner(id)}
                >
                  <div className="partner-icon">{p.icon}</div>
                  <div className="partner-name">{p.name}</div>
                  <div className="partner-desc">{p.desc}</div>
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              disabled={!selectedPartner}
              onClick={openPartnerTab}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Visit Partner Site
            </button>
            <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          </div>
        )}

        {/* ── STEP 2: TIMER ── */}
        {step === 2 && (
          <div>
            <div className="modal-header">
              <div className="modal-title">Stay on the Partner Site</div>
              <div className="modal-step">Step 2 of 2</div>
            </div>
            <p className="modal-desc">
              Keep the partner tab open and active. Your timer will <strong>pause</strong> if you switch away.
            </p>

            {tabClosed && (
              <div className="timer-warning show">
                ⚠️ Tab closed too early! Please click &quot;Open Again&quot; to restart the timer.
              </div>
            )}

            <div className="timer-section">
              <div className="timer-ring-wrap">
                <svg className="timer-svg" width="100" height="100" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: '#1D4ED8' }} />
                      <stop offset="100%" style={{ stopColor: '#60A5FA' }} />
                    </linearGradient>
                  </defs>
                  <circle className="timer-track" cx="50" cy="50" r="40" />
                  <circle
                    className="timer-progress"
                    cx="50" cy="50" r="40"
                    style={{ strokeDashoffset: CIRCUMFERENCE - progressOffset }}
                  />
                </svg>
                <div className="timer-number">
                  <div className="timer-count">{Math.max(0, remaining)}</div>
                  <div className="timer-unit">secs</div>
                </div>
              </div>

              <div className={`timer-status${statusClass ? ' ' + statusClass : ''}`}>{statusMsg}</div>

              <div className="timer-site-label">
                <div className="pulse-dot" style={{ opacity: tabClosed ? 0.2 : 1 }} />
                <span>{partner?.name ?? '—'}</span>
              </div>

              {paused && !tabClosed && (
                <div className="paused-banner show">
                  ⏸ Timer paused — please switch back to the partner tab
                </div>
              )}
            </div>

            {tabClosed && (
              <button className="btn-primary" onClick={openPartnerTab}>
                🔄 Open Partner Site Again
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === 3 && (
          <div>
            <div className="done-section">
              <div className="done-icon">✅</div>
              <div className="done-title">All Set!</div>
              <div className="done-sub">Thanks for supporting the platform. Your download is ready.</div>
              {tokenSecs > 0 ? (
                <div className="token-expire">
                  ⏱ Token expires in <strong>{tokenSecs}</strong>s — download now!
                </div>
              ) : (
                <div className="token-expire" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                  ❌ Token expired. Close and try again.
                </div>
              )}
            </div>
            <button
              className="btn-primary"
              disabled={tokenSecs <= 0}
              onClick={handleFinalDownload}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF Now
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
