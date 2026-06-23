interface QuestionPaletteProps {
  total: number
  current: number
  answered: Set<number>
  flagged: Set<number>
  onJump: (index: number) => void
}

export default function QuestionPalette({
  total,
  current,
  answered,
  flagged,
  onJump,
}: QuestionPaletteProps) {
  function getBtnClass(i: number) {
    const classes = ['palette-btn']
    if (i === current) classes.push('current')
    else if (flagged.has(i)) classes.push('flagged')
    else if (answered.has(i)) classes.push('answered')
    return classes.join(' ')
  }

  const answeredCount = answered.size
  const flaggedCount = flagged.size
  const unanswered = total - answeredCount

  return (
    <div className="exam-sidebar-card">
      <p className="palette-title">Questions</p>

      <div className="palette-grid">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            className={getBtnClass(i)}
            onClick={() => onJump(i)}
            title={`Question ${i + 1}`}
            aria-label={`Go to question ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="palette-legend">
        <div className="legend-row">
          <span className="legend-dot answered-dot" />
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot flagged-dot" />
          <span>Flagged ({flaggedCount})</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot unanswered-dot" />
          <span>Not answered ({unanswered})</span>
        </div>
      </div>

      <div className="palette-progress-text">
        {answeredCount} of {total} answered
      </div>
    </div>
  )
}
