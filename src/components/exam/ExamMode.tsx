import { useState, useEffect, useCallback, useRef } from 'react'
import { Question } from '../../lib/questionBank'
import QuestionCard from './QuestionCard'
import QuestionPalette from './QuestionPalette'
import ExamTimer from './ExamTimer'
import ResultsScreen from './ResultsScreen'

const EXAM_DURATION = 2 * 60 * 60 // 2 hours in seconds
const EXAM_Q_COUNT = 100

interface ExamModeProps {
  questions: Question[]
  onExit: () => void
}

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

export default function ExamMode({ questions, onExit }: ExamModeProps) {
  const examQuestions = useRef<Question[]>(shuffleAndPick(questions, Math.min(EXAM_Q_COUNT, questions.length)))

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    new Array(examQuestions.current.length).fill(null)
  )
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION)
  const [submitted, setSubmitted] = useState(false)
  const [timeUsed, setTimeUsed] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  const answered = new Set(answers.map((a, i) => a !== null ? i : -1).filter(i => i >= 0))
  const total = examQuestions.current.length

  // Countdown timer
  useEffect(() => {
    if (submitted) return
    const id = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(id)
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [submitted])

  function handleSelect(optIdx: number) {
    if (submitted) return
    setAnswers(prev => {
      const next = [...prev]
      next[current] = optIdx
      return next
    })
  }

  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev)
      next.has(current) ? next.delete(current) : next.add(current)
      return next
    })
  }

  function nav(dir: number) {
    setCurrent(prev => Math.max(0, Math.min(total - 1, prev + dir)))
  }

  function handleSubmit(auto = false) {
    if (submitted) return
    setTimeUsed(EXAM_DURATION - secondsLeft)
    setSubmitted(true)
    setShowConfirm(false)
  }

  function handleTakeAnother() {
    examQuestions.current = shuffleAndPick(questions, Math.min(EXAM_Q_COUNT, questions.length))
    setAnswers(new Array(examQuestions.current.length).fill(null))
    setFlagged(new Set())
    setCurrent(0)
    setSecondsLeft(EXAM_DURATION)
    setSubmitted(false)
    setTimeUsed(0)
  }

  if (submitted) {
    return (
      <ResultsScreen
        questions={examQuestions.current}
        answers={answers}
        timeUsed={timeUsed}
        onTakeAnother={handleTakeAnother}
        onGoHome={onExit}
      />
    )
  }

  const q = examQuestions.current[current]

  return (
    <div className="exam-mode-wrap">
      <div className="exam-layout">
        {/* Main column */}
        <div className="exam-main-col">
          {/* Header row */}
          <div className="exam-header-row">
            <ExamTimer secondsLeft={secondsLeft} totalSeconds={EXAM_DURATION} />
            <span className="exam-course-label">GST 112 — 100 Level</span>
          </div>

          <QuestionCard
            question={q}
            questionNumber={current + 1}
            totalQuestions={total}
            selectedAnswer={answers[current]}
            showAnswer={false}
            isFlagged={flagged.has(current)}
            onSelect={handleSelect}
            onFlag={toggleFlag}
          />

          <div className="q-nav-row">
            <button
              className="btn-nav"
              onClick={() => nav(-1)}
              disabled={current === 0}
            >
              ← Prev
            </button>
            <button
              className="btn-nav btn-nav-primary"
              onClick={() => nav(1)}
              disabled={current === total - 1}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="exam-sidebar-col">
          <QuestionPalette
            total={total}
            current={current}
            answered={answered}
            flagged={flagged}
            onJump={setCurrent}
          />

          <div className="exam-action-row">
            <button
              className="btn-submit-exam"
              onClick={() => setShowConfirm(true)}
            >
              Submit Exam
            </button>
            <button className="btn-exit-exam" onClick={onExit}>
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal-box">
            <h3 id="confirm-title" className="modal-title">Submit Exam?</h3>
            <p className="modal-body">
              You have answered <strong>{answered.size}</strong> of <strong>{total}</strong> questions.
              {answered.size < total && (
                <> {total - answered.size} question{total - answered.size !== 1 ? 's' : ''} will be marked as skipped.</>
              )}
            </p>
            <div className="modal-actions">
              <button className="btn-primary modal-btn" onClick={() => handleSubmit()}>
                Yes, Submit
              </button>
              <button className="modal-btn-sec" onClick={() => setShowConfirm(false)}>
                Continue Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
