// lib/academic.ts
// Pure helpers shared by every screen (Today, Courses, Grades, Plan).
// One place for dates, live sessions, grades and bonus maths.
import { initialPractices, initialAssessments, TERM_PROFESSORS, TERM_COURSES, type Term, type Professor } from "@/lib/store"
import { GRADE_WEIGHTS, courseStats } from "@/lib/grades"

// First live-session week of each term (used for week numbers and year inference)
export const TERM_START: Record<string, string> = {
  "Term 1": "2025-09-15",
  "Term 2": "2026-01-12",
  "Term 3": "2026-09-21",
}
export const TERM_WEEKS = 16
export const LIVE_SESSIONS_PER_COURSE = 13
export const LIVE_NEEDED = 7
export const BONUS_MAX = 110

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

// "Nov 22" / "Jan 10, 2027" / "TBD" → Date (end of that day) or null
export function parseDeadline(text: string, term: string): Date | null {
  const m = text.trim().match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2})(?:,\s*(\d{4}))?/)
  if (!m) return null
  const month = MONTHS[m[1].toLowerCase()]
  if (month === undefined) return null
  const start = new Date(TERM_START[term] ?? Date.now())
  let year = m[3] ? parseInt(m[3]) : start.getFullYear()
  let d = new Date(year, month, parseInt(m[2]), 23, 59)
  if (!m[3] && d.getTime() < start.getTime() - 30 * 86_400_000) d = new Date(year + 1, month, parseInt(m[2]), 23, 59)
  return d
}

export function daysUntil(date: Date, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function termWeek(term: string, now = new Date()) {
  const start = TERM_START[term]
  if (!start) return null
  const w = Math.floor((now.getTime() - new Date(start).getTime()) / (7 * 86_400_000)) + 1
  return Math.min(Math.max(w, 1), TERM_WEEKS)
}

// ── Live sessions ───────────────────────────────────────────────────────
const WEEKDAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

export type LiveSlot = { weekday: number; startH: number; startM: number; endH: number; endM: number }

// "Mondays 12:00–13:30 (Malta)" → slot (Malta and Brussels share the same time zone)
export function parseLiveSession(text: string): LiveSlot | null {
  const m = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/i)
  if (!m) return null
  return { weekday: WEEKDAYS[m[1].toLowerCase()], startH: +m[2], startM: +m[3], endH: +m[4], endM: +m[5] }
}

export type UpcomingSession = { professor: Professor; start: Date; end: Date; live: boolean }

export function nextSessions(term: string, now = new Date(), count = 7): UpcomingSession[] {
  const out: UpcomingSession[] = []
  for (const p of TERM_PROFESSORS[term] ?? []) {
    const slot = parseLiveSession(p.liveSessions)
    if (!slot) continue
    for (let add = 0; add < 14; add++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add)
      if (day.getDay() !== slot.weekday) continue
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.startH, slot.startM)
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.endH, slot.endM)
      if (end.getTime() > now.getTime()) out.push({ professor: p, start, end, live: start.getTime() <= now.getTime() })
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, count)
}

export function zoomUrl(meetingId: string) {
  return `https://zoom.us/j/${meetingId.replace(/\s+/g, "")}`
}

export function formatCountdown(target: Date, now = new Date()) {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return "Live now"
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Course data ─────────────────────────────────────────────────────────
export const coursesOf = (term: string) => TERM_COURSES[term as Term] ?? []
export const professorOf = (term: string, code: string) => (TERM_PROFESSORS[term] ?? []).find(p => p.courseCode === code)
export const practicesOf = (code: string) => initialPractices.filter(p => p.courseCode === code)
export const assessmentsOf = (code: string) => initialAssessments.filter(a => a.courseCode === code)

export type Bonus = { live: boolean | null; practices: boolean | null }

export type AcademicState = {
  scores: Record<string, Record<string, (number | null)[]>>          // term -> code -> scores per assessment
  official: Record<string, Record<string, Bonus>>                    // term -> code -> Canvas bonus
  attendance: Record<string, Record<number, string>>                 // code -> lesson -> "present" | "absent"
  practicesDone: Set<string>
  assessmentStatus: Record<string, "todo" | "in-progress" | "done">
}

export function attendedCount(state: AcademicState, code: string) {
  return Object.values(state.attendance[code] ?? {}).filter(s => s === "present").length
}

export function bonusInfo(state: AcademicState, term: string, code: string) {
  const off = state.official[term]?.[code]
  const attended = attendedCount(state, code)
  const practices = practicesOf(code)
  const done = practices.filter(p => state.practicesDone.has(p.id)).length
  const live = off?.live ?? attended >= LIVE_NEEDED
  const prac = off?.practices ?? (practices.length > 0 && done === practices.length)
  return {
    live, prac, attended, done, totalPractices: practices.length,
    liveOfficial: off?.live != null, pracOfficial: off?.practices != null,
    points: (live ? 5 : 0) + (prac ? 5 : 0),
  }
}

export function courseResult(state: AcademicState, term: string, code: string) {
  const weights = GRADE_WEIGHTS[term]?.[code] ?? []
  const scores = state.scores[term]?.[code] ?? weights.map(() => null)
  const st = courseStats(weights, scores)
  const bonus = bonusInfo(state, term, code)
  const total = st.average !== null ? Math.min(BONUS_MAX, st.average + bonus.points) : null
  // average needed on remaining assessments for the course to reach `target` (bonus included)
  const neededFor = (target: number) =>
    st.remainingWeight > 0 ? ((target - st.earned - bonus.points) / st.remainingWeight) * 100 : null
  return { weights, scores, ...st, bonus, total, neededFor }
}

export function termResult(state: AcademicState, term: string) {
  const codes = Object.keys(GRADE_WEIGHTS[term] ?? {})
  const results = codes.map(c => courseResult(state, term, c))
  const totals = results.map(r => r.total).filter((v): v is number => v !== null)
  const raws = results.map(r => r.average).filter((v): v is number => v !== null)
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
  return {
    average: mean(totals), rawAverage: mean(raws),
    graded: results.reduce((n, r) => n + r.scores.filter(s => s !== null).length, 0),
    total: results.reduce((n, r) => n + r.weights.length, 0),
  }
}
