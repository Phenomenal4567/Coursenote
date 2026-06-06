import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAdminToken } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.cookies?.admin_token
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    title,
    course_code,
    level,
    semester,
    description,
    file_path,
    file_size,
    editingId,
  } = req.body

  if (!title || !course_code || !level || !semester) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const sb = supabaseAdmin()

  let file_size_label = ''
  if (file_size) {
    const mb = Number(file_size) / (1024 * 1024)
    file_size_label = mb >= 1 ? `${mb.toFixed(1)} MB` : `${(Number(file_size) / 1024).toFixed(0)} KB`
  }

  if (editingId) {
    const updateData: Record<string, unknown> = { title, course_code, level, semester, description: description || null }
    if (file_path) {
      updateData.file_path = file_path
      updateData.file_size = Number(file_size)
      updateData.file_size_label = file_size_label
    }

    const { error } = await sb.from('courses').update(updateData).eq('id', editingId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (!file_path) {
    return res.status(400).json({ error: 'PDF file required for new course' })
  }

  const { error } = await sb.from('courses').insert({
    title,
    course_code,
    level,
    semester,
    description: description || null,
    file_path,
    file_size: Number(file_size),
    file_size_label,
  })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ ok: true })
}
