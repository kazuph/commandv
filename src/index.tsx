import { Hono } from 'hono'
import { renderToString } from 'react-dom/server'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

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
  const payload = btoa(JSON.stringify(user))
  const sig = await hmacSign(secret, payload)
  const url = new URL(c.req.url)
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
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
    return JSON.parse(atob(payload)) as SessionUser
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
  const json = atob(b64)
  return JSON.parse(json)
}

const app = new Hono<Env>()

// Attach user to context if logged in
app.use('*', async (c, next) => {
  const user = await getSession(c, c.env.SESSION_SECRET || c.env.MY_VAR)
  ;(c as any).var ||= {}
  ;(c as any).var.user = user
  return next()
})

app.get('/api/clock', (c) => {
  return c.json({
    var: c.env.MY_VAR, // Cloudflare Bindings
    time: new Date().toLocaleTimeString()
  })
})

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
  const user = (c as any).var.user as SessionUser | null
  return c.json({ user })
})

// Debug helper: shows cookies seen by server
app.get('/auth/debug', (c) => {
  return c.json({
    cookie: c.req.header('cookie') || null,
    me: (c as any).var.user || null
  })
})

// Diagrams API
app.get('/api/diagrams', async (c) => {
  const user = (c as any).var.user as SessionUser | null
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
  const user = (c as any).var.user as SessionUser | null
  const row = await c.env.DB.prepare(
    `SELECT * FROM diagrams WHERE id = ?`
  ).bind(id).first<any>()
  if (!row) return c.text('Not found', 404)
  if (row.is_private && (!user || user.id !== row.user_id)) return c.text('Forbidden', 403)
  return c.json(row)
})

app.post('/api/diagrams', async (c) => {
  const user = (c as any).var.user as SessionUser | null
  if (!user) {
    return c.json({ ok: false, login: true, loginUrl: '/auth/google/login' }, 401)
  }
  const body = await c.req.json<{ title?: string; code: string; mode: 'html'|'jsx'; isPrivate?: boolean; imageDataUrl?: string }>()
  const id = crypto.randomUUID()
  const title = body.title || 'Untitled Diagram'
  const isPrivate = body.isPrivate ?? true

  // Save base first
  await c.env.DB.prepare(
    `INSERT INTO diagrams (id, user_id, title, mode, code, is_private) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, user?.id ?? null, title, body.mode, body.code, isPrivate ? 1 : 0).run()

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

app.delete('/api/diagrams/:id', async (c) => {
  const user = (c as any).var.user as SessionUser | null
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

// OGP image serving: /og/:id -> fetch from R2 (DB lookup)
app.get('/og/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT user_id, is_private, image_key FROM diagrams WHERE id = ?').bind(id).first<any>()
  if (!row) return c.text('Not found', 404)
  if (row.is_private) {
    const user = (c as any).var.user as SessionUser | null
    if (!user || user.id !== row.user_id) return c.text('Forbidden', 403)
  }
  const key = row.image_key || `diagrams/${id}.png`
  const obj = await c.env.R2.get(key)
  if (!obj) return c.text('Not found', 404)
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
})

app.get('*', async (c) => {
  // Build OGP tags if path is /d/:id
  const u = new URL(c.req.url)
  const match = u.pathname.match(/^\/d\/([a-z0-9\-]+)$/i)
  let ogTitle = 'CommandV'
  let ogImage: string | undefined
  if (match) {
    const id = match[1]
    const row = await c.env.DB.prepare('SELECT title FROM diagrams WHERE id = ?').bind(id).first<any>()
    if (row) {
      ogTitle = row.title || ogTitle
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
              <meta property="og:title" content={ogTitle} />
              <meta property="og:type" content="website" />
              <meta property="og:image" content={ogImage} />
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content={ogTitle} />
              <meta name="twitter:image" content={ogImage} />
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
