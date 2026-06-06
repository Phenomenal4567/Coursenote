import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

// ─── ADMIN AUTH ────────────────────────────────────────────────────
export async function verifyAdminPassword(password: string): Promise<boolean> {
  // In production you'd store a bcrypt hash; for simplicity compare directly
  // or hash on first run. To generate hash: bcrypt.hashSync(ADMIN_PASSWORD, 12)
  return password === ADMIN_PASSWORD
}

export function signAdminToken(): string {
  return jwt.sign({ role: 'admin', iat: Date.now() }, JWT_SECRET, {
    expiresIn: '2h',
  })
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string }
    return decoded.role === 'admin'
  } catch {
    return false
  }
}

// ─── DOWNLOAD TOKENS ───────────────────────────────────────────────
export interface DownloadTokenPayload {
  fileId: string
  sessionId: string
  nonce: string
  iat: number
  exp: number
}

export function signDownloadToken(fileId: string, sessionId: string): string {
  const nonce = uuidv4()
  return jwt.sign(
    { fileId, sessionId, nonce },
    JWT_SECRET,
    { expiresIn: '60s' }
  )
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DownloadTokenPayload
    return decoded
  } catch {
    return null
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ─── SESSION TOKENS ────────────────────────────────────────────────
export function generateSessionToken(): string {
  return uuidv4() + '-' + Date.now()
}

export function generateSessionId(userAgent: string, ip: string): string {
  const raw = `${userAgent}:${ip}:${Date.now()}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}
