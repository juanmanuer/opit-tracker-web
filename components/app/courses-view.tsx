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
import { useCatalog } from "@/components/app/catalog-gate"

const muted = "text-[hsl(var(--muted-foreground))]"
const fg = "text-[hsl(var(--foreground))]"
const card = "rounded-2xl bg-card border border-border"
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
    <div className="flex flex-col gap-3">
      {/* Course chips — each tinted with its course colour, selected one solid */}
      <div className="flex flex-wrap gap-2">
        {courses.map(c => {
          const cr = courseResult(state, term, c.code)
          const active = c.code === selected.code
          return (
            <button key={c.code} onClick={() => onSelectCourse(c.code)}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border transition-all ${active ? "font-semibold shadow-sm scale-[1.03]" : "font-medium hover:brightness-110"}`}
              style={active
                ? { backgroundColor: c.color, borderColor: c.color, color: "#fff" }
                : { backgroundColor: c.color + "14", borderColor: c.color + "55", color: c.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? "#fff" : c.color }} />
              <span className="font-mono">{c.code.split("-")[1]}</span>
              <span className="hidden sm:inline">{c.name}</span>
              {cr.total !== null && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={active ? { backgroundColor: "rgba(255,255,255,0.22)" } : { backgroundColor: c.color + "22" }}>
                  {cr.total.toFixed(0)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono font-semibold" style={{ color: selected.color }}>{selected.code}</p>
          <h1 className={`text-xl font-semibold ${fg}`}>{selected.name}</h1>
          {prof && (prof.name || prof.liveSessions) && <p className={`text-xs ${muted}`}>{[prof.name, prof.liveSessions?.replace(" (Malta)", "")].filter(Boolean).join(" · ")}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold leading-none" style={{ color: r.total !== null ? getGrade(r.total).color : undefined }}>
            {r.total !== null ? r.total.toFixed(1) : <span className={muted}>—</span>}
          </p>
          <p className={`text-[11px] mt-1 ${muted}`}>
            {r.total !== null ? `${getGrade(r.total).letter} · ${r.average!.toFixed(1)} + ${r.bonus.points} bonus` : "no grades yet"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Assessments */}
        <div className={`${card} p-4`}>
          <p className={`text-sm font-medium mb-1 ${fg}`}>Assessments</p>
          {assessmentsOf(selected.code).map((a, idx) => {
            const score = r.scores[idx]
            const status: Status = state.assessmentStatus[a.id] ?? a.status
            const date = parseDeadline(a.deadline, term)
            const days = date ? daysUntil(date, now) : null
            const needed = r.neededFor(TARGET)
            const Icon = score != null || status === "done" ? CheckCircle2 : status === "in-progress" ? Clock : CircleDashed
            const iconColor = score != null || status === "done" ? "text-emerald-400" : status === "in-progress" ? "text-amber-400" : muted
            return (
              <div key={a.id} className="flex items-center gap-3 py-2.5 border-t border-border">
                <button title={`Status: ${status} (click to change)`} onClick={() => setAssessmentStatus(a.id, nextStatus[status])}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${fg}`}>{a.title}</p>
                  <p className={`text-[11px] ${muted}`}>
                    {r.weights[idx] ?? a.weight}% · {date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : a.deadline}
                    {score == null && days !== null && (days >= 0 ? ` · ${days === 0 ? "due today" : `${days} days left`}` : status === "done" ? " · submitted, awaiting grade" : ` · ${-days} days ago`)}
                  </p>
                </div>
                {score != null ? (
                  <span className="text-sm font-semibold text-emerald-400">{score}</span>
                ) : status === "done" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-400">Awaiting grade</span>
                ) : needed !== null ? (
                  <span className={`text-[10px] ${needed > 100 ? "text-[hsl(var(--destructive))]" : muted}`}>
                    {needed <= 0 ? `${TARGET} secured` : needed > 100 ? `${TARGET} not reachable` : `≥ ${Math.ceil(needed)} for ${TARGET}`}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3">
          {/* Attendance — 13 live sessions */}
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-medium ${fg} flex items-center gap-1.5`}><Radio className="h-4 w-4" /> Live sessions</p>
              <span className={`text-xs ${r.bonus.live ? "text-emerald-400" : muted}`}>
                {r.bonus.attended}/{LIVE_SESSIONS_PER_COURSE} · {r.bonus.live ? "+5 ✓" : `${LIVE_NEEDED - r.bonus.attended} more for +5`}
              </span>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${LIVE_SESSIONS_PER_COURSE}, minmax(0, 1fr))` }}>
              {Array.from({ length: LIVE_SESSIONS_PER_COURSE }, (_, i) => i + 1).map(n => {
                const st = attendance[n]
                return (
                  <button key={n} onClick={() => toggleAttendance(selected.code, n)} title={`Session ${n}: ${st ?? "not marked"} (click to toggle)`}
                    className={`aspect-square rounded-md text-[10px] font-medium flex items-center justify-center transition-transform active:scale-90 ${st === "present" ? "text-white" : st === "absent" ? "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]" : `border border-dashed border-border ${muted}`}`}
                    style={st === "present" ? { backgroundColor: selected.color } : undefined}>
                    {n}
                  </button>
                )
              })}
            </div>
            <p className={`text-[10px] mt-2 ${muted}`}>Tap a session to mark it attended (live only counts for the bonus).</p>
          </div>

          {/* Practices */}
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-medium ${fg} flex items-center gap-1.5`}><CheckSquare className="h-4 w-4" /> Practices</p>
              <span className={`text-xs ${r.bonus.prac ? "text-emerald-400" : muted}`}>
                {r.bonus.done}/{r.bonus.totalPractices} · {r.bonus.prac ? "+5 ✓" : `${r.bonus.totalPractices - r.bonus.done} left for +5`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${r.bonus.totalPractices ? (r.bonus.done / r.bonus.totalPractices) * 100 : 0}%`, backgroundColor: selected.color }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-x-3 max-h-56 overflow-y-auto pr-1">
              {practices.map(p => {
                const done = state.practicesDone.has(p.id)
                return (
                  <button key={p.id} onClick={() => togglePractice(p.id)} className="flex items-center gap-2 py-1 text-left">
                    <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${done ? "border-transparent" : "border-border"}`} style={done ? { backgroundColor: selected.color } : undefined}>
                      {done && <Check className="h-3 w-3 text-white" />}
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
    <div className={`${card} p-4`}>
      <p className={`text-sm font-medium mb-2 ${fg}`}>{term} notes</p>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Write a note and press Enter"
          className="flex-1 text-xs rounded-md px-2.5 py-1.5 bg-[hsl(var(--muted))] border border-border outline-none focus:border-[hsl(var(--primary))]" />
        <button onClick={add} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Add</button>
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
