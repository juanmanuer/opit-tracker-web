// lib/grade-alerts.ts
// Hourly job: detects newly graded assessments / bonuses in Canvas,
// fills the empty boxes in the app and notifies by email + phone (ntfy).
import { sql } from "@/lib/db"
import { getCatalog } from "@/lib/catalog-server"
import { termData } from "@/lib/catalog"
import { fetchCanvasTermGrades, syncTermFromCanvas } from "@/lib/canvas-grades"
import { deadlineReminders } from "@/lib/reminders"
import { getUser, usersWithCanvas, type AppUser } from "@/lib/users"

type NewGrade = { courseCode: string; courseName: string; label: string; score: number; previous: number | null }

const APP_URL = process.env.APP_URL ?? "https://study-dashboard-fpy7.vercel.app"

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS grade_alerts_seen (
      email       TEXT NOT NULL,
      term        TEXT NOT NULL,
      course_code TEXT NOT NULL,
      item_key    TEXT NOT NULL,
      score       NUMERIC NOT NULL,
      seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (email, term, course_code, item_key)
    )
  `
}

// Cron: every student with a Canvas connection
export async function checkAllUsers() {
  await ensureTable()
  const results: Record<string, unknown> = {}
  for (const u of await usersWithCanvas()) {
    if (u.role !== "student") continue
    results[u.email] = await checkNewGrades(u).catch(err => ({ error: String(err) }))
  }
  return { users: Object.keys(results).length, results }
}

export async function checkNewGrades(user: AppUser, termArg?: string) {
  await ensureTable()
  const email = user.email
  const catalog = await getCatalog(email, { refreshIfStale: true })
  const term = termArg ?? catalog.defaultTerm
  if (!term || !catalog.terms[term]) return { term, firstRun: false, newGrades: 0, errors: ["No courses found in Canvas yet"] }
  const canvas = await fetchCanvasTermGrades(term, email, catalog)
  const seenRows = await sql`SELECT course_code, item_key, score FROM grade_alerts_seen WHERE email = ${email} AND term = ${term}`
  const seen = new Map(seenRows.map((r: any) => [`${r.course_code}|${r.item_key}`, Number(r.score)]))
  const firstRun = seenRows.length === 0
  const names = Object.fromEntries(termData(term, catalog).courses.map(c => [c.code, c.name]))

  const fresh: NewGrade[] = []
  const errors: string[] = []
  for (const c of canvas) {
    if (c.error) { errors.push(`${c.code}: ${c.error}`); continue }
    const items: { key: string; label: string; score: number }[] = [
      ...c.assessments.filter(a => a.pct !== null).map(a => ({ key: `A${a.idx + 1}`, label: a.name.replace(/^[^A-Za-z]+/, ""), score: a.pct! })),
      ...(c.bonus.live !== null ? [{ key: "bonus-live", label: "Live sessions bonus", score: c.bonus.live ? 5 : 0 }] : []),
      ...(c.bonus.practices !== null ? [{ key: "bonus-practices", label: "Practices bonus", score: c.bonus.practices ? 5 : 0 }] : []),
    ]
    for (const it of items) {
      const prev = seen.get(`${c.code}|${it.key}`)
      if (prev !== undefined && Math.abs(prev - it.score) < 0.05) continue
      await sql`
        INSERT INTO grade_alerts_seen (email, term, course_code, item_key, score)
        VALUES (${email}, ${term}, ${c.code}, ${it.key}, ${it.score})
        ON CONFLICT (email, term, course_code, item_key) DO UPDATE SET score = ${it.score}, seen_at = now()
      `
      if (!firstRun) fresh.push({ courseCode: c.code, courseName: names[c.code] ?? c.code, label: it.label, score: it.score, previous: prev ?? null })
    }
  }

  // Keep the app up to date: fill empty boxes + official bonuses (never overwrites your own values)
  if (fresh.length > 0 || firstRun) await syncTermFromCanvas(email, term, { applyFills: true, catalog })

  if (fresh.length > 0) await Promise.all([user.email_alerts ? sendEmail(email, term, fresh) : null, sendPush(user, term, fresh)])

  // Deadline reminders (48 h / 6 h) using the Canvas dates we just fetched
  if (term === catalog.defaultTerm) {
    const dates = Object.fromEntries(canvas.map(c => [c.code, c.assessments.map(x => ({ idx: x.idx, dueAt: x.dueAt ?? null, unlockAt: x.unlockAt ?? null, url: x.url ?? null }))]))
    await deadlineReminders(user, dates, catalog).catch(err => console.error("Deadline reminders failed:", err))
  }
  return { term, firstRun, newGrades: fresh.length, errors }
}

async function sendPush(user: Pick<AppUser, "ntfy_topic" | "push_alerts">, term: string, grades: NewGrade[]) {
  const topic = user.ntfy_topic
  if (!topic || !user.push_alerts) return
  const body = grades.map(g => `${g.courseCode} · ${g.label}: ${g.score}${g.label.includes("bonus") ? " pts" : "%"}`).join("\n")
  await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers: {
      Title: `New grade${grades.length > 1 ? "s" : ""} in ${term}`,
      Tags: "mortar_board",
      Priority: "high",
      Click: APP_URL,
    },
    body,
  }).catch(err => console.error("ntfy failed:", err))
}

async function sendEmail(to: string, term: string, grades: NewGrade[]) {
  if (!process.env.RESEND_API_KEY) return
  const rows = grades.map(g => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #1e2a3a;color:#00d4ff;font-weight:600">${g.courseCode}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #1e2a3a;color:#c8d0e0">${g.courseName}<br><span style="color:#8b949e;font-size:12px">${g.label}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid #1e2a3a;color:#00ff9f;font-weight:700;text-align:right">${g.score}${g.label.includes("bonus") ? " pts" : "%"}${g.previous !== null ? `<br><span style="color:#8b949e;font-size:11px;font-weight:400">was ${g.previous}</span>` : ""}</td>
    </tr>`).join("")
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to,
      subject: `🎓 OPIT Tracker — ${grades.length} new grade${grades.length > 1 ? "s" : ""} in ${term}`,
      html: `<div style="background:#0a0b10;padding:24px;font-family:Arial,sans-serif">
        <div style="max-width:560px;margin:0 auto;background:#0d1117;border:1px solid #21262d;border-radius:12px;overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid #21262d;color:#e6edf3;font-size:16px;font-weight:700">New grades in ${term}</div>
          <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
          <div style="padding:16px 20px"><a href="${APP_URL}" style="color:#00d4ff">Open Grade center →</a></div>
        </div></div>`,
    }),
  }).catch(err => console.error("Grade alert email failed:", err))
}

// Test notification from the app (email + phone)
export async function sendTestAlert(email: string) {
  const sample: NewGrade[] = [{ courseCode: "TEST", courseName: "OPIT Tracker", label: "Alerts are connected ✓", score: 100, previous: null }]
  const user = await getUser(email)
  if (!user) throw new Error("Unknown user")
  await Promise.all([sendEmail(email, "your tracker", sample), sendPush({ ...user, push_alerts: true }, "your tracker", sample)])
  return { email: !!process.env.RESEND_API_KEY, push: true, topic: user.ntfy_topic }
}
