import { useState } from 'react'
import { QuestionBank } from '../../lib/questionBank'

type Mode = 'study' | 'exam'

interface ExamHomeProps {
  bank: QuestionBank
  history: ExamHistoryEntry[]
  onStart: (mode: Mode) => void
}

export interface ExamHistoryEntry {
  date: string
  score: number
  pct: number
  correct: number
  total: number
  timeUsed: number
}

export default function ExamHome({ bank, history, onStart }: ExamHomeProps) {
  const [mode, setMode] = useState<Mode>('exam')

  const attempts = history.length
  const avg = attempts > 0
    ? Math.round(history.reduce((s, h) => s + h.pct, 0) / attempts)
    : null
  const best = attempts > 0
    ? Math.max(...history.map(h => h.pct))
    : null

  return (
    <div className="exam-home">
      {/* Hero */}
      <div className="exam-home-hero">
        <div className="exam-home-badges">
          <span className="exam-badge badge-course">{bank.courseCode}</span>
          <span className="exam-badge badge-level">{bank.level}</span>
          <span className="exam-badge badge-count">{bank.questions.length} Questions</span>
        </div>
        <h2 className="exam-home-title">Exam Practice</h2>
        <p className="exam-home-sub">{bank.description}</p>
      </div>

      {/* Stats */}
      <div className="exam-stats-grid">
        <div className="exam-stat-card">
          <span className="exam-stat-n">{attempts || 0}</span>
          <span className="exam-stat-l">Exams taken</span>
        </div>
        <div className="exam-stat-card">
          <span className="exam-stat-n">{avg !== null ? `${avg}%` : '—'}</span>
          <span className="exam-stat-l">Average score</span>
        </div>
        <div className="exam-stat-card">
          <span className="exam-stat-n">{best !== null ? `${best}%` : '—'}</span>
          <span className="exam-stat-l">Best score</span>
        </div>
        <div className="exam-stat-card">
          <span className="exam-stat-n">{bank.questions.length}</span>
          <span className="exam-stat-l">Questions</span>
        </div>
      </div>

      {/* Mode selection */}
      <div className="mode-grid">
        <div
          className={`mode-card${mode === 'study' ? ' mode-selected' : ''}`}
          onClick={() => setMode('study')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setMode('study')}
          aria-pressed={mode === 'study'}
        >
          <div className="mode-icon">📖</div>
          <h3 className="mode-title">Study Mode</h3>
          <p className="mode-desc">
            Practice at your own pace with instant feedback and explanations. No time limit.
          </p>
        </div>

        <div
          className={`mode-card${mode === 'exam' ? ' mode-selected' : ''}`}
          onClick={() => setMode('exam')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setMode('exam')}
          aria-pressed={mode === 'exam'}
        >
          <div className="mode-icon">⏱️</div>
          <h3 className="mode-title">Exam Mode</h3>
          <p className="mode-desc">
            100 questions. 2-hour timer. Full JAMB CBT experience with question navigation.
          </p>
        </div>
      </div>

      <div className="exam-home-start">
        <button className="btn-primary" onClick={() => onStart(mode)}>
          Start {mode === 'study' ? 'Study' : 'Exam'} Session
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="exam-history">
          <p className="history-title">Recent Exams</p>
          {history.slice(0, 5).map((h, i) => (
            <div key={i} className="history-row">
              <span className="history-date">{h.date}</span>
              <span className="history-detail">{h.correct}/{h.total} correct</span>
              <span className={`history-pct ${h.pct >= 70 ? 'good' : h.pct >= 50 ? 'mid' : 'bad'}`}>
                {h.pct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
