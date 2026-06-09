import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'

const REQUIRED_SECONDS = 20

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { sessionToken, tabActive } = req.body
  if (!sessionToken) return res.status(400).json({ error: 'Missing sessionToken' })

  const sb = supabaseAdmin()

  const { data: session, error } = await sb
    .from('ad_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .single()

  if (error || !session) return res.status(404).json({ error: 'Session not found' })
  if (session.completed) return res.status(200).json({ completed: true, elapsed: session.elapsed_seconds })

  // Only increment if tab was active (user was on partner site)
  if (tabActive) {
    const newElapsed = (session.elapsed_seconds || 0) + 5 // heartbeat every 5s

    if (newElapsed >= REQUIRED_SECONDS) {
      await sb.from('ad_sessions').update({
        elapsed_seconds: REQUIRED_SECONDS,
        completed: true,
        completed_at: new Date().toISOString(),
      }).eq('session_token', sessionToken)

      return res.status(200).json({ completed: true, elapsed: REQUIRED_SECONDS })
    } else {
      await sb.from('ad_sessions').update({ elapsed_seconds: newElapsed })
        .eq('session_token', sessionToken)

      return res.status(200).json({ completed: false, elapsed: newElapsed })
    }
  }

  res.status(200).json({ completed: false, elapsed: session.elapsed_seconds })
}
