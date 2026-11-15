"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, CircleDashed, Trash2, Check, Radio, CheckSquare } from "lucide-react"
import { getGrade } from "@/lib/grades"
import {
  coursesOf, assessmentsOf, practicesOf, professorOf, parseDeadline, daysUntil, courseResult,
  LIVE_SESSIONS_PER_COURSE, LIVE_NEEDED,
} from "@/lib/academic"
import type { Academic } from "@/hooks/use-academic"
import { CourseInfoCard } from "@/components/app/course-info-card"
import { tint } from "@/components/app/today-view"
import { useCatalog } from "@/components/app/catalog-gate"

const muted = "text-[hsl(var(--muted-foreground))]"
const fg = "text-[hsl(var(--foreground))]"
const card = "rounded-3xl bg-card"
const TARGET = 90

type Status = "todo" | "in-progress" | "done"
const nextStatus: Record<Status, Status> = { "todo": "in-progress", "in-progress": "done", "done": "todo" }

export function CoursesView({ term, academic, course, onSelectCourse }: {
  term: string; academic: Academic; course: string | null; onSelectCourse: (code: string) => void
}) {
  const { state, toggleAttendance, togglePractice, setAssessmentStatus } = academic
  useCatalog() // re-render when shared course info changes
  const courses = coursesOf(term)
  const selected = courses.find(c => c.code === course) ?? courses[0]
  const now = new Date()

  if (!selected) return <p className={`text-sm ${muted}`}>No courses configured for {term}.</p>

  const r = courseResult(state, term, selected.code)
  const prof = professorOf(term, selected.code)
  const practices = practicesOf(selected.code)
  const attendance = state.attendance[selected.code] ?? {}

  return (
    <div className="flex flex-col gap-3.5">
      {/* Course switcher — Bento pills, selected one tinted with its course colour */}
      <div className="flex flex-wrap gap-2">
        {courses.map(c => {
          const cr = courseResult(state, term, c.code)
          const active = c.code === selected.code
          return (
            <button key={c.code} onClick={() => onSelectCourse(c.code)} aria-pressed={active}
              className={`flex items-center gap-2 font-display text-[13px] px-3.5 py-2 rounded-2xl transition-all ${active ? "font-semibold ring-2 ring-[hsl(var(--foreground))]" : "font-medium bg-card hover:-translate-y-0.5"}`}
              style={active ? { background: tint(c.color, 30) } : undefined}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="tabular">{c.code.split("-").pop()}</span>
              <span className="hidden sm:inline">{c.name}</span>
              {cr.total !== null && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-lg bg-[hsl(var(--card)/0.7)] tabular">{cr.total.toFixed(0)}</span>}
            </button>
          )
        })}
      </div>

      {/* Course hero tile */}
      <section className="rounded-3xl p-6 sm:p-7 flex flex-wrap items-end justify-between gap-4" style={{ background: tint(selected.color, 24) }}>
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold tracking-wider uppercase">{selected.code} · {term}</p>
          <h1 className="font-display text-[30px] sm:text-[36px] leading-tight font-semibold mt-1">{selected.name}</h1>
          {prof && (prof.name || prof.liveSessions) && <p className="text-sm mt-1 opacity-80">{[prof.name, prof.liveSessions?.replace(" (Malta)", "")].filter(Boolean).join(" · ")}</p>}
        </div>
        <div className="text-right">
          <p className="font-display font-bold tabular text-[56px] leading-[0.9] tracking-[-0.04em]">
            {r.total !== null ? r.total.toFixed(1) : <span className="text-2xl font-medium opacity-60">no grade yet</span>}
          </p>
          {r.total !== null && <p className="text-[13px] mt-2 font-medium">{getGrade(r.total).letter} · {r.average!.toFixed(1)} + {r.bonus.points} bonus</p>}
        </div>
      </section>

      <div className="grid gap-3.5 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Assessments */}
        <div className={`${card} p-5 sm:p-6`}>
          <p className="font-display font-semibold mb-2">Assessments</p>
          {assessmentsOf(selected.code).map((a, idx) => {
            const score = r.scores[idx]
            const status: Status = state.assessmentStatus[a.id] ?? a.status
            const date = parseDeadline(a.deadline, term)
            const days = date ? daysUntil(date, now) : null
            const needed = r.neededFor(TARGET)
            const Icon = score != null || status === "done" ? CheckCircle2 : status === "in-progress" ? Clock : CircleDashed
            const iconColor = score != null || status === "done" ? "text-emerald-400" : status === "in-progress" ? "text-amber-400" : muted
            return (
              <div key={a.id} className="flex items-center gap-3 py-3 border-t border-border first-of-type:border-t-0">
                <button title={`Status: ${status} (click to change)`} onClick={() => setAssessmentStatus(a.id, nextStatus[status])}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${fg}`}>{a.title}</p>
                  <p className={`text-[11px] ${muted}`}>
                    {r.weights[idx] ?? a.weight}% · {date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : a.deadline}
                    {score == null && days !== null && (days >= 0 ? ` · ${days === 0 ? "due today" : `${days} days left`}` : status === "done" ? " · submitted, awaiting grade" : ` · ${-days} days ago`)}
                  </p>
                </div>
                {score != null ? (
                  <span className="font-display font-bold tabular text-xl px-2.5 py-1 rounded-xl" style={{ background: tint(selected.color, 26) }}>{score}</span>
                ) : status === "done" ? (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[hsl(var(--muted))]">Awaiting grade</span>
                ) : needed !== null ? (
                  <span className={`text-[10px] ${needed > 100 ? "text-[hsl(var(--destructive))]" : muted}`}>
                    {needed <= 0 ? `${TARGET} secured` : needed > 100 ? `${TARGET} not reachable` : `≥ ${Math.ceil(needed)} for ${TARGET}`}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Attendance — 13 live sessions */}
          <div className={`${card} p-5 sm:p-6`}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold flex items-center gap-1.5"><Radio className="h-4 w-4" /> Live sessions</p>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.bonus.live ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]" : `bg-[hsl(var(--muted))] ${muted}`}`}>
                {r.bonus.attended}/{LIVE_SESSIONS_PER_COURSE} · {r.bonus.live ? "+5 ✓" : `${LIVE_NEEDED - r.bonus.attended} more for +5`}
              </span>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${LIVE_SESSIONS_PER_COURSE}, minmax(0, 1fr))` }}>
              {Array.from({ length: LIVE_SESSIONS_PER_COURSE }, (_, i) => i + 1).map(n => {
                const st = attendance[n]
                return (
                  <button key={n} onClick={() => toggleAttendance(selected.code, n)} title={`Session ${n}: ${st ?? "not marked"} (click to toggle)`}
                    className={`aspect-square rounded-xl font-display text-xs font-semibold tabular flex items-center justify-center transition-transform active:scale-90 ${st === "present" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : st === "absent" ? "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]" : `bg-[hsl(var(--muted))] ${muted}`}`}>
                    {n}
                  </button>
                )
              })}
            </div>
            <p className={`text-[10px] mt-2 ${muted}`}>Tap a session to mark it attended (live only counts for the bonus).</p>
          </div>

          {/* Practices */}
          <div className={`${card} p-5 sm:p-6`}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold flex items-center gap-1.5"><CheckSquare className="h-4 w-4" /> Practices</p>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.bonus.prac ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]" : `bg-[hsl(var(--muted))] ${muted}`}`}>
                {r.bonus.done}/{r.bonus.totalPractices} · {r.bonus.prac ? "+5 ✓" : `${r.bonus.totalPractices - r.bonus.done} left for +5`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all" style={{ width: `${r.bonus.totalPractices ? (r.bonus.done / r.bonus.totalPractices) * 100 : 0}%`, backgroundColor: selected.color }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-x-3 gap-y-0.5 max-h-60 overflow-y-auto pr-1">
              {practices.map(p => {
                const done = state.practicesDone.has(p.id)
                return (
                  <button key={p.id} onClick={() => togglePractice(p.id)} className="flex items-center gap-2 py-1 text-left">
                    <span className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-[hsl(var(--foreground))]" : "bg-[hsl(var(--muted))]"}`}>
                      {done && <Check className="h-3 w-3 text-[hsl(var(--background))]" />}
                    </span>
                    <span className={`text-xs truncate ${done ? `${muted} line-through` : fg}`}>{p.title}</span>
                  </button>
                )
              })}
              {practices.length === 0 && <p className={`text-xs ${muted}`}>No practices listed for this course.</p>}
            </div>
          </div>
        </div>
      </div>

      <CourseInfoCard term={term} code={selected.code} />

      <TermNotes term={term} />
    </div>
  )
}

function TermNotes({ term }: { term: string }) {
  const [notes, setNotes] = useState<{ id: number; content: string; createdAt: string }[]>([])
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/user/notes?term=${encodeURIComponent(term)}`).then(r => (r.ok ? r.json() : [])).then(d => Array.isArray(d) && setNotes(d)).catch(() => {})
  }, [term])

  const add = async () => {
    if (!text.trim()) return
    setError(null)
    try {
      const res = await fetch("/api/user/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text.trim(), term }) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNotes(prev => [{ id: data.id, content: text.trim(), createdAt: new Date().toISOString() }, ...prev])
      setText("")
    } catch { setError("Note NOT saved. Try again.") }
  }
  const remove = async (id: number) => {
    const res = await fetch("/api/user/notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null)
    if (res?.ok) setNotes(prev => prev.filter(n => n.id !== id)); else setError("Couldn't delete that note.")
  }

  return (
    <div className={`${card} p-5 sm:p-6`}>
      <p className="font-display font-semibold mb-3">{term} notes</p>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Write a note and press Enter"
          className="flex-1 text-sm rounded-xl px-3 py-2 bg-[hsl(var(--muted))] outline-none focus:ring-2 focus:ring-[hsl(var(--foreground))]" />
        <button onClick={add} className="font-display text-sm font-semibold px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Add</button>
      </div>
      {error && <p className="text-[11px] mt-1 text-[hsl(var(--destructive))]">{error}</p>}
      <div className="mt-2 flex flex-col">
        {notes.map(n => (
          <div key={n.id} className="group flex items-start justify-between gap-2 py-1.5 border-t border-border">
            <p className={`text-xs whitespace-pre-wrap ${fg}`}>{n.content}</p>
            <button onClick={() => remove(n.id)} aria-label="Delete note" className={`opacity-0 group-hover:opacity-100 ${muted} hover:text-[hsl(var(--destructive))]`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
