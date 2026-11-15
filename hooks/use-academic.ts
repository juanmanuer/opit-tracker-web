"use client"

// Loads all academic data once and exposes safe mutators.
// Every write is optimistic but REVERTS if the server doesn't confirm it,
// so the screen never shows something that isn't saved.
import { useCallback, useEffect, useRef, useState } from "react"
import { GRADE_WEIGHTS, GRADED_TERMS } from "@/lib/grades"
import type { AcademicState, Bonus } from "@/lib/academic"

const emptyScores = (term: string) =>
  Object.fromEntries(Object.entries(GRADE_WEIGHTS[term] ?? {}).map(([code, w]) => [code, w.map(() => null as number | null)]))

const initial: AcademicState = {
  scores: Object.fromEntries(GRADED_TERMS.map(t => [t, emptyScores(t)])),
  official: {},
  attendance: {},
  practicesDone: new Set(),
  assessmentStatus: {},
}

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export function useAcademic() {
  const [state, setStateRaw] = useState<AcademicState>(initial)
  // Synchronous mirror: mutators read the CURRENT value before sending it to the server
  const ref = useRef<AcademicState>(initial)
  const setState = useCallback((fn: (s: AcademicState) => AcademicState) => {
    ref.current = fn(ref.current)
    setStateRaw(ref.current)
  }, [])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadScores = useCallback(async (term: string) => {
    const rows = await fetch(`/api/user/grades?term=${encodeURIComponent(term)}`).then(r => (r.ok ? r.json() : []))
    const sc = emptyScores(term)
    if (Array.isArray(rows)) rows.forEach((r: any) => {
      if (sc[r.courseCode] && r.assessmentIndex < sc[r.courseCode].length) sc[r.courseCode][r.assessmentIndex] = Number(r.score)
    })
    setState(s => ({ ...s, scores: { ...s.scores, [term]: sc } }))
  }, [setState])

  const loadBonuses = useCallback(async () => {
    const rows = await fetch("/api/user/bonus").then(r => (r.ok ? r.json() : []))
    if (!Array.isArray(rows)) return
    const map: Record<string, Record<string, Bonus>> = {}
    rows.forEach((r: any) => { (map[r.term] ??= {})[r.courseCode] = { live: r.live, practices: r.practices } })
    setState(s => ({ ...s, official: map }))
  }, [setState])

  const reload = useCallback(async () => {
    try {
      const [att, prac, ass] = await Promise.all([
        fetch("/api/user/attendance").then(r => (r.ok ? r.json() : [])),
        fetch("/api/user/practices").then(r => (r.ok ? r.json() : [])),
        fetch("/api/user/assessments").then(r => (r.ok ? r.json() : [])),
        ...GRADED_TERMS.map(loadScores),
        loadBonuses(),
      ])
      const attendance: AcademicState["attendance"] = {}
      if (Array.isArray(att)) att.forEach((r: any) => { (attendance[r.courseCode] ??= {})[r.lessonNumber] = r.status })
      setState(s => ({
        ...s,
        attendance,
        practicesDone: new Set(Array.isArray(prac) ? prac.filter((p: any) => p.completed).map((p: any) => p.practiceId) : []),
        assessmentStatus: Object.fromEntries(Array.isArray(ass) ? ass.map((a: any) => [a.assessmentId, a.status]) : []),
      }))
    } catch (e) {
      setError("Couldn't load your data. Refresh the page to try again.")
    } finally {
      setLoaded(true)
    }
  }, [loadScores, loadBonuses, setState])

  useEffect(() => { reload() }, [reload])

  // ── Mutators (same API calls and payloads as before) ───────────────────
  const toggleAttendance = useCallback(async (courseCode: string, lessonNumber: number) => {
    const previous = ref.current.attendance[courseCode]?.[lessonNumber]
    const next = (previous ?? "absent") === "present" ? "absent" : "present"
    setState(s => ({ ...s, attendance: { ...s.attendance, [courseCode]: { ...s.attendance[courseCode], [lessonNumber]: next } } }))
    try {
      await post("/api/user/attendance", { courseCode, lessonNumber, status: next })
    } catch {
      setState(s => {
        const copy = { ...s.attendance[courseCode] }
        if (previous === undefined) delete copy[lessonNumber]; else copy[lessonNumber] = previous
        return { ...s, attendance: { ...s.attendance, [courseCode]: copy } }
      })
      setError(`Attendance for ${courseCode} session ${lessonNumber} was NOT saved. Check your connection and try again.`)
    }
  }, [setState])

  const togglePractice = useCallback(async (practiceId: string) => {
    const completed = !ref.current.practicesDone.has(practiceId)
    const apply = (on: boolean) => setState(s => {
      const set = new Set(s.practicesDone); on ? set.add(practiceId) : set.delete(practiceId)
      return { ...s, practicesDone: set }
    })
    apply(completed)
    try {
      await post("/api/user/practices", { practiceId, completed })
    } catch {
      apply(!completed)
      setError("That practice was NOT saved. Try again.")
    }
  }, [setState])

  const setAssessmentStatus = useCallback(async (assessmentId: string, status: "todo" | "in-progress" | "done") => {
    const previous = ref.current.assessmentStatus[assessmentId] ?? "todo"
    setState(s => ({ ...s, assessmentStatus: { ...s.assessmentStatus, [assessmentId]: status } }))
    try {
      await post("/api/user/assessments", { assessmentId, status })
    } catch {
      setState(s => ({ ...s, assessmentStatus: { ...s.assessmentStatus, [assessmentId]: previous } }))
      setError("That assessment status was NOT saved. Try again.")
    }
  }, [setState])

  return { state, loaded, error, clearError: () => setError(null), reload, loadScores, loadBonuses, toggleAttendance, togglePractice, setAssessmentStatus }
}

export type Academic = ReturnType<typeof useAcademic>
