"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Rss, ExternalLink, Video, Trash2, X, Copy, Check, BookOpen } from "lucide-react"
import { coursesOf, courseResult, daysUntil, zoomUrl, professorOf, TERM_WEEKS } from "@/lib/academic"
import { buildPlan, termMonday, addDays, type PlanItem, type CanvasDates, type PersonalEvent } from "@/lib/plan"
import type { Academic } from "@/hooks/use-academic"

const muted = "text-[hsl(var(--muted-foreground))]"
const fg = "text-[hsl(var(--foreground))]"
const card = "rounded-2xl bg-card border border-border"
const DAY = 86_400_000
type Tab = "runway" | "week" | "agenda"

const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
const fmtTime = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
const mondayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))

export function PlanView({ term, academic, onOpenCourse }: { term: string; academic: Academic; onOpenCourse: (code: string) => void }) {
  const { state, toggleAttendance } = academic
  const [tab, setTab] = useState<Tab>("runway")
  const [canvas, setCanvas] = useState<CanvasDates>({})
  const [canvasState, setCanvasState] = useState<"loading" | "ok" | "error">("loading")
  const [personal, setPersonal] = useState<PersonalEvent[]>([])
  const [selected, setSelected] = useState<PlanItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showFeed, setShowFeed] = useState(false)
  const now = new Date()

  const loadPersonal = () =>
    fetch("/api/user/calendar").then(r => (r.ok ? r.json() : [])).then(d => Array.isArray(d) && setPersonal(d)).catch(() => {})

  useEffect(() => {
    setCanvasState("loading"); setSelected(null)
    fetch(`/api/canvas/deadlines?term=${encodeURIComponent(term)}`)
      .then(r => r.json()).then(d => { if (d && !d.error) { setCanvas(d); setCanvasState("ok") } else setCanvasState("error") })
      .catch(() => setCanvasState("error"))
    loadPersonal()
  }, [term])

  const items = useMemo(() => buildPlan(term, canvas, personal), [term, canvas, personal])
  const courses = coursesOf(term)
  const color = (code: string | null) => courses.find(c => c.code === code)?.color ?? "#6B7280"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[hsl(var(--muted))]" role="tablist">
          {(["runway", "week", "agenda"] as Tab[]).map(t => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full capitalize transition-colors ${tab === t ? "bg-card shadow-sm text-[hsl(var(--foreground))]" : `${muted} hover:text-[hsl(var(--foreground))]`}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] ${canvasState === "error" ? "text-amber-400" : muted}`}>
            {canvasState === "loading" ? "Loading Canvas dates…" : canvasState === "ok" ? "Dates from Canvas" : "Canvas unavailable · using saved dates"}
          </span>
          <button onClick={() => { setShowAdd(p => !p); setShowFeed(false) }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><Plus className="h-3.5 w-3.5" /> Event</button>
          <button onClick={() => { setShowFeed(p => !p); setShowAdd(false) }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><Rss className="h-3.5 w-3.5" /> Subscribe</button>
        </div>
      </div>

      {showAdd && <AddEvent term={term} onClose={() => setShowAdd(false)} onAdded={() => { loadPersonal(); setShowAdd(false) }} />}
      {showFeed && <FeedPanel onClose={() => setShowFeed(false)} />}

      {tab === "runway" && <Runway term={term} items={items} academic={academic} color={color} now={now} selected={selected} onSelect={setSelected} />}
      {tab === "week" && <Week term={term} items={items} academic={academic} color={color} now={now} onSelect={setSelected} />}
      {tab === "agenda" && <Agenda term={term} items={items} academic={academic} color={color} now={now} onSelect={setSelected} />}

      {selected && (
        <Detail item={selected} term={term} academic={academic} color={color} now={now}
          onClose={() => setSelected(null)} onOpenCourse={onOpenCourse}
          onToggleAttendance={(code, n) => toggleAttendance(code, n)}
          onDeletePersonal={async id => {
            const res = await fetch("/api/user/calendar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null)
            if (res?.ok) { setPersonal(p => p.filter(e => e.id !== id)); setSelected(null) }
          }} />
      )}
    </div>
  )
}

// ── Runway ──────────────────────────────────────────────────────────────
function Runway({ term, items, academic, color, now, selected, onSelect }: {
  term: string; items: PlanItem[]; academic: Academic; color: (c: string | null) => string; now: Date
  selected: PlanItem | null; onSelect: (i: PlanItem) => void
}) {
  const { state } = academic
  const start = termMonday(term)
  const lastDeadline = Math.max(...items.filter(i => i.kind === "deadline").map(i => i.start.getTime()), start.getTime() + TERM_WEEKS * 7 * DAY)
  const weeks = Math.max(TERM_WEEKS, Math.ceil((lastDeadline - start.getTime()) / (7 * DAY)) + 1)
  const span = weeks * 7 * DAY
  const x = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - start.getTime()) / span) * 100))
  const courses = coursesOf(term)

  const load = Array.from({ length: weeks }, () => 0)
  items.filter(i => i.kind === "deadline").forEach(i => {
    const w = Math.floor((i.start.getTime() - start.getTime()) / (7 * DAY))
    if (w >= 0 && w < weeks) load[w] += parseFloat(i.weight ?? "0") || 0
  })
  const maxLoad = Math.max(...load, 1)
  const showToday = now >= start && now.getTime() <= start.getTime() + span
  const personal = items.filter(i => i.kind === "personal")

  return (
    <div className={`${card} p-4 overflow-x-auto`}>
      <div className="min-w-[760px]">
        {/* Load strip */}
        <div className="grid grid-cols-[130px_minmax(0,1fr)] items-center mb-1">
          <span className={`text-[11px] ${muted}`}>Workload</span>
          <div className="flex gap-[2px] h-4">
            {load.map((v, i) => (
              <div key={i} title={`Week ${i + 1}: ${v ? `${v}% of grades due` : "nothing due"}`} className="flex-1 rounded-[3px]"
                style={{ backgroundColor: v ? `rgba(234,88,12,${0.15 + 0.85 * (v / maxLoad)})` : "hsl(var(--muted) / 0.6)" }} />
            ))}
          </div>
        </div>
        {/* Week labels */}
        <div className="grid grid-cols-[130px_minmax(0,1fr)] mb-1">
          <span />
          <div className="relative h-4">
            {Array.from({ length: weeks }, (_, i) => i).filter(i => i % 2 === 0).map(i => {
              const d = addDays(start, i * 7)
              return <span key={i} className={`absolute text-[10px] ${muted}`} style={{ left: `${(i / weeks) * 100}%` }}>W{i + 1} · {d.getDate()} {d.toLocaleDateString("en-GB", { month: "short" })}</span>
            })}
          </div>
        </div>

        <div className="relative">
          {courses.map(c => {
            const r = courseResult(state, term, c.code)
            const rowItems = items.filter(i => i.courseCode === c.code)
            return (
              <div key={c.code} className="grid grid-cols-[130px_minmax(0,1fr)] items-center border-b border-border last:border-0">
                <div className="py-2 pr-2">
                  <p className="text-[11px] font-mono font-semibold" style={{ color: c.color }}>{c.code}</p>
                  <p className={`text-xs truncate ${muted}`}>{c.name}</p>
                </div>
                <div className="relative h-12">
                  {/* Live sessions as ticks: filled = attended */}
                  {rowItems.filter(i => i.kind === "session").map(i => {
                    const att = state.attendance[c.code]?.[i.sessionNumber!] === "present"
                    const past = i.end < now
                    return <button key={i.id} onClick={() => onSelect(i)} title={`${i.title} · ${fmtDay(i.start)}${att ? " · attended" : past ? " · not marked" : ""}`}
                      className="absolute bottom-1.5 h-2 w-2 -translate-x-1/2 rounded-full transition-transform hover:scale-150"
                      style={{ left: `${x(i.start)}%`, backgroundColor: att ? c.color : "transparent", border: `1.5px solid ${c.color}`, opacity: att ? 1 : past ? 0.8 : 0.3 }} />
                  })}
                  {/* Deadlines: work window + diamond */}
                  {rowItems.filter(i => i.kind === "deadline").map(i => {
                    const score = r.scores[i.assessmentIdx!]
                    const status = state.assessmentStatus[i.assessmentId!]
                    const done = score != null || status === "done"
                    const late = !done && i.start < now
                    const isSel = selected?.id === i.id
                    return (
                      <div key={i.id}>
                        {!done && i.windowStart && (
                          <div className="absolute top-[18px] h-1.5 rounded-full" style={{ left: `${x(i.windowStart)}%`, width: `${x(i.start) - x(i.windowStart)}%`, backgroundColor: c.color, opacity: 0.28 }} />
                        )}
                        {score != null && <span className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-emerald-400" style={{ left: `${x(i.start)}%` }}>{score}</span>}
                        <button onClick={() => onSelect(i)} title={`${c.code} ${i.title} · ${fmtDay(i.start)} · ${i.weight}`}
                          className={`absolute top-[14px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[3px] transition-transform hover:scale-125 ${isSel ? "ring-2 ring-offset-2 ring-offset-[hsl(var(--card))]" : ""}`}
                          style={{
                            left: `${x(i.start)}%`,
                            backgroundColor: score != null ? "#16A34A" : done ? c.color : "hsl(var(--card))",
                            border: `2px solid ${late ? "hsl(var(--destructive))" : score != null ? "#16A34A" : c.color}`,
                            ["--tw-ring-color" as any]: c.color,
                          }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {personal.length > 0 && (
            <div className="grid grid-cols-[130px_minmax(0,1fr)] items-center border-t border-border">
              <p className={`text-xs py-2 ${muted}`}>Personal</p>
              <div className="relative h-9">
                {personal.map(i => (
                  <button key={i.id} onClick={() => onSelect(i)} title={`${i.title} · ${fmtDay(i.start)}`}
                    className="absolute top-3 h-3 w-3 -translate-x-1/2 rounded-full bg-[hsl(var(--primary))] hover:scale-125 transition-transform" style={{ left: `${x(i.start)}%` }} />
                ))}
              </div>
            </div>
          )}
          {/* Today line */}
          {showToday && (
            <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `calc(130px + (100% - 130px) * ${x(now) / 100})` }}>
              <div className="h-full w-0.5 bg-[hsl(var(--destructive))]" />
              <span className="absolute -bottom-4 -translate-x-1/2 text-[9px] font-semibold text-[hsl(var(--destructive))]">TODAY</span>
            </div>
          )}
        </div>

        <div className={`flex flex-wrap gap-4 mt-3 text-[11px] ${muted}`}>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-emerald-600" /> Graded</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[hsl(var(--muted-foreground))]" /> Submitted</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] border-2 border-[hsl(var(--muted-foreground))]" /> To do</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-[hsl(var(--muted-foreground))] opacity-40" /> Work window</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))]" /> Live session attended</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-[hsl(var(--destructive))]" /> Today</span>
        </div>
      </div>
    </div>
  )
}

// ── Week (time grid) ────────────────────────────────────────────────────
function Week({ term, items, academic, color, now, onSelect }: {
  term: string; items: PlanItem[]; academic: Academic; color: (c: string | null) => string; now: Date; onSelect: (i: PlanItem) => void
}) {
  const { state } = academic
  const tStart = termMonday(term)
  const initial = now >= tStart && now < addDays(tStart, 20 * 7) ? mondayOf(now) : tStart
  const [weekStart, setWeekStart] = useState(initial)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 7)
  const inWeek = items.filter(i => i.start >= weekStart && i.start < weekEnd)
  const timed = inWeek.filter(i => i.kind === "session" || i.kind === "office")
  const allDay = inWeek.filter(i => i.kind === "deadline" || i.kind === "personal")
  const firstH = Math.min(9, ...timed.map(i => i.start.getHours()))
  const lastH = Math.max(19, ...timed.map(i => i.end.getHours() + (i.end.getMinutes() ? 1 : 0)))
  const H = 46
  const weekNo = Math.round((weekStart.getTime() - tStart.getTime()) / (7 * DAY)) + 1

  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--muted))]"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--muted))]"><ChevronRight className="h-4 w-4" /></button>
          <p className={`text-sm font-medium ml-1 ${fg}`}>
            {weekNo >= 1 && weekNo <= 20 ? `Week ${weekNo} · ` : ""}{weekStart.getDate()} {weekStart.toLocaleDateString("en-GB", { month: "short" })} – {days[6].getDate()} {days[6].toLocaleDateString("en-GB", { month: "short" })}
          </p>
        </div>
        <button onClick={() => setWeekStart(mondayOf(now))} className={`text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] ${muted}`}>This week</button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Day headers + all-day row */}
          <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1">
            <span />
            {days.map(d => {
              const today = sameDay(d, now)
              return (
                <div key={d.toISOString()} className={`text-center rounded-lg py-1 ${today ? "bg-[hsl(var(--primary)/0.12)]" : ""}`}>
                  <p className={`text-[10px] ${today ? "text-[hsl(var(--primary))] font-semibold" : muted}`}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</p>
                  <p className={`text-sm font-semibold ${today ? "text-[hsl(var(--primary))]" : fg}`}>{d.getDate()}</p>
                </div>
              )
            })}
            <span className={`text-[9px] pt-1 ${muted}`}>all-day</span>
            {days.map(d => (
              <div key={`ad-${d.toISOString()}`} className="flex flex-col gap-0.5 min-h-[22px] py-0.5">
                {allDay.filter(i => sameDay(i.start, d)).map(i => (
                  <button key={i.id} onClick={() => onSelect(i)} className="text-left text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate"
                    style={{ backgroundColor: (i.kind === "personal" ? "#0891B2" : color(i.courseCode)) + "26", color: i.kind === "personal" ? "#0891B2" : color(i.courseCode) }}>
                    {i.kind === "deadline" ? `◆ ${i.courseCode?.split("-")[1]} ${i.title.replace("Assessment", "A")}` : i.title}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1 mt-1">
            <div className="relative" style={{ height: (lastH - firstH) * H }}>
              {Array.from({ length: lastH - firstH }, (_, k) => (
                <span key={k} className={`absolute right-1 text-[10px] -translate-y-1/2 ${muted}`} style={{ top: k * H }}>{String(firstH + k).padStart(2, "0")}:00</span>
              ))}
            </div>
            {days.map(d => {
              const today = sameDay(d, now)
              const nowTop = ((now.getHours() + now.getMinutes() / 60) - firstH) * H
              return (
                <div key={`tg-${d.toISOString()}`} className="relative rounded-lg bg-[hsl(var(--muted)/0.35)]" style={{ height: (lastH - firstH) * H }}>
                  {Array.from({ length: lastH - firstH }, (_, k) => <div key={k} className="absolute inset-x-0 border-t border-border/60" style={{ top: k * H }} />)}
                  {timed.filter(i => sameDay(i.start, d)).map(i => {
                    const top = ((i.start.getHours() + i.start.getMinutes() / 60) - firstH) * H
                    const h = Math.max(22, ((i.end.getTime() - i.start.getTime()) / 3_600_000) * H - 2)
                    const c = color(i.courseCode)
                    const att = i.kind === "session" && state.attendance[i.courseCode!]?.[i.sessionNumber!] === "present"
                    return (
                      <button key={i.id} onClick={() => onSelect(i)} title={i.title}
                        className="absolute inset-x-1 rounded-md px-1.5 py-1 text-left overflow-hidden hover:brightness-110 transition"
                        style={{
                          top, height: h,
                          backgroundColor: i.kind === "session" ? c + "2e" : "transparent",
                          border: i.kind === "office" ? `1.5px dashed ${c}` : "none",
                          borderLeft: `3px solid ${c}`,
                        }}>
                        <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: c }}>
                          {att && "✓ "}{i.courseCode?.split("-")[1]} {i.kind === "office" ? "office hrs" : `S${i.sessionNumber}`}
                        </p>
                        <p className={`text-[9px] leading-tight truncate ${muted}`}>{fmtTime(i.start)}–{fmtTime(i.end)}</p>
                      </button>
                    )
                  })}
                  {today && nowTop > 0 && nowTop < (lastH - firstH) * H && (
                    <div className="absolute inset-x-0 h-0.5 bg-[hsl(var(--destructive))]" style={{ top: nowTop }}>
                      <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--destructive))]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Agenda ──────────────────────────────────────────────────────────────
function Agenda({ term, items, academic, color, now, onSelect }: {
  term: string; items: PlanItem[]; academic: Academic; color: (c: string | null) => string; now: Date; onSelect: (i: PlanItem) => void
}) {
  const { state } = academic
  const horizon = addDays(now, 29)
  const upcoming = items.filter(i => i.end >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && i.start <= horizon)
  const groups = new Map<string, PlanItem[]>()
  upcoming.forEach(i => { const k = i.start.toDateString(); groups.set(k, [...(groups.get(k) ?? []), i]) })

  if (upcoming.length === 0) return <div className={`${card} p-6 text-center text-sm ${muted}`}>Nothing in the next 4 weeks.</div>

  return (
    <div className={`${card} p-2 sm:p-4`}>
      {[...groups.entries()].map(([k, list]) => {
        const d = new Date(k)
        const dd = daysUntil(d, now)
        return (
          <div key={k} className="flex gap-3 py-2 border-b border-border last:border-0">
            <div className="w-16 shrink-0 text-center pt-1">
              <p className={`text-[10px] uppercase ${dd === 0 ? "text-[hsl(var(--primary))] font-semibold" : muted}`}>{dd === 0 ? "Today" : dd === 1 ? "Tomorrow" : d.toLocaleDateString("en-GB", { weekday: "short" })}</p>
              <p className={`text-lg font-semibold leading-tight ${dd === 0 ? "text-[hsl(var(--primary))]" : fg}`}>{d.getDate()}</p>
              <p className={`text-[10px] ${muted}`}>{d.toLocaleDateString("en-GB", { month: "short" })}</p>
            </div>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              {list.map(i => {
                const c = i.kind === "personal" ? "#0891B2" : color(i.courseCode)
                const att = i.kind === "session" && state.attendance[i.courseCode!]?.[i.sessionNumber!] === "present"
                const prof = i.courseCode ? professorOf(term, i.courseCode) : undefined
                return (
                  <div key={i.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[hsl(var(--muted)/0.6)]">
                    <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: c }} />
                    <button onClick={() => onSelect(i)} className="flex-1 min-w-0 text-left">
                      <p className={`text-sm truncate ${fg}`}>
                        {i.kind === "deadline" ? `${i.courseCode} · ${i.title} due` : i.title}{att && <span className="text-emerald-400"> ✓</span>}
                      </p>
                      <p className={`text-[11px] ${muted}`}>
                        {i.kind === "deadline" ? `${fmtTime(i.start)} · weight ${i.weight}` : i.allDay ? "All day" : `${fmtTime(i.start)}–${fmtTime(i.end)}`}
                        {i.kind === "office" && " · office hours"}
                      </p>
                    </button>
                    {i.kind === "session" && prof && (
                      <a href={zoomUrl(prof.meetingId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-card shrink-0"><Video className="h-3 w-3" /> Zoom</a>
                    )}
                    {i.kind === "deadline" && (() => {
                      const score = state.scores[term]?.[i.courseCode!]?.[i.assessmentIdx!]
                      const done = score != null || state.assessmentStatus[i.assessmentId!] === "done"
                      const d = daysUntil(i.start, now)
                      return done
                        ? <span className="text-xs font-semibold shrink-0 text-emerald-400">{score != null ? `✓ ${score}` : "✓ Submitted"}</span>
                        : <span className={`text-xs font-semibold shrink-0 ${d <= 3 ? "text-amber-400" : muted}`}>{d === 0 ? "Today" : `${d}d`}</span>
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Detail card ─────────────────────────────────────────────────────────
function Detail({ item, term, academic, color, now, onClose, onOpenCourse, onToggleAttendance, onDeletePersonal }: {
  item: PlanItem; term: string; academic: Academic; color: (c: string | null) => string; now: Date
  onClose: () => void; onOpenCourse: (c: string) => void; onToggleAttendance: (code: string, n: number) => void; onDeletePersonal: (id: number) => void
}) {
  const { state } = academic
  const c = item.kind === "personal" ? "#0891B2" : color(item.courseCode)
  const r = item.courseCode ? courseResult(state, term, item.courseCode) : null
  const prof = item.courseCode ? professorOf(term, item.courseCode) : undefined
  const score = item.kind === "deadline" && r ? r.scores[item.assessmentIdx!] : null
  const status = item.assessmentId ? state.assessmentStatus[item.assessmentId] : undefined
  const days = daysUntil(item.start, now)
  const needed = r?.neededFor(90)
  const attended = item.kind === "session" && state.attendance[item.courseCode!]?.[item.sessionNumber!] === "present"

  return (
    <div className={`${card} p-4 flex flex-wrap items-center gap-x-6 gap-y-3`} style={{ borderLeft: `3px solid ${c}` }}>
      <div className="flex-1 min-w-[220px]">
        <p className="text-[11px] font-mono font-semibold" style={{ color: c }}>{item.courseCode ?? "Personal"}</p>
        <p className={`text-sm font-semibold ${fg}`}>{item.kind === "deadline" ? `${item.title} · ${item.weight}` : item.title}</p>
        <p className={`text-xs ${muted}`}>
          {fmtDay(item.start)}{!item.allDay && ` · ${fmtTime(item.start)}${item.kind !== "deadline" ? `–${fmtTime(item.end)}` : ""}`}
          {item.kind === "deadline" && (score != null ? ` · graded ${score}` : status === "done" ? " · submitted, awaiting grade" : days >= 0 ? ` · ${days} days left` : ` · ${-days} days late`)}
          {item.kind === "deadline" && score == null && needed != null && needed > 0 && needed <= 100 && ` · aim for ≥ ${Math.ceil(needed)} to keep 90`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.kind === "session" && (
          <button onClick={() => onToggleAttendance(item.courseCode!, item.sessionNumber!)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${attended ? "border-emerald-400/50 text-emerald-400" : "border-border"}`}>
            <Check className="h-3.5 w-3.5" /> {attended ? `Session ${item.sessionNumber} attended` : `Mark session ${item.sessionNumber} attended`}
          </button>
        )}
        {item.kind === "session" && prof && <a href={zoomUrl(prof.meetingId)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><Video className="h-3.5 w-3.5" /> Zoom</a>}
        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><ExternalLink className="h-3.5 w-3.5" /> Open in Canvas</a>}
        {item.courseCode && <button onClick={() => onOpenCourse(item.courseCode!)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><BookOpen className="h-3.5 w-3.5" /> Course</button>}
        {item.kind === "personal" && <button onClick={() => onDeletePersonal(item.personalId!)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:text-[hsl(var(--destructive))]"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
        <button onClick={onClose} aria-label="Close" className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--muted))] ${muted}`}><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

// ── Add personal event ──────────────────────────────────────────────────
function AddEvent({ term, onClose, onAdded }: { term: string; onClose: () => void; onAdded: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [title, setTitle] = useState("")
  const [startDate, setStart] = useState(today)
  const [endDate, setEnd] = useState("")
  const [type, setType] = useState("meeting")
  const [courseCode, setCourse] = useState("")
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (!title.trim()) return setError("Give the event a title.")
    setError(null)
    const res = await fetch("/api/user/calendar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), startDate, endDate: endDate || startDate, type, courseCode: courseCode || null }),
    }).catch(() => null)
    if (res?.ok) onAdded(); else setError("Event NOT saved. Try again.")
  }
  const input = "text-xs rounded-md px-2.5 py-1.5 bg-[hsl(var(--muted))] border border-border outline-none focus:border-[hsl(var(--primary))]"
  return (
    <div className={`${card} p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between"><p className={`text-sm font-medium ${fg}`}>New event</p><button onClick={onClose} aria-label="Close" className={muted}><X className="h-4 w-4" /></button></div>
      <div className="flex flex-wrap gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Exam revision, group call…" className={`${input} flex-1 min-w-[180px]`} />
        <input type="date" value={startDate} onChange={e => setStart(e.target.value)} className={input} aria-label="Start date" />
        <input type="date" value={endDate} onChange={e => setEnd(e.target.value)} className={input} aria-label="End date (optional)" />
        <select value={type} onChange={e => setType(e.target.value)} className={input} aria-label="Type">
          <option value="meeting">Meeting</option><option value="exam">Exam</option><option value="deadline">Deadline</option><option value="class">Class</option>
        </select>
        <select value={courseCode} onChange={e => setCourse(e.target.value)} className={input} aria-label="Course">
          <option value="">No course</option>
          {coursesOf(term).map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
        <button onClick={save} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Save</button>
      </div>
      {error && <p className="text-[11px] text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}

// ── Calendar subscription ───────────────────────────────────────────────
function FeedPanel({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { fetch("/api/calendar/feed").then(r => r.json()).then(d => setUrl(d.url ?? null)).catch(() => setUrl(null)) }, [])
  const create = async () => {
    setBusy(true)
    const d = await fetch("/api/calendar/feed", { method: "POST" }).then(r => r.json()).catch(() => null)
    setUrl(d?.url ?? null); setBusy(false)
  }
  const webcal = url?.replace(/^https?:/, "webcal:")
  return (
    <div className={`${card} p-4 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-sm font-medium ${fg}`}>Subscribe in Google or Apple Calendar</p>
          <p className={`text-[11px] ${muted}`}>Live sessions (15-min reminder), office hours, deadlines (2-day reminder) and your events. Updates automatically.</p>
        </div>
        <button onClick={onClose} aria-label="Close" className={muted}><X className="h-4 w-4" /></button>
      </div>
      {url === undefined ? <p className={`text-xs ${muted}`}>Loading…</p> : url === null ? (
        <button onClick={create} disabled={busy} className="self-start text-xs font-medium px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-50">Create my private link</button>
      ) : (
        <>
          <div className="flex gap-2">
            <input readOnly value={url} className="flex-1 text-[11px] font-mono rounded-md px-2.5 py-1.5 bg-[hsl(var(--muted))] border border-border" onFocus={e => e.target.select()} />
            <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal!)}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]">Add to Google Calendar</a>
            <a href={webcal} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]">Add to Apple Calendar</a>
            <button onClick={create} disabled={busy} className={`text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] ${muted}`}>Reset link</button>
          </div>
          <p className={`text-[10px] ${muted}`}>The link works like a password. If you share it by mistake, press Reset link and subscribe again.</p>
        </>
      )}
    </div>
  )
}
