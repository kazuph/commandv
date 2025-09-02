import { Hono } from 'hono'
import { renderToString } from 'react-dom/server'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { poweredBy } from 'hono/powered-by'

type D1Database = import('@cloudflare/workers-types').D1Database
type R2Bucket = import('@cloudflare/workers-types').R2Bucket

type Env = {
  Bindings: {
    MY_VAR: string
    SESSION_SECRET: string
    DB: D1Database
    R2: R2Bucket
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    GOOGLE_REDIRECT_URI?: string
  }
}

type SessionUser = {
  id: string
  provider: 'google'
  email?: string
  name?: string
  picture?: string
}

// Minimal HMAC(sHA-256) signer/validator for cookie sessions
async function hmacSign(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

async function setSession(c: any, secret: string, user: SessionUser) {
  // UTF-8 safe base64 for cookie payload
  const utf8 = new TextEncoder().encode(JSON.stringify(user))
  const payload = btoa(String.fromCharCode(...utf8))
  const sig = await hmacSign(secret, payload)
  const url = new URL(c.req.url)
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  // cookie値は明示的にencodeしない（hono側で適切に処理）
  setCookie(c, 'session', `${payload}.${sig}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: !isLocal,
    maxAge: 60 * 60 * 24 * 30
  })
}

async function getSession(c: any, secret: string): Promise<SessionUser | null> {
  const raw = getCookie(c, 'session')
  if (!raw) return null
  const [payload, sig] = raw.split('.')
  if (!payload || !sig) return null
  const expect = await hmacSign(secret, payload)
  if (expect !== sig) return null
  try {
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as SessionUser
  } catch {
    return null
  }
}

// Decode Base64URL JWT payload safely
function decodeJwtPayload(idToken: string): any {
  const parts = idToken.split('.')
  if (parts.length < 2) throw new Error('Invalid JWT')
  let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  // pad to length multiple of 4
  if (b64.length % 4) b64 += '='.repeat(4 - (b64.length % 4))
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json)
}

const app = new Hono<Env>()

// basic hardening header
app.use('*', poweredBy())

// Attach user to context if logged in
app.use('*', async (c, next) => {
  const secret = c.env.SESSION_SECRET || c.env.MY_VAR
  const user = await getSession(c, secret)
  c.set('user', user)
  return next()
})

app.get('/api/clock', (c) => {
  return c.json({
    var: c.env.MY_VAR, // Cloudflare Bindings
    time: new Date().toLocaleTimeString()
  })
})

// Helpers: HMAC-SHA256 (hex) and small utilities
async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function getClientIP(c: any): string {
  return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '0.0.0.0'
}

function genTokenHex(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function checkRate(c: any, bucket: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Math.floor(Date.now()/1000)
  const secret = c.env.SESSION_SECRET || c.env.MY_VAR
  const ip = getClientIP(c)
  const keyHash = await hmacHex(secret, `${bucket}:${ip}:${windowSec}`)
  const row = await c.env.DB.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').bind(keyHash).first<any>()
  if (!row || now >= (row.reset_at as number)) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, ?, ?)')
      .bind(keyHash, 1, now + windowSec).run()
    return true
  }
  const count = (row.count as number) + 1
  if (count > limit) return false
  await c.env.DB.prepare('UPDATE rate_limits SET count = ? WHERE key = ?').bind(count, keyHash).run()
  return true
}

// OAuth: Google
app.get('/auth/google/login', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || new URL('/auth/google/callback', c.req.url).toString()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account'
  })
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

// Diagnostics: see what login would use (masked)
app.get('/auth/google/config', (c) => {
  const cid = c.env.GOOGLE_CLIENT_ID || ''
  const masked = cid ? `${cid.slice(0,8)}...${cid.slice(-10)}` : ''
  const redirect = c.env.GOOGLE_REDIRECT_URI || new URL('/auth/google/callback', c.req.url).toString()
  return c.json({
    clientId: masked || null,
    hasSecret: !!c.env.GOOGLE_CLIENT_SECRET,
    redirectUri: redirect
  })
})

app.get('/auth/google/callback', async (c) => {
  const url = new URL(c.req.url)
  const code = url.searchParams.get('code')
  if (!code) return c.text('Missing code', 400)

  const redirectUri = c.env.GOOGLE_REDIRECT_URI || new URL('/auth/google/callback', c.req.url).toString()
  const body = new URLSearchParams({
    code,
    client_id: c.env.GOOGLE_CLIENT_ID,
    client_secret: c.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  if (!tokenRes.ok) return c.text('Token exchange failed', 500)
  const tokenJson = await tokenRes.json<any>()
  const idToken = tokenJson.id_token as string | undefined
  if (!idToken) return c.text('Missing id_token', 500)
  let payload: any
  try {
    payload = decodeJwtPayload(idToken)
  } catch (e) {
    return c.text('Invalid id_token payload', 500)
  }
  const sub = payload.sub as string
  const email = payload.email as string | undefined
  const name = payload.name as string | undefined
  const picture = payload.picture as string | undefined

  // Upsert user into D1
  await c.env.DB.prepare(
    `INSERT INTO users (id, provider, email, name, picture) VALUES (?, 'google', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture`
  ).bind(sub, email, name, picture).run()

  await setSession(c, c.env.SESSION_SECRET || c.env.MY_VAR, {
    id: sub, provider: 'google', email, name, picture
  })

  // 302 経由で Set-Cookie が落ちるケースに対応し、200で自前リダイレクト
  return c.html(
    `<!doctype html><meta charset="utf-8" />
     <title>Signed in</title>
     <script>window.location.replace('/')<\/script>
     <p>Signing you in...</p>`
  )
})

app.post('/auth/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})

app.get('/auth/me', (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// Debug helper: shows cookies seen by server
app.get('/auth/debug', async (c) => {
  const raw = getCookie(c, 'session')
  const secret = c.env.SESSION_SECRET || c.env.MY_VAR
  let info: any = { raw }
  if (raw) {
    const [payload, sig] = raw.split('.')
    info.payload = payload
    info.sig = sig
    const expected = await hmacSign(secret, payload)
    info.expected = expected
    info.sigMatches = expected === sig
    try {
      const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
      info.parsed = JSON.parse(new TextDecoder().decode(bytes))
    } catch {}
  }
  info.me = c.get('user') || null
  return c.json(info)
})

// Diagrams API
app.get('/api/diagrams', async (c) => {
  const user = c.get('user')
  const limit = parseInt(new URL(c.req.url).searchParams.get('limit') || '20')
  if (!user) return c.json({ items: [] })
  const rows = await c.env.DB.prepare(
    `SELECT id, title, is_private, image_key, created_at FROM diagrams
     WHERE user_id = ?
     ORDER BY created_at DESC LIMIT ?`
  ).bind(user.id, limit).all()
  return c.json({ items: rows.results || [] })
})

app.get('/api/diagrams/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const row = await c.env.DB.prepare(
    `SELECT * FROM diagrams WHERE id = ?`
  ).bind(id).first<any>()
  if (!row) return c.text('Not found', 404)
  if (row.is_private && (!user || user.id !== row.user_id)) return c.text('Forbidden', 403)
  return c.json(row)
})

app.post('/api/diagrams', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ ok: false, login: true, loginUrl: '/auth/google/login' }, 401)
  }
  const body = await c.req.json<{ title?: string; description?: string; code: string; mode: 'html'|'jsx'; isPrivate?: boolean; imageDataUrl?: string }>()
  const id = crypto.randomUUID()
  const title = body.title || 'Untitled Diagram'
  const isPrivate = body.isPrivate ?? true

  // Save base first
  await c.env.DB.prepare(
    `INSERT INTO diagrams (id, user_id, title, description, mode, code, is_private) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, user?.id ?? null, title, (body.description || null), body.mode, body.code, isPrivate ? 1 : 0).run()

  let imageKey: string | undefined
  if (body.imageDataUrl?.startsWith('data:image/')) {
    const comma = body.imageDataUrl.indexOf(',')
    const b64 = body.imageDataUrl.slice(comma + 1)
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    imageKey = `diagrams/${id}.png`
    await c.env.R2.put(imageKey, bin, { httpMetadata: { contentType: 'image/png' } })
    await c.env.DB.prepare(`UPDATE diagrams SET image_key = ?, updated_at = strftime('%s','now') WHERE id = ?`).bind(imageKey, id).run()
  }

  return c.json({ id, title, imageKey })
})

// Anonymous quick share: create + share (3-day expiry), no auth required
app.post('/api/diagrams/guest', async (c) => {
  // basic rate limits: 10/min, 100/day per IP
  const okMin = await checkRate(c, 'guest:create:min', 10, 60)
  const okDay = await checkRate(c, 'guest:create:day', 100, 86400)
  if (!okMin || !okDay) return c.text('Too Many Requests', 429)

  const body = await c.req.json<{ title?: string; description?: string; code: string; mode: 'html'|'jsx'; imageDataUrl?: string }>().catch(() => null)
  if (!body || typeof body.code !== 'string' || (body.mode !== 'html' && body.mode !== 'jsx')) return c.text('Bad Request', 400)
  if (body.code.length > 200_000) return c.text('Payload Too Large', 413)

  const id = crypto.randomUUID()
  const title = (body.title || 'Untitled Diagram').slice(0, 200)
  const expiresAt = Math.floor(Date.now()/1000) + 3*24*60*60 // 3 days

  // simple description fallback: strip HTML tags and clip
  const descFallback = (() => {
    try {
      const text = body.code.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
      return text.replace(/\s+/g, ' ').trim().slice(0, 300)
    } catch { return null }
  })()
  await c.env.DB.prepare(
    `INSERT INTO diagrams (id, user_id, title, description, mode, code, is_private, share_enabled, share_token, share_expires_at)
     VALUES (?, NULL, ?, ?, ?, ?, 1, 1, ?, ?)`
  ).bind(id, title, (body.description || descFallback), body.mode, body.code, genTokenHex(32), expiresAt).run()

  // optional image store
  let imageKey: string | undefined
  if (body.imageDataUrl?.startsWith('data:image/')) {
    const comma = body.imageDataUrl.indexOf(',')
    const b64 = body.imageDataUrl.slice(comma + 1)
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    imageKey = `diagrams/${id}.png`
    await c.env.R2.put(imageKey, bin, { httpMetadata: { contentType: 'image/png' } })
    await c.env.DB.prepare(`UPDATE diagrams SET image_key = ?, updated_at = strftime('%s','now') WHERE id = ?`).bind(imageKey, id).run()
  }

  const origin = new URL(c.req.url).origin
  // fetch token back
  const row = await c.env.DB.prepare('SELECT share_token, share_expires_at FROM diagrams WHERE id = ?').bind(id).first<any>()
  const token = row?.share_token as string
  const shareUrl = `${origin}/s/${token}`
  return c.json({ id, title, imageKey, shareUrl, expiresAt: row?.share_expires_at })
})

app.delete('/api/diagrams/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.text('Unauthorized', 401)
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT user_id, image_key FROM diagrams WHERE id = ?').bind(id).first<any>()
  if (!row) return c.text('Not found', 404)
  if (row.user_id !== user.id) return c.text('Forbidden', 403)
  // delete DB first
  await c.env.DB.prepare('DELETE FROM diagrams WHERE id = ?').bind(id).run()
  // best-effort delete from R2
  if (row.image_key) {
    try { await c.env.R2.delete(row.image_key as string) } catch {}
  }
  return c.json({ ok: true })
})

// Update diagram metadata (e.g., title)
app.patch('/api/diagrams/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.text('Unauthorized', 401)
  const id = c.req.param('id')
  const body = await c.req.json<{ title?: string; description?: string }>().catch(() => ({} as any))
  const row = await c.env.DB.prepare('SELECT user_id FROM diagrams WHERE id = ?').bind(id).first<any>()
  if (!row) return c.text('Not found', 404)
  if (row.user_id !== user.id) return c.text('Forbidden', 403)
  if (typeof body.title === 'string' || typeof body.description === 'string') {
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : undefined
    const desc = typeof body.description === 'string' ? body.description.trim().slice(0, 300) : undefined
    const sql = `UPDATE diagrams SET ${title !== undefined ? 'title = ?,' : ''} ${desc !== undefined ? 'description = ?,' : ''} updated_at = strftime('%s','now') WHERE id = ?`
    const binds: any[] = []
    if (title !== undefined) binds.push(title)
    if (desc !== undefined) binds.push(desc)
    binds.push(id)
    await c.env.DB.prepare(sql).bind(...binds).run()
    return c.json({ ok: true, id, title, description: desc })
  }
  return c.json({ ok: false }, 400)
})

// Share link management
app.post('/api/diagrams/:id/share', async (c) => {
  const user = c.get('user')
  if (!user) return c.text('Unauthorized', 401)
  const id = c.req.param('id')
  const body = await c.req.json<{ action: 'enable'|'disable'|'rotate'; expiresInDays?: number }>().catch(() => ({ action: 'enable' } as any))
  const row = await c.env.DB.prepare('SELECT user_id, share_enabled, share_token FROM diagrams WHERE id = ?').bind(id).first<any>()
  if (!row) return c.text('Not found', 404)
  if (row.user_id !== user.id) return c.text('Forbidden', 403)

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = body.expiresInDays ? now + Math.floor(Number(body.expiresInDays) * 86400) : null

  const genToken = () => genTokenHex(32)

  let token = (row.share_token as string) || null
  if (body.action === 'disable') {
    await c.env.DB.prepare(`UPDATE diagrams SET share_enabled = 0, updated_at = strftime('%s','now') WHERE id = ?`).bind(id).run()
  } else if (body.action === 'rotate') {
    token = genToken()
    await c.env.DB.prepare(`UPDATE diagrams SET share_enabled = 1, share_token = ?, share_expires_at = ?, updated_at = strftime('%s','now') WHERE id = ?`).bind(token, expiresAt, id).run()
  } else {
    // enable
    token = token || genToken()
    await c.env.DB.prepare(`UPDATE diagrams SET share_enabled = 1, share_token = ?, share_expires_at = ?, updated_at = strftime('%s','now') WHERE id = ?`).bind(token, expiresAt, id).run()
  }

  const origin = new URL(c.req.url).origin
  const shareUrl = token ? `${origin}/s/${token}` : null
  return c.json({ ok: true, shareUrl, token, expiresAt })
})

// Resolve shared diagram by token (read-only)
app.get('/api/share/:token', async (c) => {
  const token = c.req.param('token')
  if (!token || token.length < 32) return c.text('Not found', 404)
  // First try as active share (not expired)
  const active = await c.env.DB.prepare(
    `SELECT id, title, mode, code, image_key, created_at, updated_at FROM diagrams
     WHERE share_enabled = 1 AND share_token = ? AND (share_expires_at IS NULL OR share_expires_at > strftime('%s','now'))`
  ).bind(token).first<any>()
  if (active) {
    return c.json(active, 200, {
      'Cache-Control': 'private, max-age=0, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive'
    })
  }
  // If expired, require login but allow viewing by any logged-in user
  const user = c.get('user')
  if (!user) return c.json({ ok: false, login: true, loginUrl: '/auth/google/login', reason: 'expired' }, 401)
  const row = await c.env.DB.prepare(
    `SELECT id, title, mode, code, image_key, created_at, updated_at FROM diagrams
     WHERE share_token = ?`
  ).bind(token).first<any>()
  if (!row) return c.text('Not found', 404)
  return c.json(row, 200, { 'Cache-Control': 'private, max-age=0, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' })
})

// OGP image serving: /og/:id -> fetch from R2 (DB lookup)
app.get('/og/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(
    'SELECT user_id, is_private, image_key, share_enabled, share_expires_at FROM diagrams WHERE id = ?'
  ).bind(id).first<any>()
  if (!row) return c.text('Not found', 404)
  if (row.is_private) {
    // Allow if sharing is currently enabled and not expired
    const nowOk = !row.share_expires_at || (row.share_expires_at as number) > Math.floor(Date.now()/1000)
    const shareOk = (row.share_enabled as number) === 1 && nowOk
    if (!shareOk) {
      const user = c.get('user')
      if (!user || user.id !== row.user_id) return c.text('Forbidden', 403)
    }
  }
  const key = row.image_key || `diagrams/${id}.png`
  const obj = await c.env.R2.get(key)
  if (!obj) return c.text('Not found', 404)
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Robots-Tag': 'noindex'
    }
  })
})

// robots.txt: disallow shared paths so crawlers politely skip
app.get('/robots.txt', (c) => {
  // Permit Slackbot (and other common unfurlers) while disallowing generic crawlers
  const body = `User-agent: *\nDisallow: /s/\n\nUser-agent: Slackbot\nAllow: /s/\nUser-agent: Twitterbot\nAllow: /s/\nUser-agent: Facebot\nAllow: /s/\nUser-agent: facebookexternalhit\nAllow: /s/\nUser-agent: LinkedInBot\nAllow: /s/\nUser-agent: Discordbot\nAllow: /s/\n`
  return c.text(body, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
})

// Shared view page: /s/:token with noindex headers
function isSocialBot(ua: string | null | undefined): boolean {
  if (!ua) return false
  ua = ua.toLowerCase()
  return (
    ua.includes('slackbot') ||
    ua.includes('twitterbot') ||
    ua.includes('facebookexternalhit') ||
    ua.includes('facebot') ||
    ua.includes('linkedinbot') ||
    ua.includes('discordbot') ||
    ua.includes('telegrambot')
  )
}

app.get('/s/:token', async (c) => {
  const token = c.req.param('token')
  // Lookup minimal info for OGP (optional)
  let ogTitle = 'Shared Diagram'
  let ogImage: string | undefined
  let ogDesc: string | undefined
  let id: string | undefined
  let ogUrl = new URL(c.req.url).toString()
  if (token && token.length >= 32) {
    const row = await c.env.DB.prepare(
      `SELECT id, title, description FROM diagrams WHERE share_enabled = 1 AND share_token = ? AND (share_expires_at IS NULL OR share_expires_at > strftime('%s','now'))`
    ).bind(token).first<any>()
    if (row) {
      id = row.id as string
      ogTitle = row.title || ogTitle
      ogDesc = row.description || undefined
      ogImage = new URL(`/og/${row.id}`, c.req.url).toString()
    }
  }
  const ua = c.req.header('user-agent')
  const allowUnfurl = isSocialBot(ua)
  const html = renderToString(
    <html style={{width: '100%', margin: 0, padding: 0}}>
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport" />
        {!allowUnfurl && <meta name="robots" content="noindex, nofollow, noarchive" />}
        {allowUnfurl && <meta name="description" content={ogDesc || ogTitle} />}
        <title>{ogTitle}</title>
        {ogImage && (
          <>
            <meta property="og:title" content={ogTitle} />
            <meta property="og:type" content="website" />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content="CommandV" />
            <meta property="og:url" content={ogUrl} />
            <meta property="og:description" content={ogDesc || ogTitle} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={ogTitle} />
            <meta name="twitter:image" content={ogImage} />
            <meta name="twitter:description" content={ogDesc || ogTitle} />
            <link rel="canonical" href={ogUrl} />
          </>
        )}
        <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzhiZGY4IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0ZjQ2ZTUiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNncmFkKSIgcng9IjE1IiByeT0iMTUiLz4KICA8ZyBmaWxsPSIjZmZmZmZmIj4KICAgIDwhLS0gQ29tbWFuZCAo4oyWKSBzeW1ib2wgLS0+CiAgICA8cGF0aCBkPSJNMjUgMjUgSDQwIFY0MCBIMjUgWiIgLz4KICAgIDxwYXRoIGQ9Ik02MCAyNSBINzUgVjQwIEg2MCBaIiAvPgogICAgPHBhdGggZD0iTTI1IDYwIEg0MCBWNzUgSDI1IFoiIC8+CiAgICA8cGF0aCBkPSJNNjAgNjAgSDc1IFY3NSBINjAgWiIgLz4KICAgIDxwYXRoIGQ9Ik00MCA0MCBINjAgVjYwIEg0MCBaIiAvPgogIDwvZz4KPC9zdmc+" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          {`
          tailwind.config = { theme: { extend: {} } }
          `}
        </script>
        <link href="/static/style.css" rel="stylesheet" />
        {import.meta.env.PROD ? (
          <script type="module" src="/static/client.js"></script>
        ) : (
          <script type="module" src="/src/client.tsx"></script>
        )}
      </head>
      <body style={{margin: 0, padding: 0, overflowX: 'hidden', width: '100%', maxWidth: '100%', backgroundColor: 'white'}}>
        <div id="root" style={{width: '100%', maxWidth: '100%'}}></div>
      </body>
    </html>
  )
  const headers: Record<string,string> = { 'Referrer-Policy': 'no-referrer' }
  if (!allowUnfurl) headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive'
  return c.html(html, 200, headers)
})

app.get('*', async (c) => {
  // Build OGP tags if path is /d/:id
  const u = new URL(c.req.url)
  const match = u.pathname.match(/^\/d\/([a-z0-9\-]+)$/i)
  let ogTitle = 'CommandV'
  let ogImage: string | undefined
  let ogDesc: string | undefined
  if (match) {
    const id = match[1]
    const row = await c.env.DB.prepare('SELECT title, description FROM diagrams WHERE id = ?').bind(id).first<any>()
    if (row) {
      ogTitle = row.title || ogTitle
      ogDesc = row.description || undefined
      ogImage = new URL(`/og/${id}`, c.req.url).toString()
    }
  }

  return c.html(
    renderToString(
      <html style={{width: '100%', margin: 0, padding: 0}}>
        <head>
          <meta charSet="utf-8" />
          <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport" />
          <title>{ogTitle}</title>
          {ogImage && (
            <>
              <meta name="description" content={ogDesc || ogTitle} />
              <meta property="og:title" content={ogTitle} />
              <meta property="og:type" content="website" />
              <meta property="og:image" content={ogImage} />
              <meta property="og:image:width" content="1200" />
              <meta property="og:image:height" content="630" />
              <meta property="og:site_name" content="CommandV" />
              {ogDesc && <meta property="og:description" content={ogDesc} />}
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content={ogTitle} />
              <meta name="twitter:image" content={ogImage} />
              {ogDesc && <meta name="twitter:description" content={ogDesc} />}
              <link rel="canonical" href={new URL(c.req.url).toString()} />
            </>
          )}
          <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzhiZGY4IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0ZjQ2ZTUiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNncmFkKSIgcng9IjE1IiByeT0iMTUiLz4KICA8ZyBmaWxsPSIjZmZmZmZmIj4KICAgIDwhLS0gQ29tbWFuZCAo4oyWKSBzeW1ib2wgLS0+CiAgICA8cGF0aCBkPSJNMjUgMjUgSDQwIFY0MCBIMjUgWiIgLz4KICAgIDxwYXRoIGQ9Ik02MCAyNSBINzUgVjQwIEg2MCBaIiAvPgogICAgPHBhdGggZD0iTTI1IDYwIEg0MCBWNzUgSDI1IFoiIC8+CiAgICA8cGF0aCBkPSJNNjAgNjAgSDc1IFY3NSBINjAgWiIgLz4KICAgIDxwYXRoIGQ9Ik00MCA0MCBINjAgVjYwIEg0MCBaIiAvPgogIDwvZz4KPC9zdmc+" />
          <style dangerouslySetInnerHTML={{__html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
            html, body, #root { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
            * { box-sizing: border-box; }
            :root {
              color-scheme: light;
              --app-bg: #ffffff;
              --text-primary: #000000;
            }
            body {
              font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `}} />
          {/* 公式CDNからTailwind CSS v4を読み込む */}
          <script src="https://cdn.tailwindcss.com"></script>
          {/* TailwindのCDN用設定 */}
          <script>
            {`
            tailwind.config = {
              theme: {
                extend: {}
              }
            }
            `}
          </script>
          <link href="/static/style.css" rel="stylesheet" />
          {import.meta.env.PROD ? (
            <script type="module" src="/static/client.js"></script>
          ) : (
            <script type="module" src="/src/client.tsx"></script>
          )}
        </head>
        <body style={{margin: 0, padding: 0, overflowX: 'hidden', width: '100%', maxWidth: '100%', backgroundColor: 'white'}}>
          <div id="root" style={{width: '100%', maxWidth: '100%'}}></div>
        </body>
      </html>
    )
  )
})

export default app
