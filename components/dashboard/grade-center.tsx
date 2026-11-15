"use client"

import { useEffect, useMemo, useState } from "react"
import { X, RefreshCw, Target, Award, ChevronDown, PieChart } from "lucide-react"
import { TERM_COURSES, type Term } from "@/lib/store"
import { GRADE_WEIGHTS, GRADED_TERMS, getGrade, courseStats } from "@/lib/grades"

type Scores = Record<string, (number | null)[]>          // courseCode -> scores per assessment
type CanvasInfo = { courseCode: string; gradeInfo: { currentScore?: number | null } | null; error?: string | null }

interface Props {
  activeTerm: Term
  onClose: () => void
}

const muted = "text-[hsl(var(--muted-foreground))]"
const fg = "text-[hsl(var(--foreground))]"

function emptyScores(term: string): Scores {
  const weights = GRADE_WEIGHTS[term] ?? {}
  return Object.fromEntries(Object.entries(weights).map(([code, w]) => [code, w.map(() => null)]))
}

export function GradeCenter({ activeTerm, onClose }: Props) {
  const term = GRADE_WEIGHTS[activeTerm] ? activeTerm : GRADED_TERMS[GRADED_TERMS.length - 1]
  const [allScores, setAllScores] = useState<Record<string, Scores>>(
    Object.fromEntries(GRADED_TERMS.map(t => [t, emptyScores(t)]))
  )
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [target, setTarget] = useState(90)
  const [bonusAttendance, setBonusAttendance] = useState(false)
  const [bonusPractice, setBonusPractice] = useState(false)
  const [canvas, setCanvas] = useState<Record<string, number | null>>({})
  const [sync, setSync] = useState<{ state: "idle" | "syncing" | "ok" | "error"; msg?: string }>({ state: "idle" })
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Load saved scores for every term (read-only) ───────────────────────
  useEffect(() => {
    Promise.all(
      GRADED_TERMS.map(t =>
        fetch(`/api/user/grades?term=${encodeURIComponent(t)}`)
          .then(r => (r.ok ? r.json() : []))
          .then((rows: { courseCode: string; assessmentIndex: number; score: number }[]) => {
            const s = emptyScores(t)
            if (Array.isArray(rows)) {
              rows.forEach(r => {
                if (s[r.courseCode] && r.assessmentIndex < s[r.courseCode].length) {
                  s[r.courseCode][r.assessmentIndex] = Number(r.score)
                }
              })
            }
            return [t, s] as const
          })
      )
    )
      .then(entries => setAllScores(Object.fromEntries(entries)))
      .catch(console.error)
      .finally(() => setLoaded(true))
  }, [])

  // ── Canvas sync ────────────────────────────────────────────────────────
  const runSync = async () => {
    setSync({ state: "syncing" })
    try {
      const res = await fetch(`/api/canvas/sync?term=${encodeURIComponent(term)}`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setCanvas(Object.fromEntries((data as CanvasInfo[]).map(c => [c.courseCode, c.gradeInfo?.currentScore ?? null])))
      const failed = (data as CanvasInfo[]).filter(c => c.error).map(c => c.courseCode)
      setSync(failed.length
        ? { state: "error", msg: `Synced, but failed for ${failed.join(", ")}` }
        : { state: "ok", msg: `Synced at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` })
    } catch (err) {
      setSync({ state: "error", msg: `Sync failed: ${String(err).replace("Error: ", "")}` })
    }
  }

  // ── Edit one score (saved when you leave the box or press Enter) ─────────
  const setLocal = (code: string, idx: number, value: number | null) =>
    setAllScores(prev => ({
      ...prev,
      [term]: { ...prev[term], [code]: prev[term][code].map((v, i) => (i === idx ? value : v)) },
    }))

  const persist = async (code: string, idx: number, value: number | null) => {
    setSaveError(null)
    try {
      const res = await fetch("/api/user/grades", {
        method: value === null ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, courseCode: code, assessmentIndex: idx, ...(value !== null && { score: value }) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      setSaveError("Couldn't save that score. Check your connection and try again.")
    }
  }

  // ── Calculations ───────────────────────────────────────────────────────
  const bonus = (bonusAttendance ? 5 : 0) + (bonusPractice ? 5 : 0)

  const termSummary = (t: string) => {
    const weights = GRADE_WEIGHTS[t] ?? {}
    const stats = Object.entries(weights).map(([code, w]) => courseStats(w, allScores[t]?.[code] ?? []))
    const avgs = stats.map(s => s.average).filter((a): a is number => a !== null)
    const graded = Object.values(allScores[t] ?? {}).flat().filter(v => v !== null).length
    const total = Object.values(weights).flat().length
    return { stats, average: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null, graded, total }
  }

  const current = termSummary(term)
  const termAvg = current.average !== null ? Math.min(110, current.average + bonus) : null

  // Average needed on all remaining work to finish the term at `target`
  const needed = useMemo(() => {
    const n = current.stats.length
    const banked = current.stats.reduce((s, c) => s + c.earned, 0)
    const remaining = current.stats.reduce((s, c) => s + c.remainingWeight, 0)
    if (n === 0 || remaining === 0) return null
    return ((((target - bonus) * n) - banked) / remaining) * 100
  }, [current.stats, target, bonus])

  const courses = TERM_COURSES[term as Term] ?? []
  const ringPct = termAvg !== null ? Math.min(100, termAvg) : 0
  const R = 44, C = 2 * Math.PI * R

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[hsl(var(--background)/0.97)] backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-[hsl(var(--primary)/0.12)]">
              <PieChart className="h-4 w-4 text-[hsl(var(--primary))]" />
            </div>
            <h2 className={`text-base font-semibold ${fg}`}>Grade center</h2>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">{term}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-[11px] ${sync.state === "error" ? "text-[hsl(var(--destructive))]" : muted}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sync.state === "ok" ? "bg-emerald-400" : sync.state === "error" ? "bg-[hsl(var(--destructive))]" : "bg-[hsl(var(--muted-foreground))]"}`} />
              {sync.state === "syncing" ? "Syncing with Canvas…" : sync.msg ?? "Canvas not synced yet"}
            </span>
            <button onClick={runSync} disabled={sync.state === "syncing"}
              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${sync.state === "syncing" ? "animate-spin" : ""}`} /> Sync
            </button>
            <button onClick={onClose} aria-label="Close" className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--muted))] ${muted}`}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {saveError && <p className="text-xs text-[hsl(var(--destructive))]">{saveError}</p>}

        {/* Top: ring + term history + target */}
        <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
          <div className="rounded-2xl bg-card border border-border p-4 flex flex-col items-center justify-center">
            <svg width="112" height="112" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
              <circle cx="56" cy="56" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
                stroke={termAvg !== null ? getGrade(termAvg).color : "transparent"}
                strokeDasharray={C} strokeDashoffset={C * (1 - ringPct / 100)}
                transform="rotate(-90 56 56)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              <text x="56" y="56" textAnchor="middle" className="fill-[hsl(var(--foreground))]" style={{ fontSize: 24, fontWeight: 600 }}>
                {termAvg !== null ? termAvg.toFixed(1) : "—"}
              </text>
              <text x="56" y="74" textAnchor="middle" className="fill-[hsl(var(--muted-foreground))]" style={{ fontSize: 11 }}>
                {termAvg !== null ? `${getGrade(termAvg).letter} · average` : "no grades yet"}
              </text>
            </svg>
            <span className={`text-[11px] mt-1 ${muted}`}>{loaded ? `${current.graded} of ${current.total} grades in` : "Loading…"}</span>
          </div>

          <div className="grid gap-3 grid-cols-3">
            {GRADED_TERMS.map(t => {
              const s = termSummary(t)
              const isCurrent = t === term
              const complete = s.total > 0 && s.graded === s.total
              return (
                <div key={t} className={`rounded-xl bg-card p-3 border ${isCurrent ? "border-[hsl(var(--primary)/0.6)]" : "border-border"}`}>
                  <p className={`text-[11px] ${muted}`}>{t}</p>
                  <p className={`text-2xl font-semibold ${fg}`}>{s.average !== null ? s.average.toFixed(1) : "—"}</p>
                  <p className={`text-[11px] ${complete ? "text-emerald-400" : isCurrent ? "text-[hsl(var(--primary))]" : muted}`}>
                    {complete ? "Completed" : isCurrent ? "In progress" : `${s.graded}/${s.total} grades`}
                  </p>
                </div>
              )
            })}

            <div className="col-span-3 rounded-xl bg-card border border-border px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className={`flex items-center gap-2 text-xs ${muted}`}>
                <Target className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Target</span>
                <input type="number" min={0} max={100} value={target}
                  onChange={e => setTarget(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-14 text-center text-sm font-semibold rounded-md px-1 py-0.5 bg-[hsl(var(--muted))] border border-border text-amber-400 outline-none" />
                <span>
                  {needed === null ? "— all work graded"
                    : needed <= 0 ? "— already secured"
                    : needed > 100 ? <>— needs <b className="text-[hsl(var(--destructive))]">{Math.ceil(needed)}</b> on remaining work (not reachable)</>
                    : <>— you need an average of <b className={fg}>{Math.ceil(needed)}</b> on remaining work</>}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {[["+5 Attendance", bonusAttendance, setBonusAttendance], ["+5 Practices", bonusPractice, setBonusPractice]].map(([label, on, set]) => (
                  <button key={label as string} onClick={() => (set as (f: (p: boolean) => boolean) => void)(p => !p)}
                    className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-colors ${on ? "border-[hsl(var(--primary)/0.6)] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]" : `border-border ${muted}`}`}>
                    <Award className="h-3 w-3" /> {label as string}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Course cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => {
            const weights = GRADE_WEIGHTS[term]?.[course.code]
            if (!weights) return null
            const scores = allScores[term]?.[course.code] ?? []
            const st = courseStats(weights, scores)
            const avg = st.average !== null ? Math.min(110, st.average + bonus) : null
            const isOpen = expanded === course.code
            const canvasScore = canvas[course.code]
            return (
              <div key={course.code} className="rounded-2xl bg-card border border-border p-4 transition-colors hover:border-[hsl(var(--primary)/0.4)]">
                <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : course.code)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono font-semibold" style={{ color: course.color }}>{course.code}</p>
                      <p className={`text-sm font-medium truncate ${fg}`}>{course.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-semibold leading-none" style={{ color: avg !== null ? getGrade(avg).color : undefined }}>
                        {avg !== null ? avg.toFixed(1) : <span className={muted}>—</span>}
                      </p>
                      <p className={`text-[10px] mt-1 ${muted}`}>{avg !== null ? getGrade(avg).letter : "no grades"}</p>
                    </div>
                  </div>

                  {/* earned / lost / pending bar (out of 100 course points) */}
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-[hsl(var(--muted))] mt-3 mb-2.5">
                    <div style={{ width: `${st.earned}%`, backgroundColor: course.color, transition: "width 0.5s" }} />
                    <div style={{ width: `${st.lost}%`, backgroundColor: course.color, opacity: 0.3, transition: "width 0.5s" }} />
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {weights.map((w, i) => (
                      <span key={i} title={`Assessment ${i + 1} · ${w}%`}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${scores[i] !== null ? "font-medium" : `border border-dashed border-border ${muted}`}`}
                        style={scores[i] !== null ? { backgroundColor: course.color + "22", color: course.color } : undefined}>
                        A{i + 1} {scores[i] !== null ? scores[i] : "·"}
                      </span>
                    ))}
                    {canvasScore != null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">Canvas {canvasScore}%</span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 ml-auto ${muted} transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Edit scores */}
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                    {weights.map((w, i) => (
                      <label key={i} className="flex items-center justify-between gap-2">
                        <span className={`text-xs ${fg}`}>Assessment {i + 1} <span className={muted}>· {w}%</span></span>
                        <span className="flex items-center gap-2">
                          {scores[i] !== null && <span className={`text-[10px] ${muted}`}>+{((scores[i]! * w) / 100).toFixed(1)} pts</span>}
                          <input type="number" min={0} max={100} placeholder="—"
                            value={scores[i] ?? ""}
                            onChange={e => {
                              const v = e.target.value === "" ? null : Math.min(100, Math.max(0, parseFloat(e.target.value)))
                              setLocal(course.code, i, v === null || isNaN(v) ? null : v)
                            }}
                            onBlur={() => persist(course.code, i, scores[i] ?? null)}
                            onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                            className="w-16 text-center text-sm font-semibold rounded-md px-1 py-1 bg-[hsl(var(--muted))] border border-border outline-none focus:border-[hsl(var(--primary))]"
                            style={{ color: scores[i] !== null ? course.color : undefined }} />
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className={`flex flex-wrap gap-4 text-[11px] ${muted}`}>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[hsl(var(--primary))]" /> Points earned</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[hsl(var(--primary)/0.3)]" /> Points lost</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[hsl(var(--muted))]" /> Still to come</span>
          <span className="ml-auto">Tap a course to edit its scores · saved automatically</span>
        </div>
      </div>
    </div>
  )
}
