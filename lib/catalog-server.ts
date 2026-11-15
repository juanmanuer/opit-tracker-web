// lib/catalog-server.ts
// Discovers each person's course catalogue from THEIR Canvas and stores it.
// Works for any OPIT intake or programme: courses, terms, assessments (with
// due dates), weights, practices, professors, live-session times and Zoom.
import { sql } from "@/lib/db"
import { getCanvasToken } from "@/lib/canvas-token"
import { getUser, updateUser } from "@/lib/users"
import {
  BUILT_IN, EMPTY_CATALOG, mergeBuiltIn, applyWeightOverrides,
  type Catalog, type CatalogTerm, type CatalogCourse, type CatalogAssessment, type WeightSource,
} from "@/lib/catalog"
import type { Practice, Professor } from "@/lib/store"
import { applyCourseInfo, seedFromBuiltIn } from "@/lib/course-info"

const PALETTE = ["#DC2626", "#2563EB", "#EA580C", "#7C3AED", "#16A34A", "#0891B2", "#DB2777", "#CA8A04", "#4F46E5", "#0F766E"]
const STALE_AFTER_MS = 24 * 3_600_000

// ── Storage ─────────────────────────────────────────────────────────────
let ready = false
async function ensureTables() {
  if (ready) return
  await sql`
    CREATE TABLE IF NOT EXISTS user_catalog (
      email         TEXT PRIMARY KEY,
      data          JSONB NOT NULL,
      report        JSONB,
      discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS course_overrides (
      email       TEXT NOT NULL,
      term        TEXT NOT NULL,
      course_code TEXT NOT NULL,
      weights     JSONB,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (email, term, course_code)
    )
  `
  ready = true
}

async function readStored(email: string): Promise<{ data: Catalog; report: unknown; discovered_at: string } | null> {
  await ensureTables()
  const rows = await sql`SELECT data, report, discovered_at FROM user_catalog WHERE email = ${email.toLowerCase()}`
  return (rows[0] as any) ?? null
}

async function readOverrides(email: string) {
  await ensureTables()
  const rows = await sql`SELECT term, course_code, weights FROM course_overrides WHERE email = ${email.toLowerCase()} AND weights IS NOT NULL`
  return rows.map((r: any) => ({ term: r.term, course_code: r.course_code, weights: (r.weights as number[]).map(Number) }))
}

export async function saveWeightOverride(email: string, term: string, courseCode: string, weights: number[] | null) {
  await ensureTables()
  if (weights === null) {
    await sql`DELETE FROM course_overrides WHERE email = ${email.toLowerCase()} AND term = ${term} AND course_code = ${courseCode}`
    return
  }
  await sql`
    INSERT INTO course_overrides (email, term, course_code, weights)
    VALUES (${email.toLowerCase()}, ${term}, ${courseCode}, ${JSON.stringify(weights)}::jsonb)
    ON CONFLICT (email, term, course_code) DO UPDATE SET weights = EXCLUDED.weights, updated_at = now()
  `
}

// The catalogue the app and the background jobs use for this person
export async function getCatalog(email: string, opts: { refreshIfStale?: boolean } = {}): Promise<Catalog> {
  const user = await getUser(email)
  let stored = await readStored(email).catch(() => null)
  const stale = !stored || Date.now() - new Date(stored.discovered_at).getTime() > STALE_AFTER_MS
  if (opts.refreshIfStale && stale && (await getCanvasToken(email))) {
    await discoverCatalog(email).catch(err => console.error(`Catalog discovery ${email}:`, err))
    stored = await readStored(email).catch(() => stored)
  }
  const discovered = stored ? { ...stored.data, discoveredAt: stored.discovered_at } : null
  if (user?.legacy_catalog) await seedFromBuiltIn().catch(err => console.error("Seed course info:", err))
  const base = user?.legacy_catalog ? mergeBuiltIn(discovered) : discovered ?? EMPTY_CATALOG
  const withInfo = await applyCourseInfo(base).catch(err => { console.error("Course info:", err); return base })
  return applyWeightOverrides(withInfo, await readOverrides(email).catch(() => []))
}

export async function getDiscoveryReport(email: string) {
  return (await readStored(email).catch(() => null))?.report ?? null
}

// ── Canvas helpers ──────────────────────────────────────────────────────
// Canvas rate-limits bursts (HTTP 429): retry with a growing pause
async function canvasFetch(url: string, token: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
    if (res.status !== 429 || attempt >= 4) return res
    const wait = Number(res.headers.get("retry-after")) * 1000 || 800 * 2 ** attempt
    await new Promise(r => setTimeout(r, Math.min(wait, 8000)))
  }
}

// Runs fn over items with at most `limit` running at the same time
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++])
  }))
}

async function canvasAll(path: string, token: string): Promise<any[]> {
  const out: any[] = []
  let url: string | null = `https://${process.env.CANVAS_DOMAIN}/api/v1${path}${path.includes("?") ? "&" : "?"}per_page=100`
  for (let page = 0; url && page < 10; page++) {
    const res: Response = await canvasFetch(url, token)
    if (!res.ok) throw new Error(`Canvas ${res.status} ${path}`)
    const data = await res.json()
    if (!Array.isArray(data)) return [data]
    out.push(...data)
    url = res.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null
  }
  return out
}
async function canvasOne(path: string, token: string): Promise<any> {
  const res = await canvasFetch(`https://${process.env.CANVAS_DOMAIN}/api/v1${path}`, token)
  if (!res.ok) throw new Error(`Canvas ${res.status} ${path}`)
  return res.json()
}

const stripHtml = (html: string | null | undefined) =>
  (html ?? "").replace(/<br\s*\/?>|<\/(p|li|tr|h\d|div)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ")

const ASSESSMENT_RE = /\bAssessment\s*(\d+)/i
const NOT_ASSESSMENT_RE = /re-?assessment|resit|re-?sit|extra bonus/i
const PRACTICE_RE = /\bpractice\b/i
const BONUS_RE = /extra bonus/i

// "COMP-3001", "COMP 3001", "CS101" … → normalised code
function courseCodeOf(c: any): string | null {
  for (const s of [c.course_code, c.name, c.sis_course_id]) {
    const m = String(s ?? "").match(/\b([A-Z]{2,6})[-\s_]?(\d{3,4})\b/)
    if (m) return `${m[1]}-${m[2]}`
  }
  return null
}

// Label used in the app's term switcher
function termLabelOf(c: any, code: string | null): string {
  const tn: string = c.term?.name ?? ""
  const t = tn.match(/\bTerm\s*(\d+)/i)
  if (t) return `Term ${t[1]}`
  const m = code?.match(/-(\d)\d{2,3}$/)
  if (m && +m[1] >= 1 && +m[1] <= 9) return `Term ${m[1]}`
  return tn && !/default/i.test(tn) ? tn : "Other"
}

const cleanName = (name: string, code: string | null) =>
  name.replace(code ? new RegExp(`\\b${code.replace("-", "[-\\s_]?")}\\b\\s*[-–:|]?\\s*`, "i") : /^$/, "").trim() || name

const mondayOf = (iso: string) => {
  const d = new Date(iso)
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)))
  return m.toISOString().slice(0, 10)
}

const fmtDeadline = (iso: string | null) => {
  if (!iso) return "TBD"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Europe/Malta" })
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const near100 = (a: number[]) => a.length > 0 && a.every(n => n > 0) && Math.abs(sum(a) - 100) <= 1

// ── Weights: try the most reliable source first ─────────────────────────
function inferWeights(
  slots: { idx: number; a: any }[],
  groups: any[],
  applyGroupWeights: boolean,
  syllabus: string,
): { weights: number[]; source: WeightSource } {
  const n = slots.length

  // 1. Each assessment in its own weighted assignment group
  if (applyGroupWeights) {
    const groupIds = slots.map(s => s.a?.assignment_group_id)
    const distinct = new Set(groupIds).size === n
    const gw = groupIds.map(id => Number(groups.find(g => g.id === id)?.group_weight ?? 0))
    if (distinct && near100(gw)) return { weights: gw, source: "canvas-groups" }
  }

  // 2. "(30%)" in the assessment title, or "weight … 30%" in its description
  const fromText = slots.map(s => {
    const inName = String(s.a?.name ?? "").match(/(\d{1,3}(?:\.\d+)?)\s*%/)
    if (inName) return Number(inName[1])
    const d = stripHtml(s.a?.description)
    const inDesc = d.match(/weigh\w*[^%\d]{0,40}(\d{1,3}(?:\.\d+)?)\s*%/i) ?? d.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:of (?:the|your) (?:final|overall|course|total)|weight)/i)
    return inDesc ? Number(inDesc[1]) : NaN
  })
  if (near100(fromText)) return { weights: fromText, source: "description" }

  // 3. Syllabus page: "Assessment 1 … 30%"
  if (syllabus) {
    const fromSyl = slots.map(s => {
      const m = syllabus.match(new RegExp(`Assessment\\s*${s.idx + 1}\\b[^%\\n]{0,160}?(\\d{1,3}(?:\\.\\d+)?)\\s*%`, "i"))
      return m ? Number(m[1]) : NaN
    })
    if (near100(fromSyl)) return { weights: fromSyl, source: "syllabus" }
  }

  // 4. Points that add up to 100
  const pts = slots.map(s => Number(s.a?.points_possible ?? 0))
  if (near100(pts) && new Set(pts).size > 1) return { weights: pts, source: "points" }

  // 5. Equal split — flagged so the person reviews it
  const base = Math.floor(100 / n), extra = 100 - base * n
  return { weights: slots.map((_, i) => base + (i < extra ? 1 : 0)), source: "estimated" }
}

// Live session + Zoom details from the syllabus (best effort)
function liveFromSyllabus(syllabus: string) {
  const near = (re: RegExp, span = 260) => {
    const i = syllabus.search(re)
    return i >= 0 ? syllabus.slice(i, i + span) : ""
  }
  const slotRe = /((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*s?\s+\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})/i
  const live = near(/live\s+(session|lecture|class)/i).match(slotRe)?.[1] ?? ""
  const office = near(/office\s+hours?/i).match(slotRe)?.[1] ?? ""
  const meeting = syllabus.match(/zoom\.us\/j\/(\d{9,11})/i)?.[1] ?? syllabus.match(/meeting\s*id[:\s]*([\d\s]{9,14})/i)?.[1]?.replace(/\s+/g, "") ?? ""
  const passcode = syllabus.match(/pass(?:code|word)[:\s]*([A-Za-z0-9.!@#$%^&*]{4,20})/i)?.[1] ?? ""
  return { live, office, meeting, passcode }
}

// ── Discovery ───────────────────────────────────────────────────────────
type CourseReport = { term: string; code: string; name: string; role: string; assessments: number; practices: number; weights: number[]; weightSource: WeightSource; liveSession: string; error?: string }

export async function discoverCatalog(email: string): Promise<{ catalog: Catalog; report: CourseReport[] }> {
  await ensureTables()
  const token = await getCanvasToken(email)
  if (!token) throw new Error("Connect Canvas first")

  // Current + past courses
  const [activeC, doneC] = await Promise.all([
    canvasAll(`/courses?enrollment_state=active&include[]=term`, token),
    canvasAll(`/courses?enrollment_state=completed&include[]=term`, token).catch(() => []),
  ])
  const seen = new Set<number>()
  const courses = [...activeC.map(c => ({ ...c, _active: true })), ...doneC.map(c => ({ ...c, _active: false }))]
    .filter(c => c?.id && !c.access_restricted_by_date && !seen.has(c.id) && seen.add(c.id))

  const report: CourseReport[] = []
  const terms: Record<string, CatalogTerm & { _starts: string[]; _active: boolean }> = {}
  let teaches = 0, studies = 0

  await pool(courses, 4, async (c: any) => {
    let code = courseCodeOf(c) ?? `C-${c.id}`
    const label = termLabelOf(c, courseCodeOf(c))
    const types: string[] = (c.enrollments ?? []).map((e: any) => String(e.type ?? e.role ?? "").toLowerCase())
    const role = types.some(t => /teacher|ta|designer/.test(t)) ? "teacher" : "student"
    try {
      const [groups, detail, teachers] = await Promise.all([
        canvasAll(`/courses/${c.id}/assignment_groups?include[]=assignments`, token),
        canvasOne(`/courses/${c.id}?include[]=syllabus_body`, token).catch(() => ({})),
        canvasAll(`/courses/${c.id}/users?enrollment_type[]=teacher&include[]=email`, token).catch(() => []),
      ])
      const assignments: any[] = groups.flatMap((g: any) => (g.assignments ?? []).map((a: any) => ({ ...a, assignment_group_id: a.assignment_group_id ?? g.id })))

      // Assessments: one per number, in order (gaps keep a placeholder so indexes match Canvas)
      const byIdx = new Map<number, any>()
      for (const a of assignments) {
        const name = String(a.name ?? "")
        const m = name.match(ASSESSMENT_RE)
        if (!m || NOT_ASSESSMENT_RE.test(name) || !(a.points_possible > 0)) continue
        const idx = parseInt(m[1], 10) - 1
        if (idx < 0 || idx > 11) continue
        if (!byIdx.has(idx) || (!byIdx.get(idx).due_at && a.due_at)) byIdx.set(idx, a)
      }
      const practices: Practice[] = assignments
        .filter(a => PRACTICE_RE.test(a.name ?? "") && !BONUS_RE.test(a.name ?? ""))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(a => ({ id: `cv-p-${a.id}`, title: a.name, course: c.name, courseCode: code, type: /quiz/i.test(a.name) || a.is_quiz_assignment ? "quiz" : "assignment", completed: false }))

      // Skip community/orientation spaces with nothing to track
      if (byIdx.size === 0 && practices.length === 0 && role === "student") return
      role === "teacher" ? teaches++ : studies++

      // Same course code twice in one term (e.g. a professor teaching two intakes) → keep both apart
      const t = (terms[label] ??= { start: null, courses: [], weights: {}, weightSource: {}, assessments: [], practices: [], professors: [], _starts: [], _active: false })
      if (t.courses.some(x => x.code === code)) code = `${code}-${c.id}`
      practices.forEach(p => { p.courseCode = code })
      t.courses.push({ code, name: String(c.name ?? code), color: "", canvasId: c.id } as CatalogCourse)

      const count = byIdx.size ? Math.max(...byIdx.keys()) + 1 : 0
      const slots = Array.from({ length: count }, (_, idx) => ({ idx, a: byIdx.get(idx) ?? null }))
      const syllabus = stripHtml(detail.syllabus_body)
      // If the course details didn't load, still trust weighted groups (they must add up to 100)
      const groupWeighted = detail.apply_assignment_group_weights ?? true
      const { weights, source } = count ? inferWeights(slots, groups, !!groupWeighted, syllabus) : { weights: [], source: "estimated" as WeightSource }
      const name = cleanName(String(c.name ?? code), courseCodeOf(c))

      const assessments: CatalogAssessment[] = slots.map(({ idx, a }) => ({
        id: a ? `cv-a-${a.id}` : `cv-a-${c.id}-${idx + 1}`,
        title: `Assessment ${idx + 1}`,
        course: name, courseCode: code,
        deadline: fmtDeadline(a?.due_at ?? null),
        weight: `${weights[idx]}%`,
        status: "todo",
        dueAt: a?.due_at ?? null, unlockAt: a?.unlock_at ?? null, url: a?.html_url ?? null,
      }))

      const live = liveFromSyllabus(syllabus)
      const t0 = teachers[0]
      const professor: Professor | null = t0 || live.live ? {
        name: t0?.name ?? "", email: t0?.email ?? t0?.login_id ?? "",
        courseCode: code, courseName: name,
        liveSessions: live.live, meetingId: live.meeting, passcode: live.passcode, recordingPassword: "",
        officeHours: live.office, tutors: teachers.slice(1).map((t: any) => t.name).filter(Boolean),
      } : null

      const start = c.start_at ?? c.term?.start_at
      if (start) t._starts.push(start)
      if (c._active) t._active = true
      t.courses.find(x => x.canvasId === c.id)!.name = name
      if (count) { t.weights[code] = weights; t.weightSource[code] = source }
      t.assessments.push(...assessments)
      t.practices.push(...practices)
      if (professor) t.professors.push(professor)
      report.push({ term: label, code, name, role, assessments: count, practices: practices.length, weights, weightSource: source, liveSession: live.live })
    } catch (err) {
      report.push({ term: label, code, name: c.name, role, assessments: 0, practices: 0, weights: [], weightSource: "estimated", liveSession: "", error: String(err) })
    }
  })

  // Order terms and courses; colours by position; week-1 Monday from the earliest start date
  const ordered = Object.entries(terms).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  const out: Record<string, CatalogTerm> = {}
  for (const [label, { _starts, _active, ...t }] of ordered) {
    t.courses.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    t.courses.forEach((c, i) => { c.color = PALETTE[i % PALETTE.length] })
    t.start = _starts.length ? mondayOf(_starts.sort()[0]) : null
    out[label] = t
  }
  const catalog: Catalog = {
    source: "canvas",
    defaultTerm: pickCurrentTerm(out, ordered.filter(([, t]) => t._active).map(([n]) => n)),
    terms: out,
    role: teaches > 0 && studies === 0 ? "teacher" : studies > 0 ? "student" : null,
  }

  await sql`
    INSERT INTO user_catalog (email, data, report, discovered_at)
    VALUES (${email.toLowerCase()}, ${JSON.stringify(catalog)}::jsonb, ${JSON.stringify(report)}::jsonb, now())
    ON CONFLICT (email) DO UPDATE SET data = EXCLUDED.data, report = EXCLUDED.report, discovered_at = now()
  `
  // First discovery decides the role (professors only teach; students only study)
  const user = await getUser(email)
  if (user && !user.onboarded_at && catalog.role && catalog.role !== user.role) await updateUser(email, { role: catalog.role })
  return { catalog, report }
}

// Current term = the latest one that has already started (a week of grace for
// courses Canvas opens early); otherwise the next to start; otherwise the last.
function pickCurrentTerm(terms: Record<string, CatalogTerm>, active: string[], now = Date.now()) {
  const names = active.length ? active : Object.keys(terms)
  const dated = names.filter(n => terms[n].start).map(n => ({ n, t: new Date(terms[n].start!).getTime() }))
  const started = dated.filter(d => d.t <= now + 7 * 86_400_000).sort((a, b) => b.t - a.t)
  if (started[0]) return started[0].n
  const upcoming = dated.sort((a, b) => a.t - b.t)
  return upcoming[0]?.n ?? names[names.length - 1] ?? ""
}

// For the original owner: compares what Canvas discovery found with the
// hand-entered weights, to prove discovery works before colleagues rely on it.
export function compareWithBuiltIn(discovered: Catalog) {
  const rows: { term: string; code: string; builtIn: number[] | null; canvas: number[] | null; source: string; match: boolean }[] = []
  for (const [term, t] of Object.entries(BUILT_IN.terms)) {
    for (const [code, w] of Object.entries(t.weights)) {
      const d = discovered.terms[term]?.weights[code] ?? null
      rows.push({ term, code, builtIn: w, canvas: d, source: discovered.terms[term]?.weightSource[code] ?? "not found", match: !!d && d.length === w.length && d.every((x, i) => Math.abs(x - w[i]) < 0.5) })
    }
  }
  return { matched: rows.filter(r => r.match).length, total: rows.length, rows }
}

// Pure helpers exposed for tests
export const __test = { pickCurrentTerm, inferWeights, courseCodeOf, termLabelOf, liveFromSyllabus, cleanName, mondayOf, fmtDeadline, stripHtml }
