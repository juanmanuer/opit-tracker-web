"use client"

import { useEffect, useState } from "react"
import { Video, Check, Radio, CheckSquare, ExternalLink, CalendarClock } from "lucide-react"
import { QUICK_LINKS } from "@/lib/store"
import { getActiveCatalog } from "@/lib/catalog"
import { getGrade } from "@/lib/grades"
import {
  coursesOf, assessmentsOf, practicesOf, parseDeadline, daysUntil, nextSessions, parseLiveSession,
  formatCountdown, zoomUrl, termResult, bonusInfo, termWeek, professorOf, TERM_WEEKS, LIVE_NEEDED,
} from "@/lib/academic"
import type { Academic } from "@/hooks/use-academic"

const muted = "text-[hsl(var(--muted-foreground))]"
const fg = "text-[hsl(var(--foreground))]"
const card = "rounded-2xl bg-card border border-border"

export function TodayView({ term, academic, onOpenCourse }: { term: string; academic: Academic; onOpenCourse: (code: string) => void }) {
  const { state, togglePractice } = academic
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])

  const currentTerm = getActiveCatalog().defaultTerm
  const isCurrent = term === currentTerm
  const courses = coursesOf(term)
  const color = (code: string) => courses.find(c => c.code === code)?.color ?? "#6B7280"
  const tr = termResult(state, term)
  const week = termWeek(term, now)

  const sessions = isCurrent ? nextSessions(term, now, 1) : []
  const next = sessions[0]
  const nextBonus = next ? bonusInfo(state, term, next.professor.courseCode) : null

  // Deadlines: next 14 days (plus anything overdue that isn't done)
  const deadlines = courses.flatMap(c => assessmentsOf(c.code).map((a, idx) => {
    const date = parseDeadline(a.deadline, term)
    const graded = state.scores[term]?.[c.code]?.[idx] != null
    const status = state.assessmentStatus[a.id] ?? a.status
    return { a, c, date, days: date ? daysUntil(date, now) : null, done: graded || status === "done" }
  }))
    .filter(d => d.days !== null && !d.done && d.days <= 14 && d.days >= -14)
    .sort((x, y) => x.days! - y.days!)

  // Next 7 days, starting today
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
  const slots = isCurrent ? courses.map(c => ({ code: c.code, slot: parseLiveSession(professorOf(term, c.code)?.liveSessions ?? "") })) : []

  // One pending practice per course (round-robin), up to 4
  const queues = courses.map(c => practicesOf(c.code).filter(p => !state.practicesDone.has(p.id)))
  const pendingPractices = queues.flatMap((q, i) => q.slice(0, 1)).concat(queues.flatMap(q => q.slice(1, 2))).slice(0, 4)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className={`text-xl font-semibold ${fg}`}>{greeting(now)}, Juanma</h1>
          <p className={`text-xs ${muted}`}>
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · {term}
            {isCurrent && week && <> · week {week} of {TERM_WEEKS}</>}
          </p>
        </div>
      </div>

      {/* Row 1: next session · average · bonus */}
      <div className="grid gap-3 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {next ? (
          <div className={`${card} p-4 flex flex-col justify-between`} style={{ borderLeft: `3px solid ${color(next.professor.courseCode)}` }}>
            <div>
              <p className={`text-[11px] ${muted}`}>{next.live ? "Live now" : "Next live session"}</p>
              <p className={`text-base font-semibold ${fg}`}>{next.professor.courseName}</p>
              <p className={`text-xs ${muted}`}>
                {next.start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })} · {fmt(next.start)}–{fmt(next.end)} · {next.professor.name}
              </p>
            </div>
            <div className="flex items-end justify-between mt-3 gap-3">
              <div>
                <p className={`text-2xl font-semibold ${fg}`}>{formatCountdown(next.start, now)}</p>
                {nextBonus && (
                  <p className={`text-[11px] ${nextBonus.live ? "text-emerald-400" : nextBonus.attended === LIVE_NEEDED - 1 ? "text-amber-400" : muted}`}>
                    {nextBonus.live ? "Live bonus +5 secured" : nextBonus.attended === LIVE_NEEDED - 1 ? `Attendance ${nextBonus.attended}/7 · this one gets you +5` : `Attendance ${nextBonus.attended}/7`}
                  </p>
                )}
              </div>
              <a href={zoomUrl(next.professor.meetingId)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90">
                <Video className="h-3.5 w-3.5" /> Join Zoom
              </a>
            </div>
          </div>
        ) : (
          <div className={`${card} p-4 flex items-center gap-3`}>
            <CalendarClock className={`h-5 w-5 ${muted}`} />
            <p className={`text-sm ${muted}`}>{isCurrent ? "No live sessions in the next two weeks." : `${term} is finished. Switch to ${currentTerm} for upcoming sessions.`}</p>
          </div>
        )}

        <div className="rounded-2xl bg-[hsl(var(--muted)/0.5)] p-4 flex flex-col items-center justify-center">
          <Ring value={tr.average} />
          <p className={`text-[11px] mt-1 text-center ${muted}`}>
            {term} average{tr.rawAverage !== null && tr.average !== null && tr.average - tr.rawAverage > 0.05 && <> · {tr.rawAverage.toFixed(1)} without bonus</>}
          </p>
        </div>

        <div className="rounded-2xl bg-[hsl(var(--muted)/0.5)] p-4">
          <p className={`text-[11px] mb-2 ${muted}`}>Bonus</p>
          <div className="flex flex-col gap-1.5">
            {courses.map(c => {
              const b = bonusInfo(state, term, c.code)
              return (
                <button key={c.code} onClick={() => onOpenCourse(c.code)} className="flex items-center gap-1.5 text-[11px] text-left">
                  <span className="font-mono w-9" style={{ color: c.color }}>{c.code.split("-")[1]}</span>
                  <Pill ok={b.live} icon={<Radio className="h-3 w-3" />} text={b.live ? "+5" : `${b.attended}/7`} />
                  <Pill ok={b.prac} icon={<CheckSquare className="h-3 w-3" />} text={b.prac ? "+5" : b.totalPractices ? `${b.done}/${b.totalPractices}` : "—"} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 2: deadlines · week + practices */}
      <div className="grid gap-3 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className={`${card} p-4`}>
          <p className={`text-sm font-medium mb-2 ${fg}`}>Next 14 days</p>
          {deadlines.length === 0 ? (
            <p className={`text-xs ${muted}`}>Nothing due in the next two weeks.</p>
          ) : deadlines.map(d => (
            <button key={d.a.id} onClick={() => onOpenCourse(d.c.code)} className="w-full flex items-center gap-3 py-2 border-t border-border text-left">
              <span className="w-1 h-8 rounded-full" style={{ backgroundColor: d.c.color }} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${fg}`}>{d.c.name} — {d.a.title}</p>
                <p className={`text-[11px] ${muted}`}>{d.c.code} · weight {d.a.weight} · {d.date!.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
              </div>
              <span className={`text-base font-semibold ${d.days! < 0 ? "text-[hsl(var(--destructive))]" : d.days! <= 7 ? "text-amber-400" : fg}`}>
                {d.days! < 0 ? `${-d.days!}d late` : d.days === 0 ? "Today" : `${d.days}d`}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className={`${card} p-4`}>
            <p className={`text-sm font-medium mb-2 ${fg}`}>Next 7 days</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekDays.map(day => {
                const isToday = day.toDateString() === now.toDateString()
                const dots = slots.filter(s => s.slot?.weekday === day.getDay())
                const due = deadlines.filter(d => d.date!.toDateString() === day.toDateString())
                return (
                  <div key={day.toISOString()} className={`rounded-lg py-1.5 ${isToday ? "bg-[hsl(var(--primary)/0.12)] ring-1 ring-[hsl(var(--primary)/0.5)]" : "bg-[hsl(var(--muted)/0.5)]"}`}>
                    <p className={`text-[10px] ${isToday ? "text-[hsl(var(--primary))] font-semibold" : muted}`}>{day.toLocaleDateString("en-GB", { weekday: "narrow" })}</p>
                    <p className={`text-xs ${fg}`}>{day.getDate()}</p>
                    <div className="flex justify-center gap-0.5 mt-1 min-h-[7px]">
                      {dots.map(s => <span key={s.code} title={`${s.code} live session`} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color(s.code) }} />)}
                      {due.map(d => <span key={d.a.id} title={`${d.c.code} ${d.a.title} due`} className="h-1.5 w-1.5 rotate-45 bg-[hsl(var(--destructive))]" />)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-[hsl(var(--muted)/0.5)] p-4">
            <p className={`text-sm font-medium mb-2 ${fg}`}>Next practices</p>
            {pendingPractices.length === 0 ? <p className={`text-xs ${muted}`}>All practices done. Bonus secured.</p> : pendingPractices.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-1">
                <span className={`text-xs truncate ${muted}`}><span className="font-mono" style={{ color: color(p.courseCode) }}>{p.courseCode.split("-")[1]}</span> · {p.title}</span>
                <button onClick={() => togglePractice(p.id)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-[hsl(var(--muted))] shrink-0">
                  <Check className="h-3 w-3" /> Done
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map(l => (
          <a key={l.id} href={l.url} target="_blank" rel="noreferrer" title={l.description}
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] ${muted}`}>
            {l.label} <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  )
}

function greeting(d: Date) {
  const h = d.getHours()
  return h < 12 ? "Good morning" : h < 19 ? "Good afternoon" : "Good evening"
}
const fmt = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

function Pill({ ok, icon, text }: { ok: boolean; icon: React.ReactNode; text: string }) {
  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${ok ? "bg-emerald-400/15 text-emerald-400" : `bg-card ${muted}`}`}>{icon}{text}</span>
  )
}

export function Ring({ value, size = 92 }: { value: number | null; size?: number }) {
  const R = size / 2 - 7, C = 2 * Math.PI * R
  const pct = value !== null ? Math.min(100, (value / 110) * 100) : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" strokeWidth="7" strokeLinecap="round"
        stroke={value !== null ? getGrade(value).color : "transparent"} strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="50%" y="48%" textAnchor="middle" className="fill-[hsl(var(--foreground))]" style={{ fontSize: size / 4.6, fontWeight: 600 }}>{value !== null ? value.toFixed(1) : "—"}</text>
      <text x="50%" y="66%" textAnchor="middle" className="fill-[hsl(var(--muted-foreground))]" style={{ fontSize: 10 }}>{value !== null ? getGrade(value).letter : "no grades"}</text>
    </svg>
  )
}
