import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { verifyDownloadToken, hashToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token } = req.query
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' })
  }

  const payload = verifyDownloadToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const sb = supabaseAdmin()
  const tokenHash = hashToken(token)
  const now = new Date()

  // 1. Get and validate token record
  const { data: tokenRecord, error: tokenError } = await sb
    .from('download_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !tokenRecord) {
    return res.status(401).json({ error: 'Token not found' })
  }
  if (tokenRecord.redeemed) {
    return res.status(401).json({ error: 'Token already used' })
  }
  if (new Date(tokenRecord.expires_at) < now) {
    return res.status(401).json({ error: 'Token expired' })
  }

  // 2. Get course
  const { data: course, error: courseError } = await sb
    .from('courses')
    .select('id, title, file_path, download_count')
    .eq('id', payload.fileId)
    .single()

  if (courseError || !course) {
    return res.status(404).json({ error: 'Course not found' })
  }

  // 3. Mark token redeemed immediately (prevent double-use)
  const { error: redeemError } = await sb
    .from('download_tokens')
    .update({ redeemed: true, redeemed_at: now.toISOString() })
    .eq('token_hash', tokenHash)

  if (redeemError) {
    return res.status(500).json({ error: 'Failed to redeem token' })
  }

  // 4. Get a short-lived signed URL from Supabase
  const { data: urlData, error: urlError } = await sb.storage
    .from('course-pdfs')
    .createSignedUrl(course.file_path, 60)

  if (urlError || !urlData?.signedUrl) {
    return res.status(500).json({ error: 'Failed to generate download URL' })
  }

  // 5. Fetch the file server-side and stream it to the client
  //    This avoids cross-origin redirect issues with <a download>
  let fileRes: Response
  try {
    fileRes = await fetch(urlData.signedUrl)
    if (!fileRes.ok) throw new Error(`Supabase returned ${fileRes.status}`)
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch file from storage' })
  }

  // 6. Update download stats (fire-and-forget — don't block the stream)
  const newCount = (course.download_count || 0) + 1
  Promise.all([
    sb.from('courses').update({ download_count: newCount }).eq('id', course.id),
    sb.from('verified_downloads').insert({ session_id: payload.sessionId, file_id: course.id }),
  ]).catch(() => {/* non-critical */})

  // 7. Stream PDF back to browser with download headers
  const safeTitle = course.title.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'course-notes'
  const filename = `${safeTitle}.pdf`

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-store')

  const buffer = Buffer.from(await fileRes.arrayBuffer())
  res.status(200).end(buffer)
}
