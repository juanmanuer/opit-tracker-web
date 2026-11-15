// lib/digest.ts — Sunday weekly digest (email + phone)
import { sql } from "@/lib/db"
import { DEFAULT_TERM } from "@/lib/store"
import { GRADE_WEIGHTS } from "@/lib/grades"
import { coursesOf, courseResult, termResult, bonusInfo, LIVE_NEEDED, LIVE_SESSIONS_PER_COURSE, type AcademicState, type Bonus } from "@/lib/academic"
import { buildPlan, type CanvasDates } from "@/lib/plan"
import { fetchCanvasTermGrades } from "@/lib/canvas-grades"
import { instantOf, ownerEmail, push } from "@/lib/reminders"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://study-dashboard-fpy7.vercel.app"
const DAY = 86_400_000
const malta = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-GB", { timeZone: "Europe/Malta", ...o })

// Same data the app loads, read on the server
async function loadState(email: string, term: string): Promise<AcademicState> {
  const [att, prac, ass, grades, bonus] = await Promise.all([
    sql`SELECT course_code, lesson_number, status FROM attendance WHERE email = ${email}`,
    sql`SELECT practice_id FROM user_practices WHERE email = ${email} AND completed = true`,
    sql`SELECT assessment_id, status FROM user_assessments WHERE email = ${email}`,
    sql`SELECT course_code, assessment_index, score FROM grade_scores WHERE email = ${email} AND term = ${term}`,
    sql`SELECT course_code, live, practices FROM course_bonuses WHERE email = ${email} AND term = ${term}`.catch(() => []),
  ])
  const attendance: AcademicState["attendance"] = {}
  att.forEach((r: any) => { (attendance[r.course_code] ??= {})[r.lesson_number] = r.status })
  const scores = Object.fromEntries(Object.entries(GRADE_WEIGHTS[term] ?? {}).map(([c, w]) => [c, w.map(() => null as number | null)]))
  grades.forEach((r: any) => { if (scores[r.course_code] && r.assessment_index < scores[r.course_code].length) scores[r.course_code][r.assessment_index] = Number(r.score) })
  const official: Record<string, Bonus> = {}
  bonus.forEach((r: any) => { official[r.course_code] = { live: r.live, practices: r.practices } })
  return {
    scores: { [term]: scores },
    official: { [term]: official },
    attendance,
    practicesDone: new Set(prac.map((r: any) => r.practice_id)),
    assessmentStatus: Object.fromEntries(ass.map((r: any) => [r.assessment_id, r.status])),
  }
}

export async function weeklyDigest(now = new Date(), term = DEFAULT_TERM) {
  const email = await ownerEmail()
  if (!email) throw new Error("No owner email yet")
  const state = await loadState(email, term)

  let canvas: CanvasDates = {}
  try {
    for (const c of await fetchCanvasTermGrades(term)) canvas[c.code] = c.assessments.map(a => ({ idx: a.idx, dueAt: a.dueAt ?? null, unlockAt: a.unlockAt ?? null, url: a.url ?? null }))
  } catch { /* fall back to saved dates */ }

  const plan = buildPlan(term, canvas)
  const weekEnd = new Date(now.getTime() + 7 * DAY)
  const courses = coursesOf(term)
  const name = (code: string | null) => courses.find(c => c.code === code)?.name ?? code ?? ""
  const color = (code: string | null) => courses.find(c => c.code === code)?.color ?? "#888"

  // Coming week
  const deadlines = plan.filter(i => i.kind === "deadline" && instantOf(i) > now && instantOf(i) < weekEnd)
    .map(i => {
      const r = courseResult(state, term, i.courseCode!)
      const done = r.scores[i.assessmentIdx!] != null || state.assessmentStatus[i.assessmentId!] === "done"
      return { i, done }
    })
  const sessions = plan.filter(i => i.kind === "session" && instantOf(i) > now && instantOf(i) < weekEnd)

  // Past sessions not marked (to fix before bonus maths go wrong)
  const unmarked = plan.filter(i => i.kind === "session" && instantOf(i, "end") < now && state.attendance[i.courseCode!]?.[i.sessionNumber!] !== "present")

  // Bonus at risk
  const risks: string[] = []
  for (const c of courses) {
    const b = bonusInfo(state, term, c.code)
    const pastSessions = plan.filter(i => i.kind === "session" && i.courseCode === c.code && instantOf(i, "end") < now).length
    const left = LIVE_SESSIONS_PER_COURSE - pastSessions
    const need = LIVE_NEEDED - b.attended
    if (!b.live && !b.liveOfficial) {
      if (need > left) risks.push(`${c.code}: live bonus out of reach (${b.attended}/7, ${left} sessions left)`)
      else if (need >= left - 1) risks.push(`${c.code}: attend ${need} of the ${left} remaining live sessions for +5`)
    }
    if (!b.prac && !b.pracOfficial && b.totalPractices > 0) risks.push(`${c.code}: ${b.totalPractices - b.done} practices left for +5`)
  }

  const tr = termResult(state, term)

  // ── Email ──
  const row = (left: string, right: string, accent: string) =>
    `<tr><td style="padding:9px 14px;border-bottom:1px solid #1e2a3a;border-left:3px solid ${accent};color:#c8d0e0;font-size:13px">${left}</td><td style="padding:9px 14px;border-bottom:1px solid #1e2a3a;color:#8b949e;font-size:12px;text-align:right;white-space:nowrap">${right}</td></tr>`
  const section = (title: string, body: string) =>
    `<div style="padding:14px 20px 4px;color:#e6edf3;font-size:14px;font-weight:700">${title}</div><table style="width:100%;border-collapse:collapse">${body}</table>`

  const html = `<div style="background:#0a0b10;padding:24px;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;background:#0d1117;border:1px solid #21262d;border-radius:12px;overflow:hidden">
      <div style="padding:20px;border-bottom:1px solid #21262d">
        <div style="color:#8b949e;font-size:12px">${term} · week of ${malta(now, { day: "numeric", month: "long" })}</div>
        <div style="color:#e6edf3;font-size:20px;font-weight:700;margin-top:4px">Your week ahead</div>
        <div style="color:#00d4ff;font-size:13px;margin-top:6px">Term average ${tr.average !== null ? tr.average.toFixed(1) : "—"}${tr.rawAverage !== null ? ` · ${tr.rawAverage.toFixed(1)} without bonus` : ""} · ${tr.graded}/${tr.total} grades in</div>
      </div>
      ${section(`📌 Deadlines (${deadlines.length})`, deadlines.length
        ? deadlines.map(({ i, done }) => row(`<b>${i.courseCode}</b> ${name(i.courseCode)} — ${i.title} <span style="color:#8b949e">(${i.weight})</span>${done ? ' <span style="color:#00ff9f">✓ submitted</span>' : ""}`, malta(instantOf(i), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), color(i.courseCode))).join("")
        : row("Nothing due this week 🎉", "", "#3fb950"))}
      ${section(`🎥 Live sessions (${sessions.length})`, sessions.map(i => row(`${name(i.courseCode)} · session ${i.sessionNumber}`, malta(instantOf(i), { weekday: "short", hour: "2-digit", minute: "2-digit" }), color(i.courseCode))).join(""))}
      ${risks.length ? section("🎯 Bonuses to secure", risks.map(r => row(r, "", "#e3b341")).join("")) : ""}
      ${unmarked.length ? section(`📝 Sessions not marked yet (${unmarked.length})`, unmarked.slice(-8).map(i => row(`${i.courseCode} · session ${i.sessionNumber}`, malta(instantOf(i), { weekday: "short", day: "numeric", month: "short" }), color(i.courseCode))).join("")) : ""}
      <div style="padding:18px 20px"><a href="${APP_URL}/#plan" style="color:#00d4ff">Open your plan →</a></div>
    </div></div>`

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: "onboarding@resend.dev", to: email, subject: `🗓️ OPIT week ahead — ${deadlines.filter(d => !d.done).length} due · ${sessions.length} live sessions`, html }),
    })
  }

  const pending = deadlines.filter(d => !d.done)
  await push("🗓️ Your week ahead",
    [
      pending.length ? `📌 ${pending.map(d => `${d.i.courseCode!.split("-")[1]} ${d.i.title.replace("Assessment ", "A")} (${malta(instantOf(d.i), { weekday: "short" })})`).join(", ")}` : "📌 Nothing due",
      `🎥 ${sessions.length} live sessions`,
      risks.length ? `🎯 ${risks.length} bonuses to secure` : "✅ Bonuses on track",
      unmarked.length ? `📝 ${unmarked.length} sessions not marked` : "",
    ].filter(Boolean).join("\n"),
    { click: `${APP_URL}/#plan`, priority: 3, tags: ["calendar"] })

  return { deadlines: deadlines.length, sessions: sessions.length, risks: risks.length, unmarked: unmarked.length }
}
