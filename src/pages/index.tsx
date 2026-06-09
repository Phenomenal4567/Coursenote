import { useState, useEffect, useMemo, useRef } from 'react'
import Head from 'next/head'
import { GetServerSideProps } from 'next'

import Navbar from '../components/Navbar'
import PDFCard, { SkeletonCard } from '../components/PDFCard'
import AdGateModal from '../components/AdGateModal'
import ShareToast from '../components/ShareToast'
import { supabase, Course } from '../lib/supabase'
import StellaToast from '../components/StellaToast'

const SK = '__cn_dlcount__'
const SK2 = '__cn_unlocked__'

interface Props {
  initialCourses: Course[]
  totalDownloads: number
}

export default function Home({ initialCourses, totalDownloads }: Props) {
  const [courses] = useState<Course[]>(initialCourses)

  const [search, setSearch] = useState('')
  const [levelFilter, setLevel] = useState('')
  const [semFilter, setSem] = useState('')
  const [sortBy, setSort] = useState('')

  const [isUnlocked, setUnlocked] = useState(false)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const toastTimer = useRef<NodeJS.Timeout | null>(null)

  // ─────────────────────────────────────────
  // Safe localStorage init (client only)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const count = parseInt(localStorage.getItem(SK) || '0', 10)
    const unlocked = localStorage.getItem(SK2) === '1' || count >= 5

    setUnlocked(unlocked)
  }, [])

  // ─────────────────────────────────────────
  // Toast handler (safe cleanup)
  // ─────────────────────────────────────────
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })

    if (toastTimer.current) clearTimeout(toastTimer.current)

    toastTimer.current = setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  // ─────────────────────────────────────────
  // Filtering + sorting
  // ─────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()

    let list = courses.filter(c => {
      const matchQ =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.course_code?.toLowerCase().includes(q)

      const matchL = !levelFilter || c.level === levelFilter
      const matchS = !semFilter || c.semester === semFilter

      return matchQ && matchL && matchS
    })

    switch (sortBy) {
      case 'downloads':
        list.sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0))
        break
      case 'newest':
        list.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        )
        break
      case 'level':
        list.sort((a, b) => Number(a.level || 0) - Number(b.level || 0))
        break
    }

    return list
  }, [courses, search, levelFilter, semFilter, sortBy])

  // ─────────────────────────────────────────
  // Download logic
  // ─────────────────────────────────────────
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

      // Update local storage tracking
      const count = parseInt(localStorage.getItem(SK) || '0', 10) + 1
      localStorage.setItem(SK, String(count))

      if (count >= 5 && !isUnlocked) {
        localStorage.setItem(SK2, '1')
        setUnlocked(true)
        showToast("🎉 You've unlocked unlimited downloads!", 'success')
      } else {
        const course = courses.find(c => c.id === fileId)
        showToast(`✅ "${course?.title ?? 'PDF'}" download started!`)
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    }
  }

  function handleAdComplete() {
    if (!pendingFileId) return
    executeDownload(pendingFileId)
    setPendingFileId(null)
  }

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────
  return (
    <>
      <Head>
        <title>CourseNotes | Engineering PDF Hub</title>
      </Head>

      <Navbar />

      <main>
        {/* HERO */}
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

        {/* UNLOCK BANNER */}
        {isUnlocked && (
          <div className="unlock-banner show">
            🎉 Unlimited downloads unlocked! Ads removed.
          </div>
        )}

        {/* CONTROLS */}
        <div className="controls">
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Search course..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select value={levelFilter} onChange={e => setLevel(e.target.value)}>
            <option value="">All Levels</option>
            {['100', '200', '300', '400', '500'].map(l => (
              <option key={l} value={l}>{l} Level</option>
            ))}
          </select>

          <select value={semFilter} onChange={e => setSem(e.target.value)}>
            <option value="">All Semesters</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
          </select>

          <select value={sortBy} onChange={e => setSort(e.target.value)}>
            <option value="">Default</option>
            <option value="newest">Newest</option>
            <option value="downloads">Most Downloaded</option>
            <option value="level">Level</option>
          </select>
        </div>

        {/* GRID */}
        <div className="grid-wrap">
          <p className="section-label">
            Showing {filtered.length} course{filtered.length !== 1 ? 's' : ''}
          </p>

          <div className="pdf-grid">
            {filtered.length === 0 ? (
              <div className="empty">
                🔍 No courses found
              </div>
            ) : (
              filtered.map((c, i) => (
                <PDFCard
                  key={c.id}
                  course={c}
                  isUnlocked={isUnlocked}
                  onDownload={handleDownload}
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* AD MODAL */}
      <AdGateModal
        fileId={pendingFileId}
        onClose={() => setPendingFileId(null)}
        onDownloadReady={handleAdComplete}
      />

      {/* SHARE */}
      <ShareToast />
      <StellaToast />
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 999,
            padding: '0.9rem 1.2rem',
            borderRadius: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
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
      .select('*')
      .order('created_at', { ascending: false })

    const totalDownloads =
      (courses || []).reduce((sum, c) => sum + (c.download_count || 0), 0)

    return {
      props: {
        initialCourses: courses || [],
        totalDownloads,
      },
    }
  } catch {
    return {
      props: {
        initialCourses: [],
        totalDownloads: 0,
      },
    }
  }
}