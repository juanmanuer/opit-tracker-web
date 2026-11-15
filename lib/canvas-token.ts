// lib/canvas-token.ts
// Stores the Canvas access token encrypted in the database and renews it
// automatically (OPIT limits tokens to 30 days). Falls back to the
// CANVAS_TOKEN env var if nothing is stored yet.
import crypto from "crypto"
import { sql } from "@/lib/db"

const CANVAS_DOMAIN = process.env.CANVAS_DOMAIN
const RENEW_WHEN_DAYS_LEFT = 10   // daily job renews once fewer days than this remain
const TOKEN_LIFETIME_DAYS = 30    // OPIT maximum

// ── Encryption (AES-256-GCM, key derived from NEXTAUTH_SECRET) ───────────
function key() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set")
  return crypto.createHash("sha256").update(`canvas-token:${secret}`).digest()
}
function encrypt(plain: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), enc].map(b => b.toString("base64")).join(".")
}
function decrypt(payload: string) {
  const [iv, tag, enc] = payload.split(".").map(p => Buffer.from(p, "base64"))
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8")
}

// ── Storage (one row, id = 'main') ───────────────────────────────────────
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS canvas_tokens (
      id            TEXT PRIMARY KEY,
      token_enc     TEXT NOT NULL,
      canvas_id     TEXT,
      expires_at    TIMESTAMPTZ,
      owner_email   TEXT,
      last_renewed  TIMESTAMPTZ,
      last_error    TEXT,
      last_alert    TIMESTAMPTZ,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

type Row = {
  token_enc: string; canvas_id: string | null; expires_at: string | null
  owner_email: string | null; last_renewed: string | null; last_error: string | null; last_alert: string | null
}

async function readRow(): Promise<Row | null> {
  await ensureTable()
  const rows = await sql`SELECT * FROM canvas_tokens WHERE id = 'main'`
  return (rows[0] as Row) ?? null
}

async function saveToken(token: string, opts: { canvasId?: string | null; expiresAt: Date; ownerEmail?: string | null; renewed?: boolean }) {
  await ensureTable()
  await sql`
    INSERT INTO canvas_tokens (id, token_enc, canvas_id, expires_at, owner_email, last_renewed, last_error, updated_at)
    VALUES ('main', ${encrypt(token)}, ${opts.canvasId ?? null}, ${opts.expiresAt.toISOString()},
            ${opts.ownerEmail ?? null}, ${opts.renewed ? new Date().toISOString() : null}, NULL, now())
    ON CONFLICT (id) DO UPDATE SET
      token_enc    = EXCLUDED.token_enc,
      canvas_id    = EXCLUDED.canvas_id,
      expires_at   = EXCLUDED.expires_at,
      owner_email  = COALESCE(EXCLUDED.owner_email, canvas_tokens.owner_email),
      last_renewed = COALESCE(EXCLUDED.last_renewed, canvas_tokens.last_renewed),
      last_error   = NULL,
      updated_at   = now()
  `
}

async function setError(message: string) {
  await ensureTable()
  await sql`UPDATE canvas_tokens SET last_error = ${message}, updated_at = now() WHERE id = 'main'`
}

// ── Public API ───────────────────────────────────────────────────────────
export async function getCanvasToken(): Promise<string | null> {
  try {
    const row = await readRow()
    if (row) return decrypt(row.token_enc)
  } catch (err) {
    console.error("Could not read stored Canvas token:", err)
  }
  return process.env.CANVAS_TOKEN ?? null
}

export async function getTokenStatus() {
  const row = await readRow().catch(() => null)
  const expiresAt = row?.expires_at ? new Date(row.expires_at) : null
  const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000) : null
  return {
    source: row ? "database" : process.env.CANVAS_TOKEN ? "env" : "none",
    expiresAt: expiresAt?.toISOString() ?? null,
    daysLeft,
    lastRenewed: row?.last_renewed ?? null,
    lastError: row?.last_error ?? null,
  }
}

async function canvas(path: string, token: string, init?: RequestInit) {
  if (!CANVAS_DOMAIN) throw new Error("CANVAS_DOMAIN is not set")
  return fetch(`https://${CANVAS_DOMAIN}/api/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  })
}

// Saves a token pasted in the app (after checking it works)
export async function saveManualToken(token: string, ownerEmail: string) {
  const res = await canvas("/users/self", token)
  if (!res.ok) throw new Error(res.status === 401 ? "Canvas rejected this token (401). Copy it again." : `Canvas error ${res.status}`)
  // Exact expiry isn't known for a pasted token: assume the OPIT maximum (renewal kicks in early anyway)
  await saveToken(token, { expiresAt: new Date(Date.now() + TOKEN_LIFETIME_DAYS * 86_400_000), ownerEmail })
}

// Creates a fresh 30-day token using the current one, stores it, revokes the old one
export async function renewToken(ownerEmail?: string | null) {
  const current = await getCanvasToken()
  if (!current) throw new Error("No Canvas token to renew from. Paste one in the app.")
  const row = await readRow().catch(() => null)

  const expires = new Date(Date.now() + TOKEN_LIFETIME_DAYS * 86_400_000)
  const body = new URLSearchParams({
    "token[purpose]": `OPIT Tracker (auto-renewed ${new Date().toISOString().slice(0, 10)})`,
    "token[expires_at]": expires.toISOString(),
  })
  const res = await canvas("/users/self/tokens", current, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200)
    const msg = `Automatic renewal failed (Canvas ${res.status}): ${detail}`
    if (row) await setError(msg)
    throw new Error(msg)
  }
  const data = await res.json()
  const newToken: string | undefined = data.token ?? data.visible_token
  if (!newToken) {
    const msg = "Canvas created the token but didn't return it (it may need manual activation)."
    if (row) await setError(msg)
    throw new Error(msg)
  }

  await saveToken(newToken, {
    canvasId: data.id != null ? String(data.id) : null,
    expiresAt: data.expires_at ? new Date(data.expires_at) : expires,
    ownerEmail: ownerEmail ?? row?.owner_email ?? null,
    renewed: true,
  })

  // Revoke the previous auto-created token (best effort; a pasted/env token simply expires on its own)
  if (row?.canvas_id) {
    await canvas(`/users/self/tokens/${row.canvas_id}`, newToken, { method: "DELETE" }).catch(() => {})
  }
  return getTokenStatus()
}

// Daily job: renew when close to expiry; email if something needs attention
export async function dailyTokenCheck() {
  const status = await getTokenStatus()
  const needsRenewal = status.source !== "database" || status.daysLeft === null || status.daysLeft < RENEW_WHEN_DAYS_LEFT
  if (!needsRenewal) return { action: "none", status }

  try {
    const renewed = await renewToken()
    return { action: "renewed", status: renewed }
  } catch (err) {
    const fresh = await getTokenStatus()
    await maybeAlert(String(err).replace("Error: ", ""), fresh.daysLeft)
    return { action: "failed", error: String(err), status: fresh }
  }
}

async function maybeAlert(error: string, daysLeft: number | null) {
  const row = await readRow().catch(() => null)
  const to = row?.owner_email
  if (!to || !process.env.RESEND_API_KEY) return
  // At most one alert per day
  if (row?.last_alert && Date.now() - new Date(row.last_alert).getTime() < 20 * 3_600_000) return

  const when = daysLeft === null ? "soon" : daysLeft <= 0 ? "has expired" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to,
      subject: `⚠️ OPIT Tracker — Canvas token ${when}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">
        <p>Your Canvas token ${when} and the automatic renewal didn't work.</p>
        <p style="color:#888">${error}</p>
        <p><b>Fix (1 minute):</b> Canvas → Account → Settings → <i>+ New Access Token</i>,
        then OPIT Tracker → Grades → Grade center → <i>Canvas token</i> → paste it.</p></div>`,
    }),
  }).catch(err => console.error("Token alert email failed:", err))
  await sql`UPDATE canvas_tokens SET last_alert = now() WHERE id = 'main'`
}
