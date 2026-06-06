import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAdminToken } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.cookies?.admin_token
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { course_code, filename } = req.body
  if (!course_code || !filename) {
    return res.status(400).json({ error: 'Missing course_code or filename' })
  }

  const ext = filename.endsWith('.pdf') ? '.pdf' : '.pdf'
  const storageKey = `${Date.now()}-${course_code.replace(/\s+/g, '-').toLowerCase()}${ext}`

  const sb = supabaseAdmin()
  const { data, error } = await sb.storage
    .from('course-pdfs')
    .createSignedUploadUrl(storageKey)

  if (error || !data) {
    return res.status(500).json({ error: error?.message ?? 'Failed to create upload URL' })
  }

  return res.status(200).json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: storageKey,
  })
}
