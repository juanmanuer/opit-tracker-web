"use client"

// Today — Bento layout: one glance at what matters now.
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Video, Check, Radio, CheckSquare, ExternalLink, CalendarClock, ArrowRight } from "lucide-react"
import { QUICK_LINKS } from "@/lib/store"
import { getActiveCatalog } from "@/lib/catalog"
import { getGrade } from "@/lib/grades"
import {
  coursesOf, assessmentsOf, practicesOf, parseDeadline, daysUntil, nextSessions, parseLiveSession,
  formatCountdown, zoomUrl, termResult, bonusInfo, courseResult, termWeek, professorOf, TERM_WEEKS, LIVE_NEEDED,
} from "@/lib/academic"
import type { Academic } from "@/hooks/use-academic"

const muted = "text-[hsl(var(--muted-foreground))]"
const tile = "rounded-3xl bg-card p-5 sm:p-6"
// Course colour softened into a tile background that works in light and dark mode
export const tint = (hex: string, pct = 20) => `color-mix(in srgb, ${hex} ${pct}%, hsl(var(--card)))`

export function TodayView({ term, academic, onOpenCourse }: { term: string; academic: Academic; onOpenCourse: (code: string) => void }) {
  const { state, togglePractice } = academic
  const { data: session } = useSession()
  const first = session?.user?.name?.split(" ")[0] ?? ""
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])

  const currentTerm = getActiveCatalog().defaultTerm
  const isCurrent = term === currentTerm
  const courses = coursesOf(term)
  const color = (code: string) => courses.find(c => c.code === code)?.color ?? "#6B7280"
  const tr = termResult(state, term)
  const week = termWeek(term, now)

  const next = isCurrent ? nextSessions(term, now, 1)[0] : undefined
  const nextBonus = next ? bonusInfo(state, term, next.professor.courseCode) : null

  // Deadlines: next 14 days, plus anything overdue that isn't done
  const deadlines = courses.flatMap(c => assessmentsOf(c.code).map((a, idx) => {
    const date = a.dueAt ? new Date(a.dueAt) : parseDeadline(a.deadline, term)
    const graded = state.scores[term]?.[c.code]?.[idx] != null
    const status = state.assessmentStatus[a.id] ?? a.status
    return { a, c, date, days: date ? daysUntil(date, now) : null, done: graded || status === "done" }
  }))
    .filter(d => d.days !== null && !d.done && d.days <= 14 && d.days >= -14)
    .sort((x, y) => x.days! - y.days!)
  const soonest = deadlines.find(d => d.days! >= 0)

  const bonuses = courses.map(c => ({ c, b: bonusInfo(state, term, c.code) }))
  const secured = bonuses.reduce((n, { b }) => n + (b.live ? 1 : 0) + (b.prac ? 1 : 0), 0)
  const bonusPoints = secured * 5

  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
  const slots = isCurrent ? courses.map(c => ({ code: c.code, slot: parseLiveSession(professorOf(term, c.code)?.liveSessions ?? "") })) : []

  const queues = courses.map(c => practicesOf(c.code).filter(p => !state.practicesDone.has(p.id)))
  const pendingPractices = queues.flatMap(q => q.slice(0, 1)).concat(queues.flatMap(q => q.slice(1, 2))).slice(0, 4)

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

        {/* Welcome — dark tile with brand and signature */}
        <section aria-label="Welcome" className="sm:col-span-2 rounded-3xl bg-[hsl(var(--ink-tile))] text-white p-6 sm:p-7 flex flex-col justify-between gap-6 min-h-[220px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] flex items-center justify-center font-display font-bold text-sm">OT</span>
              <span className="font-display font-bold">OPIT Tracker</span>
            </div>
            <span className="font-display text-xs text-white/70">by Juan M. Aguilar</span>
          </div>
          <div>
            <p className="font-display text-[13px] text-white/70 uppercase tracking-wide">
              {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              {isCurrent && week ? ` · week ${week} / ${TERM_WEEKS}` : ` · ${term}`}
            </p>
            <h1 className="font-display text-[34px] sm:text-[40px] leading-[1.05] font-semibold mt-1.5">
              {greeting(now)}{first ? `, ${first}` : ""}.
              <span className="block text-white/60 text-[22px] sm:text-[26px] mt-1">
                {!isCurrent ? `${term} is complete.`
                  : soonest ? soonest.days === 0 ? `${short(soonest.c.name)} is due today.` : `${soonest.days} day${soonest.days === 1 ? "" : "s"} to ${short(soonest.c.name)}.`
                  : "Nothing due in the next two weeks."}
              </span>
            </h1>
          </div>
          {isCurrent && week && (
            <div aria-hidden="true" className="flex gap-1">
              {Array.from({ length: TERM_WEEKS }, (_, i) => (
                <span key={i} className={`flex-1 h-1.5 rounded-full ${i < week - 1 ? "bg-[hsl(var(--lime))]" : i === week - 1 ? "bg-white" : "bg-white/15"}`} />
              ))}
            </div>
          )}
        </section>

        {/* Term average — the lime tile */}
        <section aria-label="Term average" className="rounded-3xl bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] p-6 flex flex-col justify-between min-h-[220px]">
          <span className="font-display text-[13px] font-semibold">{term} average</span>
          <div>
            <div className="font-display font-bold tabular leading-[0.9] text-[76px] tracking-[-0.05em]">
              {tr.average !== null ? <>{tr.average.toFixed(1).split(".")[0]}<span className="text-[40px]">.{tr.average.toFixed(1).split(".")[1]}</span></> : "—"}
            </div>
            <p className="text-[13px] mt-2 font-medium">
              {tr.average !== null ? `${getGrade(tr.average).letter} · ` : ""}{tr.graded} of {tr.total} graded
              {tr.rawAverage !== null && tr.average !== null && tr.average - tr.rawAverage > 0.05 && ` · ${tr.rawAverage.toFixed(1)} without bonus`}
            </p>
          </div>
        </section>

        {/* Bonuses secured */}
        <section aria-label="Bonuses" className={`${tile} flex flex-col justify-between gap-4 min-h-[220px]`}>
          <div className="flex items-center justify-between">
            <span className="font-display text-[13px] font-semibold">Bonuses</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] ${muted}`}>+{bonusPoints} pts</span>
          </div>
          <div className="font-display font-bold tabular leading-[0.9] text-[56px] tracking-[-0.04em]">
            {secured}<span className={`text-[22px] tracking-normal ${muted}`}> / {courses.length * 2}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {bonuses.map(({ c, b }) => (
              <button key={c.code} onClick={() => onOpenCourse(c.code)} className="flex items-center gap-2 text-[11px] text-left" title={`${c.name}: live ${b.live ? "secured" : `${b.attended}/${LIVE_NEEDED}`}, practices ${b.prac ? "secured" : `${b.done}/${b.totalPractices}`}`}>
                <span className="font-display font-semibold w-10 tabular" style={{ color: c.color }}>{c.code.split("-").pop()}</span>
                <span className={`flex-1 h-2 rounded-full ${b.live ? "bg-[hsl(var(--foreground))]" : "bg-[hsl(var(--muted))]"}`} />
                <span className={`flex-1 h-2 rounded-full ${b.prac ? "bg-[hsl(var(--foreground))]" : "bg-[hsl(var(--muted))]"}`} />
              </button>
            ))}
            <div className={`flex gap-2 text-[10px] ${muted} pl-12`}><span className="flex-1">live</span><span className="flex-1">practices</span></div>
          </div>
        </section>

        {/* Next live session */}
        {next ? (
          <section aria-label="Next live session" className="sm:col-span-2 rounded-3xl p-6 flex flex-wrap items-center gap-5" style={{ background: tint(color(next.professor.courseCode), 22) }}>
            <div className="flex-1 basis-64 min-w-0">
              <span className="font-display text-xs font-semibold tracking-wider uppercase">{next.live ? "Live now" : "Next live"} · {next.professor.courseCode}</span>
              <h2 className="font-display text-[26px] leading-tight font-semibold mt-1.5">{next.professor.courseName}</h2>
              <p className="text-sm mt-1.5 opacity-80">
                {next.start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {fmt(next.start)}–{fmt(next.end)}
                {nextBonus && (nextBonus.live ? " · live bonus secured" : nextBonus.attended === LIVE_NEEDED - 1 ? ` · ${nextBonus.attended}/${LIVE_NEEDED} — this one locks the +5` : ` · attendance ${nextBonus.attended}/${LIVE_NEEDED}`)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              <span className="font-display font-bold tabular text-[34px] tracking-[-0.03em]">{formatCountdown(next.start, now)}</span>
              {next.professor.meetingId ? (
                <a href={zoomUrl(next.professor.meetingId)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-display font-semibold text-sm hover:opacity-90">
                  <Video className="h-4 w-4" /> Join Zoom
                </a>
              ) : (
                <button onClick={() => onOpenCourse(next.professor.courseCode)} className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-display font-semibold text-sm">
                  Course <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>
        ) : (
          <section aria-label="Live sessions" className={`sm:col-span-2 ${tile} flex items-center gap-3`}>
            <CalendarClock className={`h-5 w-5 ${muted}`} />
            <p className={`text-sm ${muted}`}>{isCurrent ? "No live sessions in the next two weeks." : `${term} is finished. Switch to ${currentTerm} for upcoming sessions.`}</p>
          </section>
        )}

        {/* Due soon */}
        <section aria-label="Due soon" className={`sm:col-span-2 ${tile} flex flex-col gap-3`}>
          <h3 className="font-display font-semibold">Due soon</h3>
          {deadlines.length === 0 ? (
            <p className={`text-sm ${muted}`}>Nothing due in the next two weeks.</p>
          ) : deadlines.slice(0, 4).map(d => (
            <button key={d.a.id} onClick={() => onOpenCourse(d.c.code)} className="flex items-center gap-3.5 text-left">
              <span className={`h-12 w-12 rounded-2xl flex items-baseline justify-center pt-2.5 font-display font-bold text-xl tabular shrink-0 ${d.days! < 0 ? "bg-[hsl(var(--destructive))] text-white" : ""}`}
                style={d.days! < 0 ? undefined : { background: tint(d.c.color, 28) }}>
                {d.days === 0 ? "!" : Math.abs(d.days!)}<span className="text-[10px] font-medium">{d.days === 0 ? "" : "d"}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{short(d.c.name)} · {d.a.title}</span>
                <span className={`block text-xs ${d.days! < 0 ? "text-[hsl(var(--destructive))] font-medium" : muted}`}>{d.c.code} · {d.days! < 0 ? `${-d.days!} day${d.days === -1 ? "" : "s"} late — mark it submitted if it's done` : d.date!.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
              </span>
              <span className="font-display font-semibold text-sm tabular">{d.a.weight}</span>
            </button>
          ))}
        </section>
      </div>

      {/* Course tiles */}
      <section aria-label="Courses" className="grid gap-3.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {courses.map(c => {
          const r = courseResult(state, term, c.code)
          const b = r.bonus
          return (
            <button key={c.code} onClick={() => onOpenCourse(c.code)}
              className="rounded-3xl p-4 sm:p-5 min-h-[160px] flex flex-col justify-between gap-3 text-left transition-transform hover:-translate-y-0.5"
              style={{ background: tint(c.color, 22) }}>
              <span className="flex items-start justify-between gap-2">
                <span className="font-display text-xs font-semibold">{c.code}</span>
                {r.total !== null
                  ? <span className="font-display font-bold tabular text-[28px] leading-none tracking-[-0.03em]">{r.total.toFixed(0)}</span>
                  : <span className="font-display text-xs font-medium opacity-60">no grade yet</span>}
              </span>
              <span className="font-display font-semibold text-[15px] leading-tight">{c.name}</span>
              <span className="flex flex-wrap gap-1.5">
                <Chip ok={b.live} icon={<Radio className="h-3 w-3" />} text={b.live ? "live ✓" : `live ${b.attended}/${LIVE_NEEDED}`} />
                {b.totalPractices > 0 && <Chip ok={b.prac} icon={<CheckSquare className="h-3 w-3" />} text={b.prac ? "practices ✓" : `${b.done}/${b.totalPractices}`} />}
              </span>
            </button>
          )
        })}
      </section>

      {/* Week + practices */}
      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-2">
        <section aria-label="Next 7 days" className={tile}>
          <h3 className="font-display font-semibold mb-3">Next 7 days</h3>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weekDays.map(day => {
              const isToday = day.toDateString() === now.toDateString()
              const dots = slots.filter(s => s.slot?.weekday === day.getDay())
              const due = deadlines.filter(d => d.date!.toDateString() === day.toDateString())
              return (
                <div key={day.toISOString()} className={`rounded-2xl py-2 ${isToday ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]" : "bg-[hsl(var(--muted))]"}`}>
                  <p className={`text-[10px] font-display uppercase ${isToday ? "font-semibold" : muted}`}>{day.toLocaleDateString("en-GB", { weekday: "short" })}</p>
                  <p className="font-display font-semibold tabular">{day.getDate()}</p>
                  <div className="flex justify-center gap-0.5 mt-1 min-h-[8px]">
                    {dots.map(s => <span key={s.code} title={`${s.code} live session`} className="h-2 w-2 rounded-full" style={{ backgroundColor: color(s.code) }} />)}
                    {due.map(d => <span key={d.a.id} title={`${d.c.code} ${d.a.title} due`} className={`h-2 w-2 rotate-45 ${isToday ? "bg-[hsl(var(--lime-foreground))]" : "bg-[hsl(var(--foreground))]"}`} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section aria-label="Next practices" className={tile}>
          <h3 className="font-display font-semibold mb-2">Next practices</h3>
          {pendingPractices.length === 0 ? <p className={`text-sm ${muted}`}>All practices done. Bonus secured.</p> : pendingPractices.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-sm truncate"><span className="font-display font-semibold" style={{ color: color(p.courseCode) }}>{p.courseCode.split("-").pop()}</span> <span className={muted}>·</span> {p.title}</span>
              <button onClick={() => togglePractice(p.id)} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--lime))] hover:text-[hsl(var(--lime-foreground))] transition-colors shrink-0">
                <Check className="h-3.5 w-3.5" /> Done
              </button>
            </div>
          ))}
        </section>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map(l => (
          <a key={l.id} href={l.url} target="_blank" rel="noreferrer" title={l.description}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-card hover:text-[hsl(var(--foreground))] ${muted}`}>
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
// "Introduction to Databases" → "Databases"; long names keep their first words
function short(name: string) {
  const n = name.replace(/^(Intro(duction)? to)\s+/i, "")
  return n.length <= 24 ? n : n.split(" ").slice(0, 2).join(" ")
}

function Chip({ ok, icon, text }: { ok: boolean; icon: React.ReactNode; text: string }) {
  return (
    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${ok ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-[hsl(var(--card)/0.75)]"}`}>{icon}{text}</span>
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
