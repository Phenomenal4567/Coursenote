import { Course } from '../lib/supabase'

interface Props {
  course: Course
  isUnlocked: boolean
  onDownload: (id: string) => void
  style?: React.CSSProperties
}

function isNew(dateStr: string): boolean {
  const created = new Date(dateStr)
  const diff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
  return diff <= 7
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

export default function PDFCard({ course, isUnlocked, onDownload, style }: Props) {
  const newBadge = isNew(course.created_at)
  const semLabel = course.semester === '1st' ? '1st Sem' : '2nd Sem'

  return (
    <div className="pdf-card" style={style}>
      <div className="card-header">
        <div className="card-icon">📄</div>
        <div className="card-badges">
          <span className="badge badge-level">{course.level}L</span>
          <span className="badge badge-sem">{semLabel}</span>
          {newBadge && <span className="badge badge-new">New</span>}
        </div>
      </div>

      <div className="card-code">{course.course_code}</div>
      <div className="card-title">{course.title}</div>

      <div className="card-meta">
        <span>📦 {course.file_size_label || formatBytes(course.file_size)}</span>
        <span>📅 {formatDate(course.created_at)}</span>
      </div>

      {course.description && (
        <div className="card-desc">{course.description}</div>
      )}

      <button
        className={`btn-download${isUnlocked ? ' unlocked' : ''}`}
        onClick={() => onDownload(course.id)}
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isUnlocked ? 'Download PDF' : 'Download PDF'}
      </button>
    </div>
  )
}

export function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="skeleton" style={style}>
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div className="skel" style={{ width: 42, height: 42, borderRadius: 10 }} />
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <div className="skel" style={{ width: 36, height: 22, borderRadius: 20 }} />
          <div className="skel" style={{ width: 50, height: 22, borderRadius: 20 }} />
        </div>
      </div>
      <div className="skel" style={{ width: '40%', height: 12, marginBottom: '.5rem' }} />
      <div className="skel" style={{ width: '80%', height: 18, marginBottom: '.8rem' }} />
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '.8rem' }}>
        <div className="skel" style={{ width: '35%', height: 12 }} />
        <div className="skel" style={{ width: '35%', height: 12 }} />
      </div>
      <div className="skel" style={{ width: '100%', height: 36, borderRadius: 8 }} />
    </div>
  )
}
