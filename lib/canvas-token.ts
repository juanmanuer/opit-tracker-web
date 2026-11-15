// lib/canvas-token.ts
// One Canvas access token PER USER, stored encrypted (AES-256-GCM) and renewed
// automatically (OPIT limits tokens to 30 days). Row id = the user's email.
import crypto from "crypto"
import { sql } from "@/lib/db"
import { ensureUsersTable, updateUser } from "@/lib/users"

const CANVAS_DOMAIN = process.env.CANVAS_DOMAIN
const RENEW_WHEN_DAYS_LEFT = 10
const TOKEN_LIFETIME_DAYS = 30

// ── Encryption ──────────────────────────────────────────────────────────
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

// ── Storage ─────────────────────────────────────────────────────────────
let ready = false
async function ensureTable() {
  if (ready) return
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
  await ensureUsersTable()  // also migrates the single-user 'main' token to its owner
  ready = true
}

type Row = {
  id: string; token_enc: string; canvas_id: string | null; expires_at: string | null
  last_renewed: string | null; last_error: string | null; last_alert: string | null
}

async function readRow(email: string): Promise<Row | null> {
  await ensureTable()
  const rows = await sql`SELECT * FROM canvas_tokens WHERE id = ${email.toLowerCase()}`
  return (rows[0] as Row) ?? null
}

async function saveToken(email: string, token: string, opts: { canvasId?: string | null; expiresAt: Date; renewed?: boolean }) {
  await ensureTable()
  const id = email.toLowerCase()
  await sql`
    INSERT INTO canvas_tokens (id, token_enc, canvas_id, expires_at, owner_email, last_renewed, last_error, updated_at)
    VALUES (${id}, ${encrypt(token)}, ${opts.canvasId ?? null}, ${opts.expiresAt.toISOString()},
            ${id}, ${opts.renewed ? new Date().toISOString() : null}, NULL, now())
    ON CONFLICT (id) DO UPDATE SET
      token_enc    = EXCLUDED.token_enc,
      canvas_id    = EXCLUDED.canvas_id,
      expires_at   = EXCLUDED.expires_at,
      owner_email  = EXCLUDED.owner_email,
      last_renewed = COALESCE(EXCLUDED.last_renewed, canvas_tokens.last_renewed),
      last_error   = NULL,
      updated_at   = now()
  `
}

async function setError(email: string, message: string) {
  await sql`UPDATE canvas_tokens SET last_error = ${message}, updated_at = now() WHERE id = ${email.toLowerCase()}`
}

// ── Public API ──────────────────────────────────────────────────────────
export async function getCanvasToken(email: string): Promise<string | null> {
  try {
    const row = await readRow(email)
    return row ? decrypt(row.token_enc) : null
  } catch (err) {
    console.error("Could not read Canvas token:", err)
    return null
  }
}

export async function getTokenStatus(email: string) {
  const row = await readRow(email).catch(() => null)
  const expiresAt = row?.expires_at ? new Date(row.expires_at) : null
  const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000) : null
  return {
    source: row ? "database" : "none",
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
    cache: "no-store",
  })
}

// Saves a token pasted in the app — only if it belongs to the signed-in person
export async function saveManualToken(token: string, email: string) {
  const res = await canvas("/users/self/profile", token)
  if (!res.ok) throw new Error(res.status === 401 ? "Canvas rejected this token (401). Copy it again." : `Canvas error ${res.status}`)
  const profile = await res.json()
  const ids = [profile.primary_email, profile.login_id, profile.email].filter(Boolean).map((s: string) => s.toLowerCase())
  if (ids.length > 0 && !ids.includes(email.toLowerCase())) {
    throw new Error("This Canvas token belongs to a different account. Generate one while signed in to your own Canvas.")
  }
  await saveToken(email, token, { expiresAt: new Date(Date.now() + TOKEN_LIFETIME_DAYS * 86_400_000) })
  if (profile.id != null) await updateUser(email, { canvas_user_id: String(profile.id) })
}

// Creates a fresh 30-day token from the current one, stores it, revokes the old one
export async function renewToken(email: string) {
  const current = await getCanvasToken(email)
  if (!current) throw new Error("No Canvas token to renew from. Paste one in the app.")
  const row = await readRow(email)

  const expires = new Date(Date.now() + TOKEN_LIFETIME_DAYS * 86_400_000)
  const res = await canvas("/users/self/tokens", current, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      "token[purpose]": `OPIT Tracker (auto-renewed ${new Date().toISOString().slice(0, 10)})`,
      "token[expires_at]": expires.toISOString(),
    }),
  })
  if (!res.ok) {
    const msg = `Automatic renewal failed (Canvas ${res.status}): ${(await res.text()).slice(0, 200)}`
    await setError(email, msg)
    throw new Error(msg)
  }
  const data = await res.json()
  const newToken: string | undefined = data.token ?? data.visible_token
  if (!newToken) {
    const msg = "Canvas created the token but didn't return it (it may need manual activation)."
    await setError(email, msg)
    throw new Error(msg)
  }
  await saveToken(email, newToken, {
    canvasId: data.id != null ? String(data.id) : null,
    expiresAt: data.expires_at ? new Date(data.expires_at) : expires,
    renewed: true,
  })
  if (row?.canvas_id) await canvas(`/users/self/tokens/${row.canvas_id}`, newToken, { method: "DELETE" }).catch(() => {})
  return getTokenStatus(email)
}

// Daily job: renew every user's token when close to expiry; email them if it fails
export async function dailyTokenCheck() {
  await ensureTable()
  const rows = (await sql`SELECT id FROM canvas_tokens`) as { id: string }[]
  const results: { email: string; action: string }[] = []
  for (const { id } of rows) {
    if (!id.includes("@")) continue
    const status = await getTokenStatus(id)
    if (status.daysLeft !== null && status.daysLeft >= RENEW_WHEN_DAYS_LEFT) { results.push({ email: id, action: "none" }); continue }
    try {
      await renewToken(id)
      results.push({ email: id, action: "renewed" })
    } catch (err) {
      await maybeAlert(id, String(err).replace("Error: ", ""), (await getTokenStatus(id)).daysLeft)
      results.push({ email: id, action: "failed" })
    }
  }
  return results
}

async function maybeAlert(email: string, error: string, daysLeft: number | null) {
  const row = await readRow(email).catch(() => null)
  if (!process.env.RESEND_API_KEY) return
  if (row?.last_alert && Date.now() - new Date(row.last_alert).getTime() < 20 * 3_600_000) return
  const when = daysLeft === null ? "soon" : daysLeft <= 0 ? "has expired" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: email,
      subject: `⚠️ OPIT Tracker — Canvas token ${when}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">
        <p>Your Canvas token ${when} and the automatic renewal didn't work.</p>
        <p style="color:#888">${error}</p>
        <p><b>Fix (1 minute):</b> Canvas → Account → Settings → <i>+ New Access Token</i>,
        then OPIT Tracker → Grades → <i>Canvas token</i> → paste it.</p></div>`,
    }),
  }).catch(err => console.error("Token alert email failed:", err))
  await sql`UPDATE canvas_tokens SET last_alert = now() WHERE id = ${email.toLowerCase()}`
}

// Removes a user's connection (used by "delete my data")
export async function deleteToken(email: string) {
  await ensureTable()
  await sql`DELETE FROM canvas_tokens WHERE id = ${email.toLowerCase()}`
}
