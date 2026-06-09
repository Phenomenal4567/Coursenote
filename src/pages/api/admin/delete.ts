import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAdminToken } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end()

  const token = req.cookies?.admin_token
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  const sb = supabaseAdmin()

  // Get file path first
  const { data: course } = await sb.from('courses').select('file_path').eq('id', id).single()

  if (course?.file_path) {
    await sb.storage.from('course-pdfs').remove([course.file_path])
  }

  const { error } = await sb.from('courses').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ ok: true })
}
