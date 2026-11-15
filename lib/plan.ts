// lib/plan.ts
// Builds the term's timeline: deadlines (Canvas dates when available), the
// 13 weekly live sessions, office hours and your personal events.
// Pure functions — used by the Plan screen AND the calendar subscription feed.
import { TERM_PROFESSORS } from "@/lib/store"
import { coursesOf, assessmentsOf, parseDeadline, parseLiveSession, TERM_START, LIVE_SESSIONS_PER_COURSE } from "@/lib/academic"

export type CanvasDates = Record<string, { idx: number; dueAt?: string | null; unlockAt?: string | null; url?: string | null }[]>

export type PlanItem = {
  id: string
  kind: "deadline" | "session" | "office" | "personal"
  courseCode: string | null
  title: string
  start: Date            // for deadlines: the due moment
  end: Date
  allDay?: boolean
  windowStart?: Date     // deadlines: when work can start (Canvas unlock date or 14 days before)
  weight?: string
  assessmentId?: string
  assessmentIdx?: number
  url?: string | null
  sessionNumber?: number
  personalId?: number
  exact?: boolean        // true = real instant from Canvas (UTC); false = Malta wall-clock time
}

export type PersonalEvent = { id: number; title: string; startDate: string | Date; endDate?: string | Date | null; type?: string; courseCode?: string | null }

// "2026-11-20", "2026-11-20T00:00:00.000Z" or a Date → "2026-11-20"
const ymd = (v: string | Date) => (typeof v === "string" ? v.slice(0, 10) : new Date(v.getTime() - v.getTimezoneOffset() * 60_000).toISOString().slice(0, 10))

const DAY = 86_400_000
const atTime = (d: Date, h: number, m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m)
// Calendar-day arithmetic (adding 24h × n breaks across daylight-saving changes)
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export function termMonday(term: string) {
  const s = new Date(`${TERM_START[term]}T00:00:00`)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - ((s.getDay() + 6) % 7))
}

export function buildPlan(term: string, canvas: CanvasDates = {}, personal: PersonalEvent[] = []): PlanItem[] {
  const items: PlanItem[] = []
  const monday = termMonday(term)

  for (const c of coursesOf(term)) {
    // Deadlines — Canvas dates win over the hard-coded ones
    assessmentsOf(c.code).forEach((a, idx) => {
      const cv = canvas[c.code]?.find(x => x.idx === idx)
      const due = cv?.dueAt ? new Date(cv.dueAt) : parseDeadline(a.deadline, term)
      if (!due) return
      const unlock = cv?.unlockAt ? new Date(cv.unlockAt) : new Date(due.getTime() - 14 * DAY)
      items.push({
        id: `dl-${a.id}`, kind: "deadline", courseCode: c.code, title: a.title,
        start: due, end: due, windowStart: unlock < due ? unlock : new Date(due.getTime() - 14 * DAY),
        weight: a.weight, assessmentId: a.id, assessmentIdx: idx, url: cv?.url ?? null, exact: !!cv?.dueAt,
      })
    })

    const prof = (TERM_PROFESSORS[term] ?? []).find(p => p.courseCode === c.code)
    if (!prof) continue

    // 13 weekly live sessions from week 1
    const slot = parseLiveSession(prof.liveSessions)
    if (slot) {
      for (let n = 1; n <= LIVE_SESSIONS_PER_COURSE; n++) {
        const day = addDays(monday, (n - 1) * 7 + ((slot.weekday + 6) % 7))
        items.push({
          id: `ls-${c.code}-${n}`, kind: "session", courseCode: c.code, title: `${c.name} · live session ${n}`,
          start: atTime(day, slot.startH, slot.startM), end: atTime(day, slot.endH, slot.endM), sessionNumber: n,
        })
      }
    }

    // Office hours: "Even weeks (2,4,6,8,10,12) · Saturdays 13:30–14:30"
    const oh = parseLiveSession(prof.officeHours)
    const weeks = prof.officeHours.match(/\(([\d,\s]+)\)/)?.[1].split(",").map(w => parseInt(w)).filter(Boolean) ?? []
    if (oh) for (const w of weeks) {
      const day = addDays(monday, (w - 1) * 7 + ((oh.weekday + 6) % 7))
      items.push({
        id: `oh-${c.code}-${w}`, kind: "office", courseCode: c.code, title: `${c.name} · office hours`,
        start: atTime(day, oh.startH, oh.startM), end: atTime(day, oh.endH, oh.endM),
      })
    }
  }

  for (const e of personal) {
    if (!e.startDate) continue
    const start = new Date(`${ymd(e.startDate)}T00:00:00`)
    const end = e.endDate ? new Date(`${ymd(e.endDate)}T23:59:00`) : atTime(start, 23, 59)
    items.push({ id: `pe-${e.id}`, kind: "personal", courseCode: e.courseCode ?? null, title: e.title, start, end, allDay: true, personalId: e.id })
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime())
}

// ── iCalendar (.ics) feed ────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0")
const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const utc = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
const dateOnly = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

// Dates in PlanItems are wall-clock times in Malta/Brussels (same zone).
// On the server (UTC) Date getters return those same wall-clock numbers
// because buildPlan creates them with the local constructor.
export function toICS(items: PlanItem[], name = "OPIT Tracker"): string {
  const stamp = utc(new Date())
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OPIT Tracker//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:Europe/Malta", "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "BEGIN:VTIMEZONE", "TZID:Europe/Malta",
    "BEGIN:STANDARD", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "END:STANDARD",
    "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "END:DAYLIGHT",
    "END:VTIMEZONE",
  ]
  for (const it of items) {
    lines.push("BEGIN:VEVENT", `UID:${it.id}@opit-tracker`, `DTSTAMP:${stamp}`)
    if (it.kind === "deadline") {
      const before = new Date(it.start.getTime() - 30 * 60_000)
      lines.push(...(it.exact
        ? [`DTSTART:${utc(before)}`, `DTEND:${utc(it.start)}`]
        : [`DTSTART;TZID=Europe/Malta:${local(before)}`, `DTEND;TZID=Europe/Malta:${local(it.start)}`]),
        `SUMMARY:${esc(`📌 ${it.courseCode} ${it.title} due (${it.weight ?? ""})`)}`)
      if (it.url) lines.push(`URL:${it.url}`)
      lines.push("BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", `DESCRIPTION:${esc(`${it.courseCode} ${it.title} due in 2 days`)}`, "END:VALARM")
    } else if (it.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(it.start)}`, `DTEND;VALUE=DATE:${dateOnly(new Date(it.end.getTime() + DAY))}`, `SUMMARY:${esc(it.title)}`)
    } else {
      lines.push(`DTSTART;TZID=Europe/Malta:${local(it.start)}`, `DTEND;TZID=Europe/Malta:${local(it.end)}`,
        `SUMMARY:${esc(it.kind === "session" ? `🎥 ${it.title}` : `💬 ${it.title}`)}`)
      if (it.kind === "session") lines.push("BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", `DESCRIPTION:${esc(it.title)} in 15 min`, "END:VALARM")
    }
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  // RFC 5545: CRLF line endings, lines folded at 75 octets
  return lines.map(l => (l.length > 74 ? l.match(/.{1,73}/g)!.join("\r\n ") : l)).join("\r\n") + "\r\n"
}
