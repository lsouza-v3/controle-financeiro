import { importSPKI, jwtVerify, decodeJwt } from 'jose'

const PUBLIC_KEY_URL = import.meta.env.VITE_V3_PUBLIC_KEY_URL
const APP_ID = import.meta.env.VITE_V3_BOARD_APP_ID
const ORG_ID = import.meta.env.VITE_V3_ORGANIZATION_ID
const CONFIRM_URL = import.meta.env.VITE_V3_CONFIRM_URL
const AUDIENCE = `${APP_ID}:${ORG_ID}`

let cachedKey: CryptoKey | null = null
let keyFetchedAt = 0

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedKey && Date.now() - keyFetchedAt < 86_400_000) return cachedKey
  const res = await fetch(PUBLIC_KEY_URL)
  const { public_key } = (await res.json()) as { public_key: string }
  cachedKey = await importSPKI(public_key, 'RS256')
  keyFetchedAt = Date.now()
  return cachedKey
}

const usedJtis = new Set<string>()

export interface SessionData {
  userId: string
  email: string
  name: string
  organizationId: string
  roles: string[]
}

export async function handleSSOCallback(token: string): Promise<SessionData> {
  let jti: string | null = null
  try { jti = (decodeJwt(token).jti as string) ?? null } catch {}

  if (!token) {
    throw new Error('missing_token')
  }

  try {
    const publicKey = await getPublicKey()
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: 'v3-board',
      audience: AUDIENCE,
      algorithms: ['RS256'],
    })

    jti = payload.jti as string

    if (usedJtis.has(jti)) {
      throw new Error('token_replayed')
    }
    usedJtis.add(jti)
    setTimeout(() => usedJtis.delete(jti!), 3_600_000)

    if ((payload.organization_id as string) !== ORG_ID) {
      throw new Error('invalid_organization')
    }

    fetch(CONFIRM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jti, status: 'success' }),
    }).catch(() => {})

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      organizationId: payload.organization_id as string,
      roles: payload.roles as string[],
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown'
    if (jti) {
      fetch(CONFIRM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jti, status: 'failure', error: errMsg }),
      }).catch(() => {})
    }
    throw new Error(errMsg)
  }
}

export function saveSession(data: SessionData): void {
  localStorage.setItem('session', JSON.stringify(data))
}

export function getSession(): SessionData | null {
  const session = localStorage.getItem('session')
  return session ? JSON.parse(session) : null
}

export function clearSession(): void {
  localStorage.removeItem('session')
}
