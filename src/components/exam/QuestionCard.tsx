import { Question } from '../../lib/questionBank'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  selectedAnswer: number | null
  showAnswer: boolean       // study mode: show correct/wrong after selection
  isFlagged?: boolean
  onSelect: (optionIndex: number) => void
  onFlag?: () => void
}

const KEYS = ['A', 'B', 'C', 'D', 'E']

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  showAnswer,
  isFlagged,
  onSelect,
  onFlag,
}: QuestionCardProps) {
  function getOptClass(i: number) {
    const base = 'exam-option'
    if (!showAnswer) {
      return selectedAnswer === i ? `${base} selected` : base
    }
    if (i === question.ans) return `${base} correct`
    if (selectedAnswer === i && i !== question.ans) return `${base} wrong`
    return base
  }

  return (
    <div className="question-card">
      <div className="q-meta">
        <span className="q-counter">Question {questionNumber} of {totalQuestions}</span>
        {onFlag && (
          <button
            className={`flag-btn${isFlagged ? ' flagged' : ''}`}
            onClick={onFlag}
            title={isFlagged ? 'Unflag question' : 'Flag question'}
            aria-label={isFlagged ? 'Unflag question' : 'Flag question'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>
        )}
      </div>

      <p className="q-text">{question.q}</p>

      <div className="options-list">
        {question.opts.map((opt, i) => (
          <button
            key={i}
            className={getOptClass(i)}
            onClick={() => !showAnswer && onSelect(i)}
            disabled={showAnswer && selectedAnswer !== null}
            aria-pressed={selectedAnswer === i}
          >
            <span className="opt-key">{KEYS[i]}</span>
            <span className="opt-text">{opt}</span>
          </button>
        ))}
      </div>

      {showAnswer && selectedAnswer !== null && (
        <div className={`feedback-box ${selectedAnswer === question.ans ? 'correct' : 'wrong'}`}>
          {selectedAnswer === question.ans ? (
            <>✓ Correct! {question.explanation ? question.explanation : ''}</>
          ) : (
            <>✗ Wrong. The correct answer is <strong>{question.opts[question.ans]}</strong>.
              {question.explanation ? ` ${question.explanation}` : ''}</>
          )}
        </div>
      )}
    </div>
  )
}
