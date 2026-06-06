import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { generateSessionToken, generateSessionId } from '../../../lib/auth'
import { rateLimit } from '../../../lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const { allowed } = rateLimit(`ad-start:${ip}`, 20, 60 * 60 * 1000)
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded' })

  const { fileId, partnerId } = req.body
  if (!fileId || !partnerId) return res.status(400).json({ error: 'Missing fields' })

  const validPartners = ['pickinvoice', 'pickbook']
  if (!validPartners.includes(partnerId)) return res.status(400).json({ error: 'Invalid partner' })

  const userAgent = req.headers['user-agent'] || ''
  const sessionId = generateSessionId(userAgent, ip)
  const sessionToken = generateSessionToken()

  const sb = supabaseAdmin()

  const { error } = await sb.from('ad_sessions').insert({
    session_token: sessionToken,
    session_id: sessionId,
    file_id: fileId,
    partner_id: partnerId,
    elapsed_seconds: 0,
    completed: false,
  })

  if (error) return res.status(500).json({ error: 'Failed to create ad session' })

  res.status(200).json({ sessionToken, sessionId })
}
