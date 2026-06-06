import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { GetServerSideProps } from 'next'
import Navbar from '../components/Navbar'
import PDFCard, { SkeletonCard } from '../components/PDFCard'
import AdGateModal from '../components/AdGateModal'
import ShareToast from '../components/ShareToast'
import { supabase, Course } from '../lib/supabase'

const SK  = '__cn_dlcount__'
const SK2 = '__cn_unlocked__'

interface Props {
  initialCourses: Course[]
  totalDownloads: number
}

export default function Home({ initialCourses, totalDownloads }: Props) {
  const [courses]         = useState<Course[]>(initialCourses)
  const [loading]         = useState(false)
  const [search, setSearch]       = useState('')
  const [levelFilter, setLevel]   = useState('')
  const [semFilter, setSem]       = useState('')
  const [sortBy, setSort]         = useState('')
  const [isUnlocked, setUnlocked] = useState(false)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Init unlock state from localStorage
  useEffect(() => {
    const count = parseInt(localStorage.getItem(SK) || '0')
    const unlocked = localStorage.getItem(SK2) === '1' || count >= 2
    setUnlocked(unlocked)
  }, [])

  // Filtered + sorted courses
  const filtered = useMemo(() => {
    let list = courses.filter(c => {
      const q = search.toLowerCase()
      const matchQ = !q || c.title.toLowerCase().includes(q) || c.course_code.toLowerCase().includes(q)
      const matchL = !levelFilter || c.level === levelFilter
      const matchS = !semFilter   || c.semester === semFilter
      return matchQ && matchL && matchS
    })

    if (sortBy === 'downloads') list = [...list].sort((a, b) => b.download_count - a.download_count)
    else if (sortBy === 'newest') list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === 'level')  list = [...list].sort((a, b) => parseInt(a.level) - parseInt(b.level))

    return list
  }, [courses, search, levelFilter, semFilter, sortBy])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleDownload(id: string) {
    if (isUnlocked) {
      executeDownload(id)
    } else {
      setPendingFileId(id)
    }
  }

  async function executeDownload(fileId: string) {
    try {
      const res = await fetch(`/api/download/request?fileId=${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Download failed', 'error')
        return
      }

      // Trigger download
      const a = document.createElement('a')
      a.href = data.url
      a.download = data.filename || 'course-notes.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Track verified download
      const count = parseInt(localStorage.getItem(SK) || '0') + 1
      localStorage.setItem(SK, String(count))
      if (count >= 2 && !isUnlocked) {
        localStorage.setItem(SK2, '1')
        setUnlocked(true)
        showToast('🎉 You\'ve unlocked unlimited downloads! No more ads.', 'success')
      } else {
        const course = courses.find(c => c.id === fileId)
        showToast(`✅ "${course?.title ?? 'PDF'}" download started!`)
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    }
  }

  function handleAdComplete() {
    if (pendingFileId) {
      executeDownload(pendingFileId)
      setPendingFileId(null)
    }
  }

  return (
    <>
      <Head>
        <title>CourseNotes — Engineering PDF Hub</title>
      </Head>

      <Navbar />

      <main>
        {/* ─── HERO ──────────────────────────── */}
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-tag">
            <span>⚡</span> Engineering Department
          </div>
          <h1>
            Free Course Notes for<br />
            <span className="highlight">Engineering Students</span>
          </h1>
          <p className="hero-sub">
            Download PDF notes for every level and semester. No account needed.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-num">{courses.length}+</div>
              <div className="stat-label">Course PDFs</div>
            </div>
            <div className="stat">
              <div className="stat-num">{totalDownloads.toLocaleString()}</div>
              <div className="stat-label">Downloads</div>
            </div>
            <div className="stat">
              <div className="stat-num">Free</div>
              <div className="stat-label">Always</div>
            </div>
          </div>
        </section>

        {/* ─── UNLOCK BANNER ──────────────────── */}
        {isUnlocked && (
          <div className="unlock-banner show" style={{ position: 'relative', zIndex: 1 }}>
            <span>🎉</span>
            <span>Unlimited downloads unlocked! All ads removed for this device.</span>
          </div>
        )}

        {/* ─── CONTROLS ───────────────────────── */}
        <div className="controls">
          <div className="search-wrap">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              placeholder="Search by title or course code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="filter-select" value={levelFilter} onChange={e => setLevel(e.target.value)}>
            <option value="">All Levels</option>
            {['100','200','300','400','500'].map(l => (
              <option key={l} value={l}>{l} Level</option>
            ))}
          </select>

          <select className="filter-select" value={semFilter} onChange={e => setSem(e.target.value)}>
            <option value="">All Semesters</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
          </select>

          <select className="filter-select" value={sortBy} onChange={e => setSort(e.target.value)}>
            <option value="">Sort: Default</option>
            <option value="newest">Newest First</option>
            <option value="downloads">Most Downloaded</option>
            <option value="level">By Level</option>
          </select>
        </div>

        {/* ─── GRID ───────────────────────────── */}
        <div className="grid-wrap">
          <p className="section-label">
            Showing {filtered.length} course{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="pdf-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} style={{ animationDelay: `${i * 0.06}s` }} />
                ))
              : filtered.length === 0
              ? (
                <div className="empty">
                  <div className="empty-icon">🔍</div>
                  <p>No courses found. Try a different search.</p>
                </div>
              )
              : filtered.map((c, i) => (
                <PDFCard
                  key={c.id}
                  course={c}
                  isUnlocked={isUnlocked}
                  onDownload={handleDownload}
                  style={{ animationDelay: `${i * 0.06}s` }}
                />
              ))
            }
          </div>
        </div>
      </main>

      {/* ─── AD GATE ────────────────────────── */}
      <AdGateModal
        fileId={pendingFileId}
        onClose={() => setPendingFileId(null)}
        onDownloadReady={handleAdComplete}
      />

      {/* ─── SHARE TOAST ────────────────────── */}
      <ShareToast />

      {/* ─── INLINE TOAST ───────────────────── */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 400,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `4px solid var(--${toast.type === 'success' ? 'success' : 'danger'})`,
            borderRadius: 10, padding: '.9rem 1.2rem', fontSize: '.82rem', color: 'var(--text)',
            boxShadow: '0 8px 32px rgba(0,0,0,.3)', animation: 'fadeUp .3s var(--ease) both',
            maxWidth: 300, lineHeight: 1.4,
          }}
        >
          {toast.msg}
        </div>
      )}
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id,title,course_code,level,semester,description,file_size,file_size_label,download_count,created_at,updated_at')
      .order('created_at', { ascending: false })

    const totalDownloads = (courses || []).reduce((sum: number, c: Course) => sum + (c.download_count || 0), 0)

    return {
      props: {
        initialCourses: courses || [],
        totalDownloads,
      },
    }
  } catch {
    return { props: { initialCourses: [], totalDownloads: 0 } }
  }
}
