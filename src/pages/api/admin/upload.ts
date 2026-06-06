import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAdminToken } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'
import formidable, { Fields, Files } from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = { api: { bodyParser: false } }

function getAdminToken(req: NextApiRequest): string | undefined {
  return req.cookies?.admin_token
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = getAdminToken(req)
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const form = formidable({ maxFileSize: 50 * 1024 * 1024 })

  let fields: Fields, files: Files
  try {
    ;[fields, files] = await form.parse(req)
  } catch {
    return res.status(400).json({ error: 'Failed to parse upload' })
  }

  const get = (f: string) => Array.isArray(fields[f]) ? fields[f]![0] : fields[f] as string
  const title       = get('title')
  const course_code = get('course_code')
  const level       = get('level')
  const semester    = get('semester')
  const description = get('description') || null
  const editingId   = get('editingId') || null

  if (!title || !course_code || !level || !semester) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const sb = supabaseAdmin()
  const fileArr = Array.isArray(files.file) ? files.file : [files.file]
  const file = fileArr[0]

  let file_path = null
  let file_size = 0
  let file_size_label = ''

  if (file && file.filepath) {
    // Upload to Supabase Storage
    const ext = path.extname(file.originalFilename || '.pdf')
    const storageKey = `${Date.now()}-${course_code.replace(/\s+/g, '-').toLowerCase()}${ext}`
    const fileBuffer = fs.readFileSync(file.filepath)

    const { error: storageErr } = await sb.storage
      .from('course-pdfs')
      .upload(storageKey, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (storageErr) {
      return res.status(500).json({ error: 'Storage upload failed: ' + storageErr.message })
    }

    file_path = storageKey
    file_size = file.size || 0
    const mb = file_size / (1024 * 1024)
    file_size_label = mb >= 1 ? `${mb.toFixed(1)} MB` : `${(file_size / 1024).toFixed(0)} KB`
  }

  // If editing and no new file, keep existing
  if (editingId) {
    const updateData: Record<string, unknown> = { title, course_code, level, semester, description }
    if (file_path) {
      updateData.file_path = file_path
      updateData.file_size = file_size
      updateData.file_size_label = file_size_label
    }

    const { error } = await sb.from('courses').update(updateData).eq('id', editingId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // New course
  if (!file_path) return res.status(400).json({ error: 'PDF file required for new course' })

  const { error } = await sb.from('courses').insert({
    title, course_code, level, semester, description,
    file_path, file_size, file_size_label,
  })

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ ok: true })
}
