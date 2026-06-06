import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { verifyDownloadToken, hashToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { token } = req.query
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Missing token' })

  // 1. Verify JWT signature & expiry
  const payload = verifyDownloadToken(token)
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })

  const sb = supabaseAdmin()
  const tokenHash = hashToken(token)

  // 2. Check token is not used / exists in DB
  const { data: tokenRecord } = await sb
    .from('download_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .single()

  if (!tokenRecord) return res.status(401).json({ error: 'Token not found' })
  if (tokenRecord.redeemed) return res.status(401).json({ error: 'Token already used' })

  const now = new Date()
  if (new Date(tokenRecord.expires_at) < now) {
    return res.status(401).json({ error: 'Token expired' })
  }

  // 3. Get the course
  const { data: course } = await sb
    .from('courses')
    .select('id,title,file_path')
    .eq('id', payload.fileId)
    .single()

  if (!course) return res.status(404).json({ error: 'Course not found' })

  // 4. Mark token as used
  await sb.from('download_tokens').update({
    redeemed: true,
    redeemed_at: now.toISOString(),
  }).eq('token_hash', tokenHash)

  // 5. Increment download count & record verified download
  await Promise.all([
    sb.from('courses').update({ download_count: sb.rpc('increment', { row_id: course.id }) }).eq('id', course.id),
    sb.from('verified_downloads').insert({
      session_id: payload.sessionId,
      file_id: course.id,
    }),
    // Simpler increment
    sb.rpc('increment_download_count', { course_id: course.id }).catch(() => {
      // Fallback: raw update
      return sb.from('courses')
        .select('download_count')
        .eq('id', course.id)
        .single()
        .then(({ data }) => {
          return sb.from('courses')
            .update({ download_count: (data?.download_count || 0) + 1 })
            .eq('id', course.id)
        })
    }),
  ])

  // 6. Generate signed download URL from Supabase Storage (valid 60s)
  const { data: urlData } = await sb.storage
    .from('course-pdfs')
    .createSignedUrl(course.file_path, 60)

  if (!urlData?.signedUrl) {
    return res.status(500).json({ error: 'Failed to generate download URL' })
  }

  // Redirect to the signed URL
  res.redirect(302, urlData.signedUrl)
}
