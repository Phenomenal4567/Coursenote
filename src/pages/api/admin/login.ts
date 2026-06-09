import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAdminPassword, signAdminToken } from '../../../lib/auth'
import { rateLimit } from '../../../lib/rateLimit'
import { serialize } from 'cookie'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const { allowed } = rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000)
  if (!allowed) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })

  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'Password required' })

  const valid = await verifyAdminPassword(password)
  if (!valid) return res.status(401).json({ error: 'Invalid password' })

  const token = signAdminToken()

  res.setHeader('Set-Cookie', serialize('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 2 * 60 * 60, // 2 hours
  }))

  res.status(200).json({ ok: true })
}
