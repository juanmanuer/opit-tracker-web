"use client"

import { useEffect, useMemo, useState } from "react"
import { X, RefreshCw, Target, Award, ChevronDown, PieChart, KeyRound, Radio, CheckSquare } from "lucide-react"
import { TERM_COURSES, initialPractices, type Term } from "@/lib/store"
import { GRADE_WEIGHTS, GRADED_TERMS, getGrade, courseStats } from "@/lib/grades"

type Scores = Record<string, (number | null)[]>          // courseCode -> scores per assessment
type Bonus = { live: boolean | null; practices: boolean | null }
type Conflict = { courseCode: string; idx: number; name: string; canvas: number; app: number }
type TokenStatus = { source: "database" | "env" | "none"; expiresAt: string | null; daysLeft: number | null; lastRenewed: string | null; lastError: string | null }
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
  const defaultTerm = GRADE_WEIGHTS[activeTerm] ? activeTerm : GRADED_TERMS[GRADED_TERMS.length - 1]
  const [term, setTerm] = useState<string>(defaultTerm)   // term shown in the cards (click a term card to switch)
  const [allScores, setAllScores] = useState<Record<string, Scores>>(
    Object.fromEntries(GRADED_TERMS.map(t => [t, emptyScores(t)]))
  )
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [target, setTarget] = useState(90)
  const [attendance, setAttendance] = useState<Record<string, number>>({})        // courseCode -> live sessions attended
  const [practicesDone, setPracticesDone] = useState<Set<string>>(new Set())      // completed practice ids
  const [official, setOfficial] = useState<Record<string, Record<string, Bonus>>>({}) // Canvas bonuses: term -> code
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [canvas, setCanvas] = useState<Record<string, number | null>>({})
  const [sync, setSync] = useState<{ state: "idle" | "syncing" | "ok" | "error"; msg?: string }>({ state: "idle" })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [token, setToken] = useState<TokenStatus | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [tokenInput, setTokenInput] = useState("")
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenMsg, setTokenMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // ── Canvas token status ────────────────────────────────────────────────
  const loadToken = () =>
    fetch("/api/canvas/token").then(r => (r.ok ? r.json() : null)).then(d => d && !d.error && setToken(d)).catch(() => {})
  useEffect(() => { loadToken() }, [])

  const tokenAction = async (body: object, okText: string) => {
    setTokenBusy(true); setTokenMsg(null)
    try {
      const res = await fetch("/api/canvas/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setToken(data); setTokenInput(""); setTokenMsg({ ok: true, text: okText })
    } catch (err) {
      setTokenMsg({ ok: false, text: String(err).replace("Error: ", "") })
    } finally {
      setTokenBusy(false)
    }
  }

  const tokenTone =
    !token || token.source === "none" || token.lastError || (token.daysLeft !== null && token.daysLeft <= 3) ? "bad"
    : token.source === "env" || (token.daysLeft !== null && token.daysLeft < 10) ? "warn" : "good"
  const toneClass = { good: "text-emerald-400 border-emerald-400/40", warn: "text-amber-400 border-amber-400/40", bad: "text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.5)]" }[tokenTone]
  const tokenLabel = !token ? "Canvas token" : token.source === "none" ? "No Canvas token"
    : token.daysLeft !== null ? (token.daysLeft <= 0 ? "Token expired" : `Token · ${token.daysLeft}d`) : "Token · not managed"

  // ── Load saved data (read-only) ───────────────────────────────────────
  const loadScores = (t: string) =>
    fetch(`/api/user/grades?term=${encodeURIComponent(t)}`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: { courseCode: string; assessmentIndex: number; score: number }[]) => {
        const sc = emptyScores(t)
        if (Array.isArray(rows)) {
          rows.forEach(r => {
            if (sc[r.courseCode] && r.assessmentIndex < sc[r.courseCode].length) sc[r.courseCode][r.assessmentIndex] = Number(r.score)
          })
        }
        return [t, sc] as const
      })

  const loadBonuses = () =>
    fetch("/api/user/bonus").then(r => (r.ok ? r.json() : [])).then((rows: ({ term: string; courseCode: string } & Bonus)[]) => {
      if (!Array.isArray(rows)) return
      const map: Record<string, Record<string, Bonus>> = {}
      rows.forEach(r => { (map[r.term] ??= {})[r.courseCode] = { live: r.live, practices: r.practices } })
      setOfficial(map)
    }).catch(() => {})

  useEffect(() => {
    Promise.all(GRADED_TERMS.map(loadScores))
      .then(entries => setAllScores(Object.fromEntries(entries)))
      .catch(console.error)
      .finally(() => setLoaded(true))

    fetch("/api/user/attendance").then(r => (r.ok ? r.json() : [])).then((rows: { courseCode: string; status: string }[]) => {
      if (!Array.isArray(rows)) return
      const count: Record<string, number> = {}
      rows.forEach(r => { if (r.status === "present") count[r.courseCode] = (count[r.courseCode] ?? 0) + 1 })
      setAttendance(count)
    }).catch(() => {})

    fetch("/api/user/practices").then(r => (r.ok ? r.json() : [])).then((rows: { practiceId: string; completed: boolean }[]) => {
      if (Array.isArray(rows)) setPracticesDone(new Set(rows.filter(r => r.completed).map(r => r.practiceId)))
    }).catch(() => {})

    loadBonuses()
  }, [])

  // ── Canvas sync ────────────────────────────────────────────────────────
  const runSync = async () => {
    setSync({ state: "syncing" })
    try {
      const res = await fetch(`/api/canvas/sync?term=${encodeURIComponent(term)}`)
      const data = await res.json()
      if (data?.code === "TOKEN_INVALID") setShowToken(true)
      if (!res.ok || !Array.isArray(data)) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setCanvas(Object.fromEntries((data as CanvasInfo[]).map(c => [c.courseCode, c.gradeInfo?.currentScore ?? null])))
      const failed = (data as CanvasInfo[]).filter(c => c.error).map(c => c.courseCode)

      // Per-assessment import: fills empty boxes + official bonuses, returns differences
      const imp = await fetch(`/api/canvas/import?term=${encodeURIComponent(term)}`).then(r => r.json())
      if (imp.error) throw new Error(imp.error)
      const [, fresh] = await loadScores(term)
      setAllScores(prev => ({ ...prev, [term]: fresh }))
      await loadBonuses()
      setConflicts(imp.conflicts ?? [])
      setAccepted(new Set((imp.conflicts ?? []).map((c: Conflict) => `${c.courseCode}-${c.idx}`)))

      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const filledTxt = imp.filled?.length ? ` · ${imp.filled.length} new grade${imp.filled.length > 1 ? "s" : ""} added` : ""
      setSync(failed.length || imp.errors?.length
        ? { state: "error", msg: `Synced, but failed for ${[...failed, ...(imp.errors ?? []).map((e: string) => e.split(":")[0])].join(", ")}` }
        : { state: "ok", msg: `Synced at ${time}${filledTxt}` })
    } catch (err) {
      setSync({ state: "error", msg: `Sync failed: ${String(err).replace("Error: ", "")}` })
    }
  }

  const applyConflicts = async () => {
    setApplying(true)
    try {
      const accept = conflicts.filter(c => accepted.has(`${c.courseCode}-${c.idx}`)).map(c => ({ courseCode: c.courseCode, idx: c.idx, score: c.canvas }))
      const res = await fetch("/api/canvas/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ term, accept }) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const [, fresh] = await loadScores(term)
      setAllScores(prev => ({ ...prev, [term]: fresh }))
      setConflicts([])
    } catch {
      setSaveError("Couldn't apply the Canvas grades. Try again.")
    } finally {
      setApplying(false)
    }
  }

  const switchTerm = (t: string) => { setTerm(t); setExpanded(null); setCanvas({}); setConflicts([]) }

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
  // Bonus per course: +5 live (≥7 of 13 live sessions) and +5 practices (all done).
  // Canvas's official bonus wins once it's graded; until then it's computed from your app data.
  const bonusInfo = (t: string, code: string) => {
    const off = official[t]?.[code]
    const attended = attendance[code] ?? 0
    const practices = initialPractices.filter(p => p.courseCode === code)
    const done = practices.filter(p => practicesDone.has(p.id)).length
    const live = off?.live ?? (attended >= 7)
    const prac = off?.practices ?? (practices.length > 0 && done === practices.length)
    return {
      live, prac, attended, done, totalPractices: practices.length,
      liveOfficial: off?.live != null, pracOfficial: off?.practices != null,
      points: (live ? 5 : 0) + (prac ? 5 : 0),
    }
  }

  const termSummary = (t: string) => {
    const weights = GRADE_WEIGHTS[t] ?? {}
    const stats = Object.entries(weights).map(([code, w]) => ({ ...courseStats(w, allScores[t]?.[code] ?? []), bonus: bonusInfo(t, code).points }))
    const totals = stats.filter(s => s.average !== null).map(s => Math.min(110, s.average! + s.bonus))
    const raw = stats.map(s => s.average).filter((a): a is number => a !== null)
    const graded = Object.values(allScores[t] ?? {}).flat().filter(v => v !== null).length
    const total = Object.values(weights).flat().length
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
    return { stats, average: mean(totals), rawAverage: mean(raw), graded, total }
  }

  const current = termSummary(term)
  const termAvg = current.average

  // Average needed on all remaining work to finish the term at `target`
  const needed = useMemo(() => {
    const n = current.stats.length
    const banked = current.stats.reduce((s, c) => s + c.earned + c.bonus, 0)
    const remaining = current.stats.reduce((s, c) => s + c.remainingWeight, 0)
    if (n === 0 || remaining === 0) return null
    return (((target * n) - banked) / remaining) * 100
  }, [current.stats, target])

  const courses = TERM_COURSES[term as Term] ?? []
  const ringPct = termAvg !== null ? Math.min(100, (termAvg / 110) * 100) : 0
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
            {/* Term switcher */}
            <div role="tablist" aria-label="Term" className="flex items-center gap-0.5 p-0.5 rounded-full bg-[hsl(var(--muted))]">
              {GRADED_TERMS.map(t => (
                <button key={t} role="tab" aria-selected={t === term} onClick={() => switchTerm(t)}
                  className={`text-[11px] font-medium px-3 py-1 rounded-full transition-colors ${t === term
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : `${muted} hover:text-[hsl(var(--foreground))]`}`}>
                  {t}{t === defaultTerm && t !== term && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] align-middle" title="Current term" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-[11px] ${sync.state === "error" ? "text-[hsl(var(--destructive))]" : muted}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sync.state === "ok" ? "bg-emerald-400" : sync.state === "error" ? "bg-[hsl(var(--destructive))]" : "bg-[hsl(var(--muted-foreground))]"}`} />
              {sync.state === "syncing" ? "Syncing with Canvas…" : sync.msg ?? "Canvas not synced yet"}
            </span>
            <button onClick={() => setShowToken(p => !p)} title="Canvas access token"
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[hsl(var(--muted))] ${toneClass}`}>
              <KeyRound className="h-3.5 w-3.5" /> {tokenLabel}
            </button>
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

        {/* Canvas token panel */}
        {(showToken || tokenTone === "bad") && (
          <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className={`text-sm font-medium ${fg}`}>Canvas connection and alerts</p>
                <p className={`text-[11px] ${muted}`}>
                  {!token ? "Checking…"
                    : token.source === "database"
                      ? <>Renews automatically when fewer than 10 days remain{token.expiresAt && <> · expires {new Date(token.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>}{token.lastRenewed && <> · last renewed {new Date(token.lastRenewed).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>}</>
                      : token.source === "env"
                        ? "Using the token from Vercel settings. Press Renew now once to switch on automatic renewal."
                        : "No token yet. Paste one below."}
                </p>
                {token?.lastError && <p className="text-[11px] mt-1 text-[hsl(var(--destructive))]">{token.lastError}</p>}
              </div>
              <div className="flex gap-2">
              <button onClick={() => tokenAction({ action: "test-alert" }, "Test alert sent. Check your email and phone.")} disabled={tokenBusy}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] disabled:opacity-50">
                Send test alert
              </button>
              <button onClick={() => tokenAction({ action: "renew" }, "Renewed. Automatic renewal is on.")} disabled={tokenBusy || token?.source === "none"}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${tokenBusy ? "animate-spin" : ""}`} /> Renew now
              </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Paste a new Canvas token" autoComplete="off"
                className="flex-1 min-w-[200px] text-xs rounded-md px-2.5 py-1.5 bg-[hsl(var(--muted))] border border-border outline-none focus:border-[hsl(var(--primary))]" />
              <button onClick={() => tokenAction({ token: tokenInput }, "Token saved.")} disabled={tokenBusy || tokenInput.trim().length < 20}
                className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-50">
                Save token
              </button>
            </div>
            <p className={`text-[11px] ${muted}`}>New token: Canvas → Account → Settings → + New Access Token. It's stored encrypted and never shown again.</p>
            {tokenMsg && <p className={`text-[11px] ${tokenMsg.ok ? "text-emerald-400" : "text-[hsl(var(--destructive))]"}`}>{tokenMsg.text}</p>}
          </div>
        )}

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
                <button key={t} onClick={() => switchTerm(t)} title={`Show ${t}`}
                  className={`text-left rounded-xl bg-card p-3 border transition-colors hover:border-[hsl(var(--primary)/0.4)] ${isCurrent ? "border-[hsl(var(--primary)/0.6)]" : "border-border"}`}>
                  <p className={`text-[11px] ${muted}`}>{t}</p>
                  <p className={`text-2xl font-semibold ${fg}`}>{s.average !== null ? s.average.toFixed(1) : "—"}</p>
                  <p className={`text-[11px] ${complete ? "text-emerald-400" : isCurrent ? "text-[hsl(var(--primary))]" : muted}`}>
                    {complete ? "Completed" : t === defaultTerm ? "In progress" : `${s.graded}/${s.total} grades`}
                    {s.rawAverage !== null && s.average !== null && s.average - s.rawAverage > 0.05 && <span className={muted}> · {s.rawAverage.toFixed(1)} without bonus</span>}
                  </p>
                </button>
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
              <span className={`flex items-center gap-1.5 text-[10px] ml-auto ${muted}`}>
                <Award className="h-3 w-3" /> Bonus automatic: +5 live (7/13) · +5 all practices · max 110
              </span>
            </div>
          </div>
        </div>

        {/* Review: Canvas differs from what you entered */}
        {conflicts.length > 0 && (
          <div className="rounded-2xl bg-card border border-amber-400/40 p-4 flex flex-col gap-3">
            <div>
              <p className={`text-sm font-medium ${fg}`}>Canvas has different grades for {conflicts.length} assessment{conflicts.length > 1 ? "s" : ""}</p>
              <p className={`text-[11px] ${muted}`}>Nothing has been changed. Tick the ones to replace with the Canvas value.</p>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {conflicts.map(c => {
                const k = `${c.courseCode}-${c.idx}`
                return (
                  <label key={k} className="flex items-center gap-3 py-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={accepted.has(k)}
                      onChange={() => setAccepted(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })} />
                    <span className={`font-mono text-[10px] ${muted}`}>{c.courseCode}</span>
                    <span className={`flex-1 truncate ${fg}`}>A{c.idx + 1} · {c.name.replace(/^[^A-Za-z]+/, "")}</span>
                    <span className={muted}>yours <b className={fg}>{c.app}</b></span>
                    <span className={muted}>→ Canvas <b className="text-emerald-400">{c.canvas}</b></span>
                  </label>
                )
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConflicts([])} className={`text-[11px] px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] ${muted}`}>Keep mine</button>
              <button onClick={applyConflicts} disabled={applying || accepted.size === 0}
                className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-50">
                {applying ? "Applying…" : `Use Canvas for ${accepted.size}`}
              </button>
            </div>
          </div>
        )}

        {/* Course cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => {
            const weights = GRADE_WEIGHTS[term]?.[course.code]
            if (!weights) return null
            const scores = allScores[term]?.[course.code] ?? []
            const st = courseStats(weights, scores)
            const b = bonusInfo(term, course.code)
            const avg = st.average !== null ? Math.min(110, st.average + b.points) : null
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
                    {(b.attended > 0 || b.liveOfficial) && (
                      <span title={b.liveOfficial ? "Live-session bonus (official, from Canvas)" : `${b.attended} of 13 live sessions attended — 7 needed`}
                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${b.live ? "bg-emerald-400/15 text-emerald-400" : `bg-[hsl(var(--muted))] ${muted}`}`}>
                        <Radio className="h-3 w-3" />{b.liveOfficial ? (b.live ? "+5" : "0") : b.live ? "+5" : `${b.attended}/7`}
                      </span>
                    )}
                    {(b.totalPractices > 0 || b.pracOfficial) && (
                      <span title={b.pracOfficial ? "Practices bonus (official, from Canvas)" : `${b.done} of ${b.totalPractices} practices done`}
                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${b.prac ? "bg-emerald-400/15 text-emerald-400" : `bg-[hsl(var(--muted))] ${muted}`}`}>
                        <CheckSquare className="h-3 w-3" />{b.pracOfficial ? (b.prac ? "+5" : "0") : b.prac ? "+5" : `${b.done}/${b.totalPractices}`}
                      </span>
                    )}
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
