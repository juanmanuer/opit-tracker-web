"use client"

import { useState } from "react"
import { X, TrendingUp, Award, Zap } from "lucide-react"
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
    { code: "COMP-1001", name: "Technical English", color: "#4F46E5", assessments: [
      { label: "Ass. 1", weight: 20, score: null },
      { label: "Ass. 2", weight: 20, score: null },
      { label: "Ass. 3", weight: 25, score: null },
      { label: "Ass. 4", weight: 35, score: null },
    ]},
    { code: "COMP-1002", name: "Computer Networks", color: "#059669", assessments: [
      { label: "Ass. 1", weight: 30, score: null },
      { label: "Ass. 2", weight: 30, score: null },
      { label: "Ass. 3", weight: 30, score: null },
      { label: "Ass. 4", weight: 10, score: null },
    ]},
    { code: "COMP-1003", name: "Programming Principles", color: "#DC2626", assessments: [
      { label: "Ass. 1", weight: 40, score: null },
      { label: "Ass. 2", weight: 60, score: null },
    ]},
    { code: "COMP-1004", name: "Computer Architectures", color: "#D97706", assessments: [
      { label: "Ass. 1", weight: 20, score: null },
      { label: "Ass. 2", weight: 30, score: null },
      { label: "Ass. 3", weight: 20, score: null },
      { label: "Ass. 4", weight: 30, score: null },
    ]},
    { code: "COMP-1005", name: "ICT Fundamentals", color: "#7C3AED", assessments: [
      { label: "Ass. 1", weight: 30, score: null },
      { label: "Ass. 2", weight: 30, score: null },
      { label: "Ass. 3", weight: 30, score: null },
      { label: "Ass. 4", weight: 10, score: null },
    ]},
  ],
  "Term 2": [
    { code: "COMP-2001", name: "Foundational Mathematics", color: "#4F46E5", assessments: [
      { label: "Ass. 1", weight: 30, score: null },
      { label: "Ass. 2", weight: 35, score: null },
      { label: "Ass. 3", weight: 35, score: null },
    ]},
    { code: "COMP-2002", name: "Web Development", color: "#059669", assessments: [
      { label: "Ass. 1", weight: 30, score: null },
      { label: "Ass. 2", weight: 40, score: null },
      { label: "Ass. 3", weight: 30, score: null },
    ]},
    { code: "COMP-2003", name: "Intro to OS", color: "#DC2626", assessments: [
      { label: "Ass. 1", weight: 40, score: null },
      { label: "Ass. 2", weight: 10, score: null },
      { label: "Ass. 3", weight: 40, score: null },
      { label: "Ass. 4", weight: 10, score: null },
    ]},
    { code: "COMP-2004", name: "Data Structures & Algo", color: "#D97706", assessments: [
      { label: "Ass. 1", weight: 35, score: null },
      { label: "Ass. 2", weight: 35, score: null },
      { label: "Ass. 3", weight: 30, score: null },
    ]},
    { code: "COMP-2005", name: "Project Mgmt & QA", color: "#7C3AED", assessments: [
      { label: "Ass. 1", weight: 50, score: null },
      { label: "Ass. 2", weight: 50, score: null },
    ]},
  ],
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

interface Props {
  activeTerm: Term
  onClose: () => void
}

export function GradeCalculator({ activeTerm, onClose }: Props) {
  const termKey = (activeTerm === "Term 1" || activeTerm === "Term 2") ? activeTerm : "Term 2"
  const [courses, setCourses] = useState<Course[]>(
    (TERM_DATA[termKey] ?? []).map(c => ({ ...c, assessments: c.assessments.map(a => ({ ...a })) }))
  )
  const [activeTab, setActiveTab] = useState(0)
  const [bonusAttendance, setBonusAttendance] = useState(false)
  const [bonusPractice, setBonusPractice] = useState(false)

  const updateScore = (assIdx: number, value: string) => {
    const num = value === "" ? null : Math.min(100, Math.max(0, parseFloat(value)))
    setCourses(prev => prev.map((c, ci) =>
      ci === activeTab
        ? { ...c, assessments: c.assessments.map((a, ai) => ai === assIdx ? { ...a, score: isNaN(num as number) ? null : num } : a) }
        : c
    ))
  }

  const getCourseScore = (course: Course) => {
    const filled = course.assessments.filter(a => a.score !== null)
    if (filled.length === 0) return null
    return filled.reduce((sum, a) => sum + (a.score! * a.weight) / 100, 0)
  }

  const getTermAvg = () => {
    const scores = courses.map(getCourseScore).filter(v => v !== null) as number[]
    if (scores.length === 0) return null
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length
    return Math.min(110, avg + (bonusAttendance ? 5 : 0) + (bonusPractice ? 5 : 0))
  }

  const course = courses[activeTab]
  const courseScore = getCourseScore(course)
  const withBonus = courseScore !== null
    ? Math.min(110, courseScore + (bonusAttendance ? 5 : 0) + (bonusPractice ? 5 : 0))
    : null
  const grade = withBonus !== null ? getGrade(withBonus) : null
  const termAvg = getTermAvg()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#0d1117", border: "1px solid #30363d", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #21262d" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#00bfff22" }}>
              <TrendingUp className="h-4 w-4" style={{ color: "#00bfff" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "#e6edf3" }}>Grade Calculator</h2>
              <p className="text-[10px]" style={{ color: "#8b949e" }}>{activeTerm} · out of 100</p>
            </div>
          </div>
          {/* Term average pill */}
          {termAvg !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
              <span className="text-[10px]" style={{ color: "#8b949e" }}>Term avg</span>
              <span className="text-sm font-bold" style={{ color: getGrade(termAvg).color }}>{termAvg.toFixed(1)}</span>
              <span className="text-[10px] font-bold" style={{ color: getGrade(termAvg).color }}>{getGrade(termAvg).letter}</span>
            </div>
          )}
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#21262d]" style={{ color: "#8b949e" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Course tabs */}
        <div className="flex px-5 pt-3 gap-2 overflow-x-auto" style={{ borderBottom: "1px solid #21262d" }}>
          {courses.map((c, i) => {
            const s = getCourseScore(c)
            const isActive = i === activeTab
            return (
              <button
                key={c.code}
                onClick={() => setActiveTab(i)}
                className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-medium transition-all shrink-0 relative"
                style={{
                  backgroundColor: isActive ? "#161b22" : "transparent",
                  color: isActive ? c.color : "#8b949e",
                  borderTop: isActive ? `2px solid ${c.color}` : "2px solid transparent",
                  borderLeft: isActive ? "1px solid #30363d" : "1px solid transparent",
                  borderRight: isActive ? "1px solid #30363d" : "1px solid transparent",
                  marginBottom: isActive ? "-1px" : "0",
                }}
              >
                <span className="font-mono text-[10px]">{c.code.split("-")[1]}</span>
                {s !== null && (
                  <span className="text-[9px] font-bold px-1 rounded" style={{ backgroundColor: c.color + "22", color: c.color }}>
                    {s.toFixed(0)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Active course content */}
        <div className="flex-1 overflow-y-auto p-5" style={{ backgroundColor: "#161b22" }}>
          {/* Course title + score */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: course.color }}>{course.code}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "#e6edf3" }}>{course.name}</p>
            </div>
            {withBonus !== null && (
              <div className="text-right">
                <p className="text-4xl font-bold leading-none" style={{ color: grade?.color }}>{withBonus.toFixed(1)}</p>
                <p className="text-sm font-bold mt-1" style={{ color: grade?.color }}>{grade?.letter}</p>
              </div>
            )}
          </div>

          {/* Assessment sliders */}
          <div className="flex flex-col gap-4">
            {course.assessments.map((ass, ai) => {
              const contribution = ass.score !== null ? (ass.score * ass.weight) / 100 : null
              const pct = ass.score ?? 0
              return (
                <div key={ai}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: "#e6edf3" }}>{ass.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: course.color + "22", color: course.color }}>
                        {ass.weight}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {contribution !== null && (
                        <span className="text-[10px]" style={{ color: "#8b949e" }}>
                          contributes <span style={{ color: course.color, fontWeight: 600 }}>{contribution.toFixed(1)} pts</span>
                        </span>
                      )}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ass.score ?? ""}
                        onChange={e => updateScore(ai, e.target.value)}
                        placeholder="—"
                        className="w-14 text-center text-sm font-bold rounded-lg px-2 py-1 outline-none"
                        style={{
                          backgroundColor: "#0d1117",
                          border: `1px solid ${ass.score !== null ? course.color + "88" : "#30363d"}`,
                          color: ass.score !== null ? course.color : "#8b949e",
                        }}
                      />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#21262d" }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: course.color, opacity: ass.score !== null ? 1 : 0.2 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress toward 100 */}
          {courseScore !== null && (
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid #21262d" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px]" style={{ color: "#8b949e" }}>
                  {course.assessments.filter(a => a.score !== null).length}/{course.assessments.length} assessments entered
                </span>
                <span className="text-[10px] font-medium" style={{ color: course.color }}>{courseScore.toFixed(1)} / 100</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#21262d" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, courseScore)}%`, backgroundColor: course.color }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer — bonus toggles */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid #21262d", backgroundColor: "#0d1117" }}>
          <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: "#e3b341" }} />
          <span className="text-[10px] flex-1" style={{ color: "#8b949e" }}>Bonus points</span>
          <button
            onClick={() => setBonusAttendance(p => !p)}
            className="flex items-center gap-1.5 text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: bonusAttendance ? "#00bfff22" : "#21262d",
              border: `1px solid ${bonusAttendance ? "#00bfff66" : "#30363d"}`,
              color: bonusAttendance ? "#00bfff" : "#8b949e",
            }}
          >
            <Award className="h-3 w-3" />
            +5 Attendance
          </button>
          <button
            onClick={() => setBonusPractice(p => !p)}
            className="flex items-center gap-1.5 text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: bonusPractice ? "#3fb95022" : "#21262d",
              border: `1px solid ${bonusPractice ? "#3fb95066" : "#30363d"}`,
              color: bonusPractice ? "#3fb950" : "#8b949e",
            }}
          >
            <Award className="h-3 w-3" />
            +5 Practices
          </button>
        </div>
      </div>
    </div>
  )
}