"use client"

// Professors and staff: the courses they teach, what's due, the next live
// session, and the shared course info students rely on for reminders.
import { ExternalLink, Radio, CalendarClock, Users } from "lucide-react"
import { coursesOf, nextSessions, formatCountdown, daysUntil } from "@/lib/academic"
import { termData } from "@/lib/catalog"
import { useCatalog } from "@/components/app/catalog-gate"
import { CourseInfoCard } from "@/components/app/course-info-card"

const muted = "text-[hsl(var(--muted-foreground))]"
const fg = "text-[hsl(var(--foreground))]"
const CANVAS = "https://opit.instructure.com"
const fmt = (d: Date) => d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function TeacherView({ term }: { term: string }) {
  const { catalog } = useCatalog()
  const courses = coursesOf(term, catalog)
  const td = termData(term, catalog)
  const now = new Date()
  const sessions = nextSessions(term, now, 20, catalog)

  if (courses.length === 0) return <p className={`text-sm ${muted}`}>No courses found for {term} in your Canvas.</p>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className={`text-xl font-semibold ${fg}`}>Your courses · {term}</h1>
        <p className={`text-xs ${muted}`}>
          Students using OPIT Tracker get reminders and the Zoom button from the course info below. Keep the live-session time and Zoom details up to date and the whole class benefits.
        </p>
      </div>

      {courses.map(c => {
        const upcoming = td.assessments
          .filter(a => a.courseCode === c.code && a.dueAt && new Date(a.dueAt) > now)
          .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
        const past = td.assessments.filter(a => a.courseCode === c.code && a.dueAt && new Date(a.dueAt) <= now).length
        const next = sessions.find(s => s.professor.courseCode === c.code)
        const weights = td.weights[c.code] ?? []
        return (
          <div key={c.code} className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3" style={{ borderLeft: `3px solid ${c.color}` }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono font-semibold" style={{ color: c.color }}>{c.code}</p>
                <p className={`text-base font-semibold ${fg}`}>{c.name}</p>
                {weights.length > 0 && <p className={`text-[11px] ${muted}`}>Assessments: {weights.map((w, i) => `A${i + 1} ${w}%`).join(" · ")}</p>}
              </div>
              {c.canvasId && (
                <span className="flex gap-1.5 text-xs">
                  <a href={`${CANVAS}/courses/${c.canvasId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-[hsl(var(--muted))]"><ExternalLink className="h-3.5 w-3.5" /> Canvas</a>
                  <a href={`${CANVAS}/courses/${c.canvasId}/gradebook`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-[hsl(var(--muted))]"><Users className="h-3.5 w-3.5" /> Gradebook</a>
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[hsl(var(--muted)/0.4)] p-3">
                <p className={`text-[11px] font-medium flex items-center gap-1.5 ${muted}`}><Radio className="h-3.5 w-3.5" /> Next live session</p>
                {next
                  ? <p className={`text-sm ${fg}`}>{fmt(next.start)} <span className={`text-xs ${muted}`}>· {formatCountdown(next.start, now)}</span></p>
                  : <p className={`text-xs ${muted}`}>No time set yet — add it in the course info.</p>}
              </div>
              <div className="rounded-xl bg-[hsl(var(--muted)/0.4)] p-3">
                <p className={`text-[11px] font-medium flex items-center gap-1.5 ${muted}`}><CalendarClock className="h-3.5 w-3.5" /> Upcoming deadlines {past > 0 && <span>· {past} past</span>}</p>
                {upcoming.length === 0 && <p className={`text-xs ${muted}`}>Nothing due.</p>}
                {upcoming.slice(0, 3).map(a => {
                  const d = new Date(a.dueAt!)
                  return (
                    <p key={a.id} className={`text-xs ${fg} flex justify-between gap-2`}>
                      <span>{a.title} <span className={muted}>· {a.weight}</span></span>
                      <span className={muted}>{fmt(d)} · {daysUntil(d, now)}d</span>
                    </p>
                  )
                })}
              </div>
            </div>

            <CourseInfoCard term={term} code={c.code} />
          </div>
        )
      })}
    </div>
  )
}
