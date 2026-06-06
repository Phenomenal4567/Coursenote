import { useState, useRef } from 'react'
import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'
import { supabaseAdmin, Course } from '../../lib/supabase'
import { verifyAdminToken } from '../../lib/auth'

interface Props {
  courses: Course[]
  totalDownloads: number
}

export default function AdminDashboard({ courses: initialCourses, totalDownloads }: Props) {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '', course_code: '', level: '100', semester: '1st', description: '',
  })

  function setField(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]

    // For new courses a file is required; for edits it is optional
    if (!editingId && !file) return showMsg('Please select a PDF file.', 'error')
    if (file && !file.name.endsWith('.pdf')) return showMsg('Only PDF files allowed.', 'error')
    if (file && file.size > 50 * 1024 * 1024) return showMsg('File too large (max 50 MB).', 'error')

    setUploading(true)
    setUploadProgress(0)

    try {
      let file_path: string | null = null
      let file_size: number = 0

      if (file) {
        // Step 1: Get a signed upload URL from our API
        setUploadProgress(5)
        const urlRes = await fetch('/api/admin/create-upload-url', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course_code: form.course_code, filename: file.name }),
        })
        if (!urlRes.ok) {
          const { error } = await urlRes.json()
          throw new Error(error ?? 'Failed to get upload URL')
        }
        const { signedUrl, path } = await urlRes.json()

        // Step 2: Upload the file DIRECTLY to Supabase Storage (bypasses Vercel)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              // Map 0–100% of the file upload to 10–90% of overall progress
              setUploadProgress(10 + Math.round((ev.loaded / ev.total) * 80))
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Storage upload failed (${xhr.status}): ${xhr.responseText}`))
          }
          xhr.onerror = () => reject(new Error('Network error during upload'))
          xhr.open('PUT', signedUrl)
          xhr.setRequestHeader('Content-Type', 'application/pdf')
          xhr.send(file)
        })

        file_path = path
        file_size = file.size
        setUploadProgress(92)
      }

      // Step 3: Save course metadata in the database
      const saveRes = await fetch('/api/admin/save-course', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          course_code: form.course_code,
          level: form.level,
          semester: form.semester,
          description: form.description,
          file_path,
          file_size,
          editingId,
        }),
      })
      if (!saveRes.ok) {
        const { error } = await saveRes.json()
        throw new Error(error ?? 'Failed to save course')
      }

      setUploadProgress(100)
      showMsg(editingId ? 'Course updated successfully!' : 'Course uploaded successfully!')
      setForm({ title: '', course_code: '', level: '100', semester: '1st', description: '' })
      setEditingId(null)
      if (fileRef.current) fileRef.current.value = ''

      // Refresh list
      router.replace(router.asPath)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      showMsg(message, 'error')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/admin/delete?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showMsg('Course deleted.')
      setCourses(c => c.filter(x => x.id !== id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      showMsg(message, 'error')
    }
  }

  function startEdit(c: Course) {
    setEditingId(c.id)
    setForm({
      title: c.title,
      course_code: c.course_code,
      level: c.level,
      semester: c.semester,
      description: c.description || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    router.push('/admin')
  }

  const totalPDFs = courses.length

  return (
    <>
      <Head><title>Admin Dashboard — CourseNotes</title></Head>
      <Navbar />

      <div className="admin-layout">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.5rem', fontWeight: 700 }}>
            Admin Dashboard
          </h1>
          <button className="btn-secondary" style={{ width: 'auto', padding: '.5rem 1rem' }} onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Alerts */}
        {msg && (
          <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>
            {msg.type === 'success' ? '✅' : '⚠️'} {msg.text}
          </div>
        )}

        {/* Stats */}
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-num">{totalPDFs}</div>
            <div className="stat-label">Total PDFs</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{totalDownloads.toLocaleString()}</div>
            <div className="stat-label">Total Downloads</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{courses.filter(c => {
              const d = (Date.now() - new Date(c.created_at).getTime()) / 86400000
              return d <= 7
            }).length}</div>
            <div className="stat-label">New This Week</div>
          </div>
        </div>

        {/* Upload / Edit Form */}
        <div className="admin-card">
          <h2>
            📤 {editingId ? 'Edit Course' : 'Upload New Course'}
            {editingId && (
              <button
                className="btn-secondary"
                style={{ width: 'auto', padding: '.3rem .8rem', fontSize: '.75rem', marginLeft: 'auto' }}
                onClick={() => { setEditingId(null); setForm({ title: '', course_code: '', level: '100', semester: '1st', description: '' }) }}
              >
                Cancel Edit
              </button>
            )}
          </h2>

          <form onSubmit={handleUpload}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="title">Course Title *</label>
                <input id="title" type="text" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Engineering Mathematics I" required />
              </div>
              <div className="form-group">
                <label htmlFor="code">Course Code *</label>
                <input id="code" type="text" value={form.course_code} onChange={e => setField('course_code', e.target.value)} placeholder="e.g. ENG101" required />
              </div>
              <div className="form-group">
                <label htmlFor="level">Level *</label>
                <select id="level" value={form.level} onChange={e => setField('level', e.target.value)}>
                  {['100','200','300','400','500'].map(l => <option key={l} value={l}>{l} Level</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="semester">Semester *</label>
                <select id="semester" value={form.semester} onChange={e => setField('semester', e.target.value)}>
                  <option value="1st">1st Semester</option>
                  <option value="2nd">2nd Semester</option>
                </select>
              </div>
              <div className="form-group full">
                <label htmlFor="desc">Description (optional)</label>
                <textarea id="desc" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Brief description of what's covered…" />
              </div>
              <div className="form-group full">
                <label htmlFor="file">PDF File {editingId ? '(leave blank to keep existing)' : '*'}</label>
                <input id="file" type="file" accept=".pdf" ref={fileRef} />
                <div className={`progress-bar-wrap${uploading ? ' show' : ''}`}>
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>

            <button className="btn-submit" type="submit" disabled={uploading} style={{ marginTop: '1rem' }}>
              {uploading ? `Uploading… ${uploadProgress}%` : editingId ? '💾 Save Changes' : '📤 Upload Course'}
            </button>
          </form>
        </div>

        {/* Courses Table */}
        <div className="admin-card">
          <h2>📋 All Courses ({courses.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Level</th>
                  <th>Sem</th>
                  <th>Size</th>
                  <th>Downloads</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 500, maxWidth: 220 }}>
                      {c.title}
                      {(() => {
                        const d = (Date.now() - new Date(c.created_at).getTime()) / 86400000
                        return d <= 7 ? <span className="badge badge-new" style={{ marginLeft: '.5rem' }}>New</span> : null
                      })()}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--accent3)' }}>{c.course_code}</td>
                    <td>{c.level}L</td>
                    <td>{c.semester}</td>
                    <td>{c.file_size_label || '—'}</td>
                    <td style={{ color: 'var(--accent2)', fontWeight: 600 }}>{c.download_count}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button className="btn-edit" onClick={() => startEdit(c)}>Edit</button>
                        <button className="btn-danger" onClick={() => handleDelete(c.id, c.title)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {courses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)', fontSize: '.85rem' }}>
                No courses yet. Upload your first PDF above.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const token = req.cookies?.admin_token
  if (!token || !verifyAdminToken(token)) {
    return { redirect: { destination: '/admin', permanent: false } }
  }

  try {
    const sb = supabaseAdmin()
    const { data: courses } = await sb
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    const totalDownloads = (courses || []).reduce((sum: number, c: Course) => sum + (c.download_count || 0), 0)
    return { props: { courses: courses || [], totalDownloads } }
  } catch {
    return { props: { courses: [], totalDownloads: 0 } }
  }
}
