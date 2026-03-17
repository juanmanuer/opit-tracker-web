"use client"

import { useState } from "react"
import { X, Award, Zap, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Term } from "@/lib/store"

interface Assessment {
  label: string
  weight: number
  score: number | null
}

interface Course {
  code: string
  name: string
  color: string
  assessments: Assessment[]
}

const TERM_DATA: Record<string, Course[]> = {
  "Term 1": [
    {
      code: "COMP-1001", name: "Technical English", color: "#4F46E5",
      assessments: [
        { label: "Assessment 1", weight: 20, score: null },
        { label: "Assessment 2", weight: 20, score: null },
        { label: "Assessment 3", weight: 25, score: null },
        { label: "Assessment 4", weight: 35, score: null },
      ]
    },
    {
      code: "COMP-1002", name: "Computer Networks", color: "#059669",
      assessments: [
        { label: "Assessment 1", weight: 30, score: null },
        { label: "Assessment 2", weight: 30, score: null },
        { label: "Assessment 3", weight: 30, score: null },
        { label: "Assessment 4", weight: 10, score: null },
      ]
    },
    {
      code: "COMP-1003", name: "Programming Principles", color: "#DC2626",
      assessments: [
        { label: "Assessment 1", weight: 40, score: null },
        { label: "Assessment 2", weight: 60, score: null },
      ]
    },
    {
      code: "COMP-1004", name: "Computer Architectures", color: "#D97706",
      assessments: [
        { label: "Assessment 1", weight: 20, score: null },
        { label: "Assessment 2", weight: 30, score: null },
        { label: "Assessment 3", weight: 20, score: null },
        { label: "Assessment 4", weight: 30, score: null },
      ]
    },
    {
      code: "COMP-1005", name: "ICT Fundamentals", color: "#7C3AED",
      assessments: [
        { label: "Assessment 1", weight: 30, score: null },
        { label: "Assessment 2", weight: 30, score: null },
        { label: "Assessment 3", weight: 30, score: null },
        { label: "Assessment 4", weight: 10, score: null },
      ]
    },
  ],
  "Term 2": [
    {
      code: "COMP-2001", name: "Foundational Mathematics", color: "#4F46E5",
      assessments: [
        { label: "Assessment 1", weight: 30, score: null },
        { label: "Assessment 2", weight: 35, score: null },
        { label: "Assessment 3", weight: 35, score: null },
      ]
    },
    {
      code: "COMP-2002", name: "Web Development", color: "#059669",
      assessments: [
        { label: "Assessment 1", weight: 30, score: null },
        { label: "Assessment 2", weight: 40, score: null },
        { label: "Assessment 3", weight: 30, score: null },
      ]
    },
    {
      code: "COMP-2003", name: "Introduction to Operating Systems", color: "#DC2626",
      assessments: [
        { label: "Assessment 1", weight: 40, score: null },
        { label: "Assessment 2", weight: 10, score: null },
        { label: "Assessment 3", weight: 40, score: null },
        { label: "Assessment 4", weight: 10, score: null },
      ]
    },
    {
      code: "COMP-2004", name: "Data Structure and Algorithms", color: "#D97706",
      assessments: [
        { label: "Assessment 1", weight: 35, score: null },
        { label: "Assessment 2", weight: 35, score: null },
        { label: "Assessment 3", weight: 30, score: null },
      ]
    },
    {
      code: "COMP-2005", name: "Project Management and QA", color: "#7C3AED",
      assessments: [
        { label: "Assessment 1", weight: 50, score: null },
        { label: "Assessment 2", weight: 50, score: null },
      ]
    },
  ],
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: "A+", color: "hsl(160,100%,50%)" }
  if (score >= 85) return { letter: "A",  color: "hsl(160,100%,50%)" }
  if (score >= 80) return { letter: "A-", color: "hsl(160,100%,50%)" }
  if (score >= 75) return { letter: "B+", color: "hsl(187,100%,50%)" }
  if (score >= 70) return { letter: "B",  color: "hsl(187,100%,50%)" }
  if (score >= 65) return { letter: "B-", color: "hsl(187,100%,50%)" }
  if (score >= 60) return { letter: "C+", color: "hsl(45,100%,55%)" }
  if (score >= 55) return { letter: "C",  color: "hsl(45,100%,55%)" }
  if (score >= 50) return { letter: "C-", color: "hsl(45,100%,55%)" }
  return { letter: "F", color: "hsl(0,85%,60%)" }
}

interface Props {
  activeTerm: Term
  onClose: () => void
}

export function GradeCalculator({ activeTerm, onClose }: Props) {
  const termKey = activeTerm === "Term 1" || activeTerm === "Term 2" ? activeTerm : "Term 2"
  const initialCourses = TERM_DATA[termKey] ?? []

  const [courses, setCourses] = useState<Course[]>(
    initialCourses.map(c => ({ ...c, assessments: c.assessments.map(a => ({ ...a })) }))
  )
  const [bonusAttendance, setBonusAttendance] = useState(false)
  const [bonusPractice, setBonusPractice] = useState(false)

  const updateScore = (courseIdx: number, assIdx: number, value: string) => {
    const parsed = value === "" ? null : Math.min(100, Math.max(0, parseFloat(value)))
    setCourses(prev => prev.map((c, ci) =>
      ci === courseIdx
        ? { ...c, assessments: c.assessments.map((a, ai) => ai === assIdx ? { ...a, score: isNaN(parsed as number) ? null : parsed } : a) }
        : c
    ))
  }

  const getCourseTotal = (course: Course) => {
    const filled = course.assessments.filter(a => a.score !== null)
    if (filled.length === 0) return null
    return filled.reduce((sum, a) => sum + (a.score! * a.weight) / 100, 0)
  }

  const getProjected = (course: Course) => {
    const filled = course.assessments.filter(a => a.score !== null)
    if (filled.length === 0) return null
    const filledWeight = filled.reduce((s, a) => s + a.weight, 0)
    const filledScore = filled.reduce((s, a) => s + (a.score! * a.weight) / 100, 0)
    return (filledScore / filledWeight) * 100
  }

  const termAverage = () => {
    const totals = courses.map(c => getCourseTotal(c)).filter(v => v !== null) as number[]
    if (totals.length === 0) return null
    const avg = totals.reduce((s, v) => s + v, 0) / totals.length
    const bonus = (bonusAttendance ? 5 : 0) + (bonusPractice ? 5 : 0)
    return Math.min(110, avg + bonus)
  }

  const avg = termAverage()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-border overflow-hidden"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Grade Calculator</h2>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{activeTerm} · Enter scores out of 100</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

          {/* Summary bar */}
          {avg !== null && (
            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ backgroundColor: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.2)" }}
            >
              <div>
                <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Term average</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold text-[hsl(var(--primary))]">{avg.toFixed(1)}</span>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{getGrade(avg).letter}</span>
                  {(bonusAttendance || bonusPractice) && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "hsl(160,100%,50%,0.15)", color: "hsl(160,100%,50%)" }}
                    >
                      +{(bonusAttendance ? 5 : 0) + (bonusPractice ? 5 : 0)} bonus
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {courses.filter(c => getCourseTotal(c) !== null).length}/{courses.length} courses entered
                </p>
              </div>
            </div>
          )}

          {/* Bonus toggles */}
          <div className="rounded-lg border border-border p-3 flex items-center gap-4">
            <Zap className="h-3.5 w-3.5 text-[hsl(var(--neon-yellow))] shrink-0" />
            <p className="text-xs text-[hsl(var(--muted-foreground))] flex-1">Bonus points</p>
            <button
              onClick={() => setBonusAttendance(p => !p)}
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border transition-all",
                bonusAttendance
                  ? "bg-[hsl(187,100%,50%,0.1)] text-[hsl(187,100%,50%)]"
                  : "border-border text-[hsl(var(--muted-foreground))]"
              )}
              style={bonusAttendance ? { borderColor: "hsl(187,100%,50%,0.4)" } : {}}
            >
              <Award className="h-3 w-3" />
              +5 Attendance
            </button>
            <button
              onClick={() => setBonusPractice(p => !p)}
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border transition-all",
                bonusPractice
                  ? "bg-[hsl(160,100%,50%,0.1)] text-[hsl(160,100%,50%)]"
                  : "border-border text-[hsl(var(--muted-foreground))]"
              )}
              style={bonusPractice ? { borderColor: "hsl(160,100%,50%,0.4)" } : {}}
            >
              <Award className="h-3 w-3" />
              +5 Practices
            </button>
          </div>

          {/* Course cards */}
          {courses.map((course, ci) => {
            const total = getCourseTotal(course)
            const projected = getProjected(course)
            const display = total ?? projected
            const grade = display !== null
              ? getGrade(Math.min(110, display + (bonusAttendance ? 5 : 0) + (bonusPractice ? 5 : 0)))
              : null

            return (
              <div
                key={course.code}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${course.color}44` }}
              >
                {/* Course header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: course.color + "22", borderLeft: "3px solid " + course.color }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: course.color }}>
                      {course.code}
                    </p>
                    <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{course.name}</p>
                  </div>
                  {display !== null && (
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: grade?.color }}>
                        {Math.min(110, display + (bonusAttendance ? 5 : 0) + (bonusPractice ? 5 : 0)).toFixed(1)}
                      </p>
                      <p className="text-[10px] font-bold" style={{ color: grade?.color }}>{grade?.letter}</p>
                    </div>
                  )}
                </div>

                {/* Assessment inputs */}
                <div className="divide-y divide-border">
                  {course.assessments.map((ass, ai) => {
                    const contribution = ass.score !== null ? (ass.score * ass.weight) / 100 : null
                    return (
                      <div
                        key={ai}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ backgroundColor: "hsl(var(--card))" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[hsl(var(--foreground))]">{ass.label}</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Weight: {ass.weight}%</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={ass.score ?? ""}
                          onChange={e => updateScore(ci, ai, e.target.value)}
                          placeholder="—"
                          className="w-16 text-center text-xs rounded-lg px-2 py-1.5 outline-none transition-colors"
                          style={{
                            backgroundColor: "hsl(var(--muted))",
                            border: `1px solid ${course.color}44`,
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <div className="w-16 text-right shrink-0">
                          {contribution !== null ? (
                            <p className="text-xs font-medium" style={{ color: course.color }}>
                              {contribution.toFixed(1)} pts
                            </p>
                          ) : (
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{ass.weight} max</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                {display !== null && (
                  <div className="px-4 py-2" style={{ backgroundColor: course.color + "11" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        {total !== null ? "Actual score" : "Projected score"}
                      </span>
                      <span className="text-[9px] font-medium" style={{ color: course.color }}>
                        {display.toFixed(1)} / 100
                      </span>
                    </div>
                    <div className="h-1 rounded-full" style={{ backgroundColor: "hsl(var(--border))" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, display)}%`, backgroundColor: course.color }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}