"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { initialAssessments, initialPractices, TERM_COURSES, type Term } from "@/lib/store"
import { Trophy, BookOpen, Calendar, TrendingUp, Clock } from "lucide-react"

interface Props {
  activeTerm: Term
}

interface GradeRecord {
  courseCode: string
  assessmentIndex: number
  score: number
}

function getGrade(score: number) {
  if (score >= 90) return { letter: "A+", color: "#3fb950" }
  if (score >= 85) return { letter: "A",  color: "#3fb950" }
  if (score >= 80) return { letter: "A-", color: "#3fb950" }
  if (score >= 75) return { letter: "B+", color: "#00bfff" }
  if (score >= 70) return { letter: "B",  color: "#00bfff" }
  if (score >= 65) return { letter: "B-", color: "#00bfff" }
  if (score >= 60) return { letter: "C+", color: "#e3b341" }
  if (score >= 55) return { letter: "C",  color: "#e3b341" }
  if (score >= 50) return { letter: "C-", color: "#e3b341" }
  return { letter: "F", color: "#f85149" }
}

function daysUntil(deadline: string): number | null {
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = deadline.split(" ")
  if (parts.length !== 2 || !months[parts[0]]) return null
  const due = new Date(2026, months[parts[0]], parseInt(parts[1]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number): string {
  if (days <= 0)  return "#6B7280"
  if (days <= 3)  return "#EF4444"
  if (days <= 7)  return "#EAB308"
  return "#22C55E"
}

export function ProgressDashboard({ activeTerm }: Props) {
  const courses = TERM_COURSES[activeTerm]
  const [assessmentStatuses, setAssessmentStatuses] = useState<Record<string, string>>({})
  const [practiceStatuses, setPracticeStatuses] = useState<Record<string, boolean>>({})
  const [attendance, setAttendance] = useState<Record<string, Record<number, string>>>({})
  const [grades, setGrades] = useState<GradeRecord[]>([])

  useEffect(() => {
    // Assessments
    fetch("/api/user/assessments")
      .then(r => r.json())
      .then((data: { assessmentId: string; status: string }[]) => {
        if (!Array.isArray(data)) return
        const map: Record<string, string> = {}
        data.forEach(d => { map[d.assessmentId] = d.status })
        setAssessmentStatuses(map)
      }).catch(console.error)

    // Practices
    fetch("/api/user/practices")
      .then(r => r.json())
      .then((data: { practiceId: string; completed: boolean }[]) => {
        if (!Array.isArray(data)) return
        const map: Record<string, boolean> = {}
        data.forEach(d => { map[d.practiceId] = d.completed })
        setPracticeStatuses(map)
      }).catch(console.error)

    // Attendance
    fetch("/api/user/attendance")
      .then(r => r.json())
      .then((data: { courseCode: string; lessonNumber: number; status: string }[]) => {
        if (!Array.isArray(data)) return
        const map: Record<string, Record<number, string>> = {}
        data.forEach(({ courseCode, lessonNumber, status }) => {
          if (!map[courseCode]) map[courseCode] = {}
          map[courseCode][lessonNumber] = status
        })
        setAttendance(map)
      }).catch(console.error)

    // Grades
    fetch(`/api/user/grades?term=${encodeURIComponent(activeTerm)}`)
      .then(r => r.json())
      .then((data: GradeRecord[]) => {
        if (!Array.isArray(data)) return
        setGrades(data)
      }).catch(console.error)
  }, [activeTerm])

  // ── Computed stats ──────────────────────────────────────────────────────

  const termAssessments = initialAssessments.filter(a =>
    courses.some(c => c.code === a.courseCode)
  )
  const doneAssessments = termAssessments.filter(a =>
    assessmentStatuses[a.id] === "done"
  ).length
  const assessmentPct = termAssessments.length > 0
    ? Math.round((doneAssessments / termAssessments.length) * 100) : 0

  const termPractices = initialPractices.filter(p =>
    courses.some(c => c.code === p.courseCode)
  )
  const donePractices = termPractices.filter(p => practiceStatuses[p.id]).length
  const practicePct = termPractices.length > 0
    ? Math.round((donePractices / termPractices.length) * 100) : 0

  const totalLessons = courses.length * 13
  const presentLessons = courses.reduce((sum, course) => {
    const courseAtt = attendance[course.code] ?? {}
    return sum + Object.values(courseAtt).filter(s => s === "present").length
  }, 0)
  const attendancePct = totalLessons > 0
    ? Math.round((presentLessons / totalLessons) * 100) : 0

  // Term average from grades
  const termGradeAvg = (() => {
    if (grades.length === 0) return null
    const courseScores = courses.map(course => {
      const courseGrades = grades.filter(g => g.courseCode === course.code)
      if (courseGrades.length === 0) return null

      // Match weights from TERM_DATA structure
      const weightMap: Record<string, number[]> = {
        "COMP-2001": [30, 35, 35],
        "COMP-2002": [30, 40, 30],
        "COMP-2003": [40, 10, 40, 10],
        "COMP-2004": [35, 35, 30],
        "COMP-2005": [50, 50],
      }
      const weights = weightMap[course.code] ?? []
      const score = courseGrades.reduce((sum, g) => {
        const w = weights[g.assessmentIndex] ?? 0
        return sum + (g.score * w) / 100
      }, 0)
      return score
    }).filter(s => s !== null) as number[]

    if (courseScores.length === 0) return null
    return courseScores.reduce((s, v) => s + v, 0) / courseScores.length
  })()

  // Upcoming deadlines (next 14 days, not done)
  const upcoming = termAssessments
    .filter(a => {
      if (a.deadline === "TBD") return false
      if (assessmentStatuses[a.id] === "done") return false
      const days = daysUntil(a.deadline)
      return days !== null && days >= 0 && days <= 14
    })
    .sort((a, b) => (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999))
    .slice(0, 3)

  // KPI cards
  const kpis = [
    {
      label: "Assessments Done",
      value: `${doneAssessments}/${termAssessments.length}`,
      sub: `${assessmentPct}% complete`,
      pct: assessmentPct,
      icon: BookOpen,
      color: "#4F46E5",
    },
    {
      label: "Practices Done",
      value: `${donePractices}/${termPractices.length}`,
      sub: `${practicePct}% complete`,
      pct: practicePct,
      icon: Trophy,
      color: "#059669",
    },
    {
      label: "Attendance",
      value: `${presentLessons}/${totalLessons}`,
      sub: `${attendancePct}% present`,
      pct: attendancePct,
      icon: Calendar,
      color: "#D97706",
    },
    {
      label: "Term Average",
      value: termGradeAvg !== null ? `${termGradeAvg.toFixed(1)}` : "—",
      sub: termGradeAvg !== null ? getGrade(termGradeAvg).letter : "No grades yet",
      pct: termGradeAvg ?? 0,
      icon: TrendingUp,
      color: termGradeAvg !== null ? getGrade(termGradeAvg).color : "#6B7280",
    },
  ]

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pb-4">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-border bg-[hsl(var(--card))] p-4 flex flex-col gap-3"
              style={{ borderLeft: `3px solid ${kpi.color}` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {kpi.label}
                </p>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.color + "22" }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]" style={{ color: kpi.color }}>
                  {kpi.value}
                </p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{kpi.sub}</p>
              </div>
              <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, kpi.pct)}%`, backgroundColor: kpi.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Per-course breakdown ── */}
      <div className="grid grid-cols-1 gap-3">
        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          Course Breakdown · {activeTerm}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {courses.map(course => {
            const courseAssessments = termAssessments.filter(a => a.courseCode === course.code)
            const courseDone = courseAssessments.filter(a => assessmentStatuses[a.id] === "done").length
            const coursePct = courseAssessments.length > 0
              ? Math.round((courseDone / courseAssessments.length) * 100) : 0

            const coursePractices = termPractices.filter(p => p.courseCode === course.code)
            const coursePracticeDone = coursePractices.filter(p => practiceStatuses[p.id]).length

            const courseAttendance = attendance[course.code] ?? {}
            const coursePresent = Object.values(courseAttendance).filter(s => s === "present").length

            const courseGrades = grades.filter(g => g.courseCode === course.code)
            const weightMap: Record<string, number[]> = {
              "COMP-2001": [30, 35, 35],
              "COMP-2002": [30, 40, 30],
              "COMP-2003": [40, 10, 40, 10],
              "COMP-2004": [35, 35, 30],
              "COMP-2005": [50, 50],
            }
            const weights = weightMap[course.code] ?? []
            const courseScore = courseGrades.length > 0
              ? courseGrades.reduce((sum, g) => sum + (g.score * (weights[g.assessmentIndex] ?? 0)) / 100, 0)
              : null
            const gradeInfo = courseScore !== null ? getGrade(courseScore) : null

            return (
              <div
                key={course.code}
                className="rounded-xl border border-border bg-[hsl(var(--card))] p-4"
                style={{ borderLeft: `3px solid ${course.color}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: course.color }}>
                      {course.code}
                    </p>
                    <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{course.name}</p>
                  </div>
                  {gradeInfo && courseScore !== null && (
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: gradeInfo.color }}>
                        {courseScore.toFixed(1)}
                      </p>
                      <p className="text-[10px] font-bold" style={{ color: gradeInfo.color }}>
                        {gradeInfo.letter}
                      </p>
                    </div>
                  )}
                </div>

                {/* Three mini progress bars */}
                <div className="flex flex-col gap-2">
                  {/* Assessments */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] w-20 shrink-0">Assessments</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${coursePct}%`, backgroundColor: course.color }} />
                    </div>
                    <span className="text-[9px] font-medium w-10 text-right" style={{ color: course.color }}>
                      {courseDone}/{courseAssessments.length}
                    </span>
                  </div>
                  {/* Practices */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] w-20 shrink-0">Practices</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: coursePractices.length > 0 ? `${Math.round((coursePracticeDone / coursePractices.length) * 100)}%` : "0%",
                          backgroundColor: course.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-medium w-10 text-right" style={{ color: course.color }}>
                      {coursePracticeDone}/{coursePractices.length}
                    </span>
                  </div>
                  {/* Attendance */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] w-20 shrink-0">Attendance</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((coursePresent / 13) * 100)}%`,
                          backgroundColor: course.color,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-medium w-10 text-right" style={{ color: course.color }}>
                      {coursePresent}/13
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Upcoming deadlines strip ── */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
            Upcoming Deadlines
          </p>
          <div className="grid grid-cols-3 gap-3">
            {upcoming.map(a => {
              const days = daysUntil(a.deadline) ?? 0
              const color = urgencyColor(days)
              const course = courses.find(c => c.code === a.courseCode)
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-border bg-[hsl(var(--card))] p-3 flex flex-col gap-2"
                  style={{ borderTop: `3px solid ${color}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: course?.color ?? "#6B7280" }}>
                      {a.courseCode}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color + "22", color }}>
                      {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d left`}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{a.title}</p>
                  <div className="flex items-center gap-1 text-[9px] text-[hsl(var(--muted-foreground))]">
                    <Clock className="h-2.5 w-2.5" />
                    {a.deadline} · {a.weight}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}