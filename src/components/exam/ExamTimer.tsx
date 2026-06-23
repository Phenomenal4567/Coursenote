import { useEffect, useRef } from 'react'

interface ExamTimerProps {
  secondsLeft: number
  totalSeconds: number
}

export default function ExamTimer({ secondsLeft, totalSeconds }: ExamTimerProps) {
  const h = Math.floor(secondsLeft / 3600)
  const m = Math.floor((secondsLeft % 3600) / 60)
  const s = secondsLeft % 60

  const pad = (n: number) => String(n).padStart(2, '0')
  const display = h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`

  const ratio = totalSeconds > 0 ? secondsLeft / totalSeconds : 1
  const isWarning = secondsLeft <= 600 && secondsLeft > 120  // last 10 min
  const isDanger = secondsLeft <= 120                         // last 2 min

  const timerClass = isDanger
    ? 'exam-timer-box danger'
    : isWarning
    ? 'exam-timer-box warning'
    : 'exam-timer-box'

  return (
    <div className={timerClass}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="exam-timer-display">{display}</span>
      {isDanger && <span className="exam-timer-pulse" />}
    </div>
  )
}
