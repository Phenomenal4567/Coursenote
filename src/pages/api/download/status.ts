import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { generateSessionId } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const userAgent = req.headers['user-agent'] || ''
  const sessionId = generateSessionId(userAgent, ip)

  const sb = supabaseAdmin()
  const { data: verifiedDls } = await sb
    .from('verified_downloads')
    .select('id')
    .eq('session_id', sessionId)

  const dlCount = verifiedDls?.length || 0
  res.status(200).json({ unlocked: dlCount >= 5, dlCount })
}