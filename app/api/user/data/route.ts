import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { deleteToken } from "@/lib/canvas-token"

// Every table that holds a person's own rows (column "email")
const TABLES = [
  "attendance", "user_practices", "user_assessments", "grade_scores", "canvas_scores", "course_bonuses",
  "user_notes", "calendar_events", "kanban_tasks", "grade_alerts_seen", "calendar_feeds",
  "user_catalog", "course_overrides", "app_users",
] as const

// Neon's tagged template can't take a table name as a parameter, so each query is written out
async function readTable(t: (typeof TABLES)[number], email: string): Promise<unknown[]> {
  switch (t) {
    case "attendance": return sql`SELECT * FROM attendance WHERE email = ${email}`
    case "user_practices": return sql`SELECT * FROM user_practices WHERE email = ${email}`
    case "user_assessments": return sql`SELECT * FROM user_assessments WHERE email = ${email}`
    case "grade_scores": return sql`SELECT * FROM grade_scores WHERE email = ${email}`
    case "canvas_scores": return sql`SELECT * FROM canvas_scores WHERE email = ${email}`
    case "course_bonuses": return sql`SELECT * FROM course_bonuses WHERE email = ${email}`
    case "user_notes": return sql`SELECT * FROM user_notes WHERE email = ${email}`
    case "calendar_events": return sql`SELECT * FROM calendar_events WHERE email = ${email}`
    case "kanban_tasks": return sql`SELECT * FROM kanban_tasks WHERE email = ${email}`
    case "grade_alerts_seen": return sql`SELECT * FROM grade_alerts_seen WHERE email = ${email}`
    case "calendar_feeds": return sql`SELECT email, created_at FROM calendar_feeds WHERE email = ${email}` // token left out
    case "user_catalog": return sql`SELECT * FROM user_catalog WHERE email = ${email}`
    case "course_overrides": return sql`SELECT * FROM course_overrides WHERE email = ${email}`
    case "app_users": return sql`SELECT email, name, role, email_alerts, push_alerts, created_at, last_seen_at FROM app_users WHERE email = ${email}`
  }
}
async function deleteTable(t: (typeof TABLES)[number], email: string) {
  switch (t) {
    case "attendance": return sql`DELETE FROM attendance WHERE email = ${email}`
    case "user_practices": return sql`DELETE FROM user_practices WHERE email = ${email}`
    case "user_assessments": return sql`DELETE FROM user_assessments WHERE email = ${email}`
    case "grade_scores": return sql`DELETE FROM grade_scores WHERE email = ${email}`
    case "canvas_scores": return sql`DELETE FROM canvas_scores WHERE email = ${email}`
    case "course_bonuses": return sql`DELETE FROM course_bonuses WHERE email = ${email}`
    case "user_notes": return sql`DELETE FROM user_notes WHERE email = ${email}`
    case "calendar_events": return sql`DELETE FROM calendar_events WHERE email = ${email}`
    case "kanban_tasks": return sql`DELETE FROM kanban_tasks WHERE email = ${email}`
    case "grade_alerts_seen": return sql`DELETE FROM grade_alerts_seen WHERE email = ${email}`
    case "calendar_feeds": return sql`DELETE FROM calendar_feeds WHERE email = ${email}`
    case "user_catalog": return sql`DELETE FROM user_catalog WHERE email = ${email}`
    case "course_overrides": return sql`DELETE FROM course_overrides WHERE email = ${email}`
    case "app_users": return sql`DELETE FROM app_users WHERE email = ${email}`
  }
}

// GET → download everything stored about you (JSON). Canvas token and calendar link are never included.
export async function GET() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({}, { status: 401 })
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), email }
  for (const t of TABLES) out[t] = await readTable(t, email).catch(() => [])
  const token = await sql`SELECT expires_at, last_renewed FROM canvas_tokens WHERE id = ${email.toLowerCase()}`.catch(() => [])
  out.canvas_connection = token[0] ?? null
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="opit-tracker-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}

// DELETE { confirm: "<your email>" } → erases all your data and your Canvas connection
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({}, { status: 401 })
  const { confirm } = await req.json().catch(() => ({}))
  if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Type your email exactly to confirm" }, { status: 400 })
  }
  const lower = email.toLowerCase()
  const deleted: string[] = []
  for (const t of TABLES) {
    await deleteTable(t, t === "app_users" || t === "user_catalog" || t === "course_overrides" ? lower : email)
      .then(() => deleted.push(t)).catch(() => {})
  }
  await deleteToken(lower).catch(() => sql`DELETE FROM canvas_tokens WHERE id = ${lower}`.catch(() => {}))
  await sql`DELETE FROM reminders_sent WHERE key LIKE ${`%:${lower}:%`}`.catch(() => {})
  return NextResponse.json({ success: true, deleted })
}
