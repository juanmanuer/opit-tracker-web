// lib/reminders.ts
// Smart reminders (phone via ntfy, deadlines also by email):
//  • 15 min before each live session → "Join Zoom" button + passcode
//  • when a session ends → "Mark attended" button (marks attendance from the notification)
//  • 48 h and 6 h before each deadline that isn't submitted yet
import crypto from "crypto"
import { sql } from "@/lib/db"
import { buildPlan, type CanvasDates, type PlanItem } from "@/lib/plan"
import { professorOf, zoomUrl } from "@/lib/academic"
import { getCatalog } from "@/lib/catalog-server"
import type { Catalog } from "@/lib/catalog"
import { ensureUsersTable, usersWithCanvas, type AppUser } from "@/lib/users"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://study-dashboard-fpy7.vercel.app"
const MIN = 60_000

// ── Time zones ──────────────────────────────────────────────────────────
// Plan items hold Malta wall-clock times built with the local Date constructor.
// The server runs in UTC, so convert wall-clock → real instant explicitly.
function maltaOffsetMinutes(at: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Malta", timeZoneName: "shortOffset" })
    .formatToParts(at).find(p => p.type === "timeZoneName")?.value ?? "GMT+1"
  const m = name.match(/GMT([+-]\d+)(?::(\d+))?/)
  return m ? parseInt(m[1]) * 60 + (m[2] ? Math.sign(parseInt(m[1])) * parseInt(m[2]) : 0) : 60
}
export function instantOf(item: PlanItem, which: "start" | "end" = "start") {
  const d = item[which]
  if (item.exact) return d
  const asUtc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
  return new Date(asUtc - maltaOffsetMinutes(new Date(asUtc)) * MIN)
}

// ── Signed "mark attended" links ────────────────────────────────────────
function sign(payload: string) {
  return crypto.createHmac("sha256", process.env.CRON_SECRET ?? "").update(payload).digest("base64url").slice(0, 32)
}
export function attendLink(email: string, courseCode: string, lesson: number) {
  const exp = Date.now() + 3 * 24 * 60 * MIN // valid for 3 days
  const payload = `${email}|${courseCode}|${lesson}|${exp}`
  return `${APP_URL}/api/cron/attend?u=${encodeURIComponent(email)}&c=${encodeURIComponent(courseCode)}&n=${lesson}&e=${exp}&s=${sign(payload)}`
}
export function verifyAttend(u: string, c: string, n: string, e: string, s: string) {
  if (!process.env.CRON_SECRET || Date.now() > Number(e)) return false
  const expected = sign(`${u}|${c}|${n}|${e}`)
  return s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))
}

// ── Helpers ─────────────────────────────────────────────────────────────
let remindersReady = false
async function ensureTable() {
  if (remindersReady) return
  await sql`CREATE TABLE IF NOT EXISTS reminders_sent (key TEXT PRIMARY KEY, sent_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  await ensureUsersTable()
  // One-time migration from single-user keys ("start:<id>") to per-user keys ("start:<email>:<id>")
  const owner = (await sql`SELECT email FROM app_users WHERE legacy_catalog LIMIT 1`.catch(() => []))[0] as any
  if (owner?.email) {
    await sql`
      UPDATE reminders_sent
      SET key = split_part(key, ':', 1) || ':' || ${owner.email} || ':' || substring(key from position(':' in key) + 1)
      WHERE key NOT LIKE '%@%'
    `.catch(() => {})
  }
  remindersReady = true
}
async function once(key: string): Promise<boolean> {
  // true only the first time this key is claimed
  const rows = await sql`INSERT INTO reminders_sent (key) VALUES (${key}) ON CONFLICT (key) DO NOTHING RETURNING key`
  return rows.length > 0
}

type Action = { action: "view" | "http"; label: string; url: string; method?: string; clear?: boolean }
export async function push(user: Pick<AppUser, "ntfy_topic" | "push_alerts">, title: string, message: string, opts: { click?: string; actions?: Action[]; priority?: number; tags?: string[] } = {}) {
  const topic = user.ntfy_topic
  if (!topic || !user.push_alerts) return
  await fetch("https://ntfy.sh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, title, message, click: opts.click ?? APP_URL, actions: opts.actions, priority: opts.priority ?? 4, tags: opts.tags }),
  }).catch(err => console.error("ntfy failed:", err))
}

// ── Live sessions (every 5 minutes) ─────────────────────────────────────
export async function sessionReminders(now = new Date()) {
  await ensureTable()
  let sent = 0
  for (const user of await usersWithCanvas()) {
    if (user.role !== "student") continue
    sent += await sessionRemindersFor(user, now).catch(err => { console.error(`Reminders ${user.email}:`, err); return 0 })
  }
  return { sent }
}

async function sessionRemindersFor(user: AppUser, now: Date) {
  const email = user.email
  const catalog = await getCatalog(email)
  const term = catalog.defaultTerm
  if (!term) return 0
  const attended = new Set(
    (await sql`SELECT course_code, lesson_number FROM attendance WHERE email = ${email} AND status = 'present'`)
      .map((r: any) => `${r.course_code}|${r.lesson_number}`)
  )
  let sent = 0
  for (const s of buildPlan(term, {}, [], catalog).filter(i => i.kind === "session")) {
    const start = instantOf(s, "start"), end = instantOf(s, "end")
    const prof = professorOf(term, s.courseCode!, catalog)
    const toStart = start.getTime() - now.getTime()
    const sinceEnd = now.getTime() - end.getTime()

    if (toStart > 0 && toStart <= 16 * MIN && prof && await once(`start:${email}:${s.id}`)) {
      await push(user, `🎥 ${s.courseCode} starts in ${Math.round(toStart / MIN)} min`,
        `${prof.courseName} · live session ${s.sessionNumber}${prof.passcode ? `\nPasscode: ${prof.passcode}` : ""}`,
        prof.meetingId
          ? { click: zoomUrl(prof.meetingId), actions: [{ action: "view", label: "Join Zoom", url: zoomUrl(prof.meetingId), clear: true }], priority: 5, tags: ["movie_camera"] }
          : { priority: 5, tags: ["movie_camera"] })
      sent++
    }
    if (sinceEnd >= 0 && sinceEnd <= 60 * MIN && !attended.has(`${s.courseCode}|${s.sessionNumber}`) && await once(`attend:${email}:${s.id}`)) {
      await push(user, `Did you attend ${s.courseCode}?`, `${prof?.courseName ?? s.title} · live session ${s.sessionNumber} just ended.`,
        { actions: [{ action: "http", label: "✓ Mark attended", url: attendLink(email, s.courseCode!, s.sessionNumber!), method: "POST", clear: true }], tags: ["white_check_mark"] })
      sent++
    }
  }
  return sent
}

// ── Deadlines (hourly, with Canvas dates) ───────────────────────────────
export async function deadlineReminders(user: AppUser, canvas: CanvasDates, catalog: Catalog, now = new Date()) {
  await ensureTable()
  const email = user.email
  const term = catalog.defaultTerm
  const done = new Set((await sql`SELECT assessment_id FROM user_assessments WHERE email = ${email} AND status = 'done'`).map((r: any) => r.assessment_id))
  const graded = new Set((await sql`SELECT course_code, assessment_index FROM grade_scores WHERE email = ${email} AND term = ${term}`)
    .map((r: any) => `${r.course_code}|${r.assessment_index}`))
  let sent = 0
  for (const d of buildPlan(term, canvas, [], catalog).filter(i => i.kind === "deadline")) {
    if (done.has(d.assessmentId!) || graded.has(`${d.courseCode}|${d.assessmentIdx}`)) continue
    const hoursLeft = (instantOf(d).getTime() - now.getTime()) / (60 * MIN)
    for (const [mark, label] of [[48, "in 2 days"], [6, "in 6 hours"]] as const) {
      if (hoursLeft > 0 && hoursLeft <= mark && await once(`due${mark}:${email}:${d.id}`)) {
        await push(user, `📌 ${d.courseCode} ${d.title} due ${label}`, `Weight ${d.weight} · ${instantOf(d).toLocaleString("en-GB", { timeZone: "Europe/Malta", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
          { click: d.url ?? APP_URL, actions: d.url ? [{ action: "view", label: "Open in Canvas", url: d.url }] : undefined, priority: mark === 6 ? 5 : 4, tags: ["pushpin"] })
        if (mark === 48 && user.email_alerts) await deadlineEmail(email, d, label)
        sent++
        break
      }
    }
  }
  return { sent }
}

async function deadlineEmail(to: string, d: PlanItem, label: string) {
  if (!process.env.RESEND_API_KEY) return
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "onboarding@resend.dev", to,
      subject: `📌 ${d.courseCode} ${d.title} due ${label}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">
        <p><b>${d.courseCode} · ${d.title}</b> (${d.weight}) is due ${label} and isn't marked as submitted.</p>
        ${d.url ? `<p><a href="${d.url}">Open in Canvas →</a></p>` : ""}
        <p style="color:#888">Already submitted? Mark it done in OPIT Tracker → Courses and you won't get the 6-hour reminder.</p></div>`,
    }),
  }).catch(err => console.error("Deadline email failed:", err))
}
