// lib/users.ts — one row per person who signs in
import crypto from "crypto"
import { sql } from "@/lib/db"

export type Role = "student" | "teacher" | "staff"

export type AppUser = {
  email: string
  name: string | null
  role: Role
  ntfy_topic: string
  email_alerts: boolean
  push_alerts: boolean
  legacy_catalog: boolean     // true = uses the built-in course list (until auto-discovery, F2)
  canvas_user_id: string | null
  onboarded_at: string | null
}

// Any OPIT account: @opit.com or any subdomain (@students.opit.com, @faculty.opit.com, …)
export function isOpitEmail(email: string) {
  return /@([a-z0-9-]+\.)*opit\.com$/i.test(email.trim())
}

export function roleFromEmail(email: string): Role {
  const domain = email.split("@")[1]?.toLowerCase() ?? ""
  if (domain.startsWith("students.")) return "student"
  if (domain.startsWith("faculty.")) return "teacher"
  return "staff"
}

let ready = false
export async function ensureUsersTable() {
  if (ready) return
  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      email           TEXT PRIMARY KEY,
      name            TEXT,
      role            TEXT NOT NULL DEFAULT 'student',
      ntfy_topic      TEXT NOT NULL UNIQUE,
      email_alerts    BOOLEAN NOT NULL DEFAULT true,
      push_alerts     BOOLEAN NOT NULL DEFAULT true,
      legacy_catalog  BOOLEAN NOT NULL DEFAULT false,
      canvas_user_id  TEXT,
      onboarded_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  ready = true
  await migrateSingleUser()
}

// One-time: the single-user version stored ONE Canvas token under id 'main'.
// Its owner becomes the first user (keeps his ntfy channel + built-in courses)
// and the token row is renamed to his email. Nothing else changes: all
// attendance/grades/practices were always stored per email already.
async function migrateSingleUser() {
  const rows = await sql`SELECT owner_email FROM canvas_tokens WHERE id = 'main'`.catch(() => [])
  const owner = ((rows[0] as any)?.owner_email as string | undefined)?.toLowerCase()
  if (!owner) return
  await sql`
    INSERT INTO app_users (email, role, ntfy_topic, legacy_catalog)
    VALUES (${owner}, ${roleFromEmail(owner)}, ${process.env.NTFY_TOPIC || newTopic()}, true)
    ON CONFLICT (email) DO UPDATE SET legacy_catalog = true
  `
  await sql`
    UPDATE canvas_tokens SET id = ${owner}
    WHERE id = 'main' AND NOT EXISTS (SELECT 1 FROM canvas_tokens WHERE id = ${owner})
  `
}

const newTopic = () => `opit-${crypto.randomBytes(8).toString("hex")}`

// Called on every sign-in. The original owner (the person whose Canvas token
// was stored before multi-user) keeps his ntfy channel and built-in courses.
export async function upsertUser(email: string, name?: string | null): Promise<AppUser> {
  await ensureUsersTable()
  const e = email.toLowerCase()
  const existing = await getUser(e)
  if (existing) {
    await sql`UPDATE app_users SET last_seen_at = now(), name = COALESCE(${name ?? null}, name) WHERE email = ${e}`
    return existing
  }
  await sql`
    INSERT INTO app_users (email, name, role, ntfy_topic)
    VALUES (${e}, ${name ?? null}, ${roleFromEmail(e)}, ${newTopic()})
    ON CONFLICT (email) DO NOTHING
  `
  return (await getUser(e))!
}

export async function getUser(email: string): Promise<AppUser | null> {
  await ensureUsersTable()
  const rows = await sql`SELECT * FROM app_users WHERE email = ${email.toLowerCase()}`
  return (rows[0] as AppUser) ?? null
}

// Users the background jobs work for: they have a Canvas connection
export async function usersWithCanvas(): Promise<AppUser[]> {
  await ensureUsersTable()
  const rows = await sql`
    SELECT u.* FROM app_users u
    JOIN canvas_tokens t ON lower(t.id) = u.email
  `.catch(() => [])
  return rows as AppUser[]
}

export async function updateUser(email: string, patch: Partial<Pick<AppUser, "role" | "email_alerts" | "push_alerts" | "canvas_user_id" | "onboarded_at">>) {
  await ensureUsersTable()
  const u = await getUser(email)
  if (!u) return
  await sql`
    UPDATE app_users SET
      role           = ${patch.role ?? u.role},
      email_alerts   = ${patch.email_alerts ?? u.email_alerts},
      push_alerts    = ${patch.push_alerts ?? u.push_alerts},
      canvas_user_id = ${patch.canvas_user_id ?? u.canvas_user_id},
      onboarded_at   = ${patch.onboarded_at ?? u.onboarded_at}
    WHERE email = ${email.toLowerCase()}
  `
}

export async function resetTopic(email: string) {
  await ensureUsersTable()
  const t = newTopic()
  await sql`UPDATE app_users SET ntfy_topic = ${t} WHERE email = ${email.toLowerCase()}`
  return t
}
