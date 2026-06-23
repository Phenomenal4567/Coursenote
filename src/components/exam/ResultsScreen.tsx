import { useState } from 'react'
import { Question } from '../../lib/questionBank'

interface ResultsScreenProps {
  questions: Question[]
  answers: (number | null)[]
  timeUsed: number       // seconds
  onTakeAnother: () => void
  onGoHome: () => void
}

const KEYS = ['A', 'B', 'C', 'D', 'E']

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${pad(m)}m ${pad(s)}s`
}

export default function ResultsScreen({
  questions,
  answers,
  timeUsed,
  onTakeAnother,
  onGoHome,
}: ResultsScreenProps) {
  const [showReview, setShowReview] = useState(false)

  const correct = questions.filter((q, i) => answers[i] === q.ans).length
  const wrong = questions.filter((q, i) => answers[i] !== null && answers[i] !== q.ans).length
  const skipped = questions.filter((_, i) => answers[i] === null).length
  const pct = Math.round((correct / questions.length) * 100)

  const scoreClass = pct >= 70 ? 'good' : pct >= 50 ? 'mid' : 'bad'

  const scoreLabel = pct >= 70
    ? '🎉 Excellent work! Well done.'
    : pct >= 50
    ? '👍 Good effort! Keep practising.'
    : '📚 Keep studying — you\'ll improve!'

  return (
    <div className="results-screen">
      <div className="results-card">
        {/* Score circle */}
        <div className="results-header">
          <div className={`score-ring ${scoreClass}`}>
            <span className="score-pct">{pct}%</span>
          </div>
          <h2 className="results-title">Exam Complete</h2>
          <p className="results-sub">{scoreLabel}</p>
          <p className="results-time">Time used: {fmtTime(timeUsed)}</p>
        </div>

        {/* Stats */}
        <div className="results-stats">
          <div className="res-stat">
            <span className="res-stat-n success-color">{correct}</span>
            <span className="res-stat-l">Correct</span>
          </div>
          <div className="res-stat">
            <span className="res-stat-n danger-color">{wrong}</span>
            <span className="res-stat-l">Wrong</span>
          </div>
          <div className="res-stat">
            <span className="res-stat-n muted-color">{skipped}</span>
            <span className="res-stat-l">Skipped</span>
          </div>
          <div className="res-stat">
            <span className="res-stat-n accent-color">{questions.length}</span>
            <span className="res-stat-l">Total</span>
          </div>
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button className="btn-primary results-btn" onClick={onTakeAnother}>
            🔄 Take Another Exam
          </button>
          <button
            className="results-btn-sec"
            onClick={() => setShowReview(v => !v)}
          >
            {showReview ? 'Hide Review' : '📋 Review Answers'}
          </button>
          <button className="results-btn-sec" onClick={onGoHome}>
            🏠 Home
          </button>
        </div>

        {/* Review */}
        {showReview && (
          <div className="review-section">
            <p className="review-heading">Answer Review</p>
            {questions.map((q, i) => {
              const userAns = answers[i]
              const isCorrect = userAns === q.ans
              const isSkipped = userAns === null
              return (
                <div
                  key={q.id}
                  className={`review-item ${isCorrect ? 'review-correct' : isSkipped ? 'review-skipped' : 'review-wrong'}`}
                >
                  <div className="review-q-row">
                    <span className="review-num">{i + 1}</span>
                    <p className="review-q-text">{q.q}</p>
                  </div>
                  <div className="review-answers">
                    {isSkipped ? (
                      <span className="review-skipped-label">⚪ Skipped</span>
                    ) : (
                      <span className={isCorrect ? 'review-correct-label' : 'review-wrong-label'}>
                        {isCorrect ? '✓' : '✗'} Your answer: <strong>{KEYS[userAns!]}. {q.opts[userAns!]}</strong>
                      </span>
                    )}
                    {!isCorrect && (
                      <span className="review-correct-label">
                        ✓ Correct: <strong>{KEYS[q.ans]}. {q.opts[q.ans]}</strong>
                      </span>
                    )}
                    {q.explanation && (
                      <span className="review-explanation">{q.explanation}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
