import { useState, useRef } from 'react'
import { Question } from '../../lib/questionBank'
import QuestionCard from './QuestionCard'

interface StudyModeProps {
  questions: Question[]
  onExit: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function StudyMode({ questions, onExit }: StudyModeProps) {
  const shuffled = useRef<Question[]>(shuffle(questions))

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(shuffled.current.length).fill(null)
  )
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)

  const total = shuffled.current.length
  const q = shuffled.current[current]
  const answered = answers[current] !== null

  function handleSelect(optIdx: number) {
    if (answered) return
    const isCorrect = optIdx === q.ans
    setAnswers(prev => {
      const next = [...prev]
      next[current] = optIdx
      return next
    })
    if (isCorrect) setCorrect(c => c + 1)
    else setWrong(w => w + 1)
  }

  function nav(dir: number) {
    setCurrent(prev => Math.max(0, Math.min(total - 1, prev + dir)))
  }

  function restart() {
    shuffled.current = shuffle(questions)
    setCurrent(0)
    setAnswers(new Array(shuffled.current.length).fill(null))
    setCorrect(0)
    setWrong(0)
  }

  const progressPct = Math.round((current / total) * 100)

  return (
    <div className="study-mode-wrap">
      {/* Header */}
      <div className="study-header">
        <div className="study-header-left">
          <span className="study-counter">Question {current + 1} of {total}</span>
          {(correct + wrong > 0) && (
            <span className="study-score">
              ✓ {correct} &nbsp; ✗ {wrong}
            </span>
          )}
        </div>
        <div className="study-header-right">
          <button className="btn-ghost" onClick={restart} title="Restart with new random order">
            🔀 Shuffle
          </button>
          <button className="btn-ghost" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="study-progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
        <div className="study-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Question */}
      <QuestionCard
        question={q}
        questionNumber={current + 1}
        totalQuestions={total}
        selectedAnswer={answers[current]}
        showAnswer={answered}
        onSelect={handleSelect}
      />

      {/* Navigation */}
      <div className="q-nav-row">
        <button
          className="btn-nav"
          onClick={() => nav(-1)}
          disabled={current === 0}
        >
          ← Prev
        </button>
        {current < total - 1 ? (
          <button
            className={`btn-nav btn-nav-primary${!answered ? ' btn-nav-dim' : ''}`}
            onClick={() => nav(1)}
          >
            Next →
          </button>
        ) : (
          <button className="btn-nav btn-nav-primary" onClick={restart}>
            🔀 New Set
          </button>
        )}
      </div>
    </div>
  )
}
