// lib/calendar-feed.ts — private subscription link for Google / Apple Calendar
import crypto from "crypto"
import { sql } from "@/lib/db"

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS calendar_feeds (
      email      TEXT PRIMARY KEY,
      token      TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

export async function getFeedToken(email: string): Promise<string | null> {
  await ensureTable()
  const rows = await sql`SELECT token FROM calendar_feeds WHERE email = ${email}`
  return (rows[0] as any)?.token ?? null
}

export async function createFeedToken(email: string): Promise<string> {
  await ensureTable()
  const token = crypto.randomBytes(24).toString("base64url")
  await sql`
    INSERT INTO calendar_feeds (email, token) VALUES (${email}, ${token})
    ON CONFLICT (email) DO UPDATE SET token = ${token}, created_at = now()
  `
  return token
}

export async function emailForToken(token: string): Promise<string | null> {
  await ensureTable()
  const rows = await sql`SELECT email FROM calendar_feeds WHERE token = ${token}`
  return (rows[0] as any)?.email ?? null
}
