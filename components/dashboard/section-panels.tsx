"use client"

import { useState, useEffect } from "react"
import { GradeCalculator } from "@/components/dashboard/grade-calculator"
import {
  initialAssessments,
  initialPractices,
  initialGrades,
  initialMiscItems,
  initialAttendance,
  TERM_COURSES,
  type Term,
  type Course,
} from "@/lib/store"
import {
  Check,
  Circle,
  ExternalLink,
  Mail,
  Video,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react"

interface PanelProps {
  activeTerm: Term
}

export function AssessmentsPanel({ activeTerm }: PanelProps) {
  const [assessments, setAssessments] = useState(initialAssessments)
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({})
  const courses = TERM_COURSES[activeTerm]

  useEffect(() => {
    fetch("/api/user/assessments")
      .then((r) => r.json())
      .then((data: { assessmentId: string; status: string }[]) => {
        console.log("Assessments API response:", data)
        if (!Array.isArray(data)) return
        setAssessments((prev) =>
          prev.map((a) => {
            const saved = data.find((d) => d.assessmentId === a.id)
            return saved ? { ...a, status: saved.status as "todo" | "in-progress" | "done" } : a
          })
        )
      })
      .catch((err) => console.error("Assessments fetch error:", err))
  }, [])

  const toggle = async (id: string) => {
    const current = assessments.find((a) => a.id === id)
    const newStatus = current?.status === "done" ? "todo" : "done"
    setAssessments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    )
    await fetch("/api/user/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId: id, status: newStatus }),
    })
  }

  const toggleCourse = (code: string) => {
    setOpenCourses((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  return (
    <div className="flex flex-col gap-3">
      {courses.length === 0 ? (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No courses yet for {activeTerm}.</p>
      ) : (
        courses.map((course) => {
          const courseAssessments = assessments.filter((a) => a.courseCode === course.code)
          const doneCount = courseAssessments.filter((a) => a.status === "done").length
          const isOpen = openCourses[course.code] !== false
          return (
            <div key={course.code} className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleCourse(course.code)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: course.color + "22", borderLeft: "3px solid " + course.color }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: course.color }}>
                    {course.code}
                  </p>
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">{course.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {doneCount}/{courseAssessments.length}
                  </span>
                  <span
                    className="text-[10px] text-[hsl(var(--muted-foreground))] transition-transform duration-200"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}
                  >
                    ▾
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="flex flex-col divide-y divide-border">
                  {courseAssessments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => toggle(a.id)}
                      className="flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[hsl(var(--muted))] transition-colors w-full"
                    >
                      {a.status === "done" ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[hsl(160,100%,50%)]" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                      )}
                      <p className={cn(
                        "text-xs font-medium flex-1 leading-tight",
                        a.status === "done" && "line-through text-[hsl(var(--muted-foreground))]"
                      )}>
                        {a.title}
                      </p>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ backgroundColor: course.color + "22", color: course.color }}
                      >
                        {a.weight}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export function PracticesPanel({ activeTerm }: PanelProps) {
  const [practices, setPractices] = useState(initialPractices)

  const toggle = (id: string) => {
    setPractices((prev) =>
      prev.map((p) => p.id === id ? { ...p, completed: !p.completed } : p)
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
        Practices
      </p>
      {practices.map((p) => (
        <button
          key={p.id}
          onClick={() => toggle(p.id)}
          className="flex items-start gap-2.5 rounded-lg p-2.5 text-left hover:bg-[hsl(var(--muted))] transition-colors"
        >
          {p.completed ? (
            <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(160,100%,50%)]" />
          ) : (
            <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
          )}
          <div className="min-w-0">
            <p className={cn("text-xs font-medium leading-tight", p.completed && "line-through text-[hsl(var(--muted-foreground))]")}>
              {p.title}
            </p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{p.course}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

export function GradesPanel({ activeTerm }: PanelProps) {
  const [canvasData, setCanvasData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [showCalculator, setShowCalculator] = useState(false)

const sync = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/canvas/sync?term=${encodeURIComponent(activeTerm)}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setCanvasData(data)
        setLastSynced(new Date().toLocaleTimeString())
      }
    } catch (err) {
      console.error("Sync failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
{showCalculator && (
        <GradeCalculator activeTerm={activeTerm} onClose={() => setShowCalculator(false)} />
      )}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          Grades
        </p>
        <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCalculator(true)}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-[hsl(var(--secondary)/0.15)] text-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary)/0.25)] transition-colors"
        >
          ⌗ Calculator
        </button>
        <button
          onClick={sync}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.25)] transition-colors disabled:opacity-50"
        >
          {loading ? "Syncing..." : "⟳ Sync Canvas"}
        </button>
        </div>
      </div>
      {lastSynced && (
        <p className="text-[9px] text-[hsl(var(--muted-foreground))]">Last synced: {lastSynced}</p>
      )}

      {canvasData.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Click "Sync Canvas" to load your real grades and upcoming assignments.</p>
        </div>
      ) : (
        canvasData.map((course) => (
          <div key={course.courseCode} className="rounded-lg border border-border overflow-hidden">
            <div
              className="px-3 py-2"
              style={{
                backgroundColor: getCourseColor(course.courseCode) + "22",
                borderLeft: "3px solid " + getCourseColor(course.courseCode),
              }}
            >
              <p className="text-[10px] font-bold uppercase" style={{ color: getCourseColor(course.courseCode) }}>
                {course.courseCode}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{course.courseName}</p>
                {course.gradeInfo?.currentScore != null && (
                  <span className="text-sm font-bold text-[hsl(var(--primary))]">
                    {course.gradeInfo.currentScore}%
                  </span>
                )}
              </div>
            </div>
            {course.upcoming.length > 0 && (
              <div className="divide-y divide-border">
                {course.upcoming.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-1.5">
                    <p className="text-[10px] text-[hsl(var(--foreground))] truncate flex-1">{a.title}</p>
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] shrink-0 ml-2">
                      {new Date(a.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function getCourseColor(code: string): string {
  const colors: Record<string, string> = {
    "COMP-1001": "#4F46E5",
    "COMP-1002": "#059669",
    "COMP-1003": "#DC2626",
    "COMP-1004": "#D97706",
    "COMP-1005": "#7C3AED",
    "COMP-2001": "#4F46E5",
    "COMP-2002": "#059669",
    "COMP-2003": "#DC2626",
    "COMP-2004": "#D97706",
    "COMP-2005": "#7C3AED",
  }
  return colors[code] ?? "#6B7280"
}

export function MiscPanel({ activeTerm }: PanelProps) {
  const getIcon = (type: string) => {
    if (type === "email") return Mail
    if (type === "zoom") return Video
    return ExternalLink
  }

  const getHref = (type: string, value: string) => {
    if (type === "email") return "mailto:" + value
    return value
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
        Quick Links
      </p>
      {initialMiscItems.map((item) => {
        const Icon = getIcon(item.type)
        const href = getHref(item.type, item.value)
        return (
          <button
            key={item.id}
            onClick={() => window.open(href, "_blank")}
            className="flex items-center gap-2.5 rounded-lg p-2.5 text-left hover:bg-[hsl(var(--muted))] transition-colors w-full"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]" />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{item.label}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{item.value}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function AttendancePanel({ activeTerm }: PanelProps) {
  const courses = TERM_COURSES[activeTerm]
  const [attendance, setAttendance] = useState<Record<string, Record<number, string>>>({})
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({})
  const [celebrating, setCelebrating] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch("/api/user/attendance")
      .then((r) => r.json())
      .then((data: { courseCode: string; lessonNumber: number; status: string }[]) => {
        if (!Array.isArray(data)) return
        const mapped: Record<string, Record<number, string>> = {}
        data.forEach(({ courseCode, lessonNumber, status }) => {
          if (!mapped[courseCode]) mapped[courseCode] = {}
          mapped[courseCode][lessonNumber] = status
        })
        setAttendance(mapped)
      })
      .catch(console.error)
  }, [])

  const toggle = async (courseCode: string, lessonNumber: number) => {
    const current = attendance[courseCode]?.[lessonNumber] ?? "absent"
    const newStatus = current === "present" ? "absent" : "present"

    const updated = {
      ...attendance,
      [courseCode]: { ...attendance[courseCode], [lessonNumber]: newStatus },
    }
    setAttendance(updated)

    const presentCount = Object.values(updated[courseCode]).filter((s) => s === "present").length
    if (presentCount === 7) {
      setCelebrating((prev) => ({ ...prev, [courseCode]: true }))
      setTimeout(() => setCelebrating((prev) => ({ ...prev, [courseCode]: false })), 3000)
    }

    await fetch("/api/user/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCode, lessonNumber, status: newStatus }),
    })
  }

  const toggleCourse = (code: string) => {
    setOpenCourses((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
        Synchronous Lessons · {activeTerm}
      </p>
      {courses.length === 0 ? (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No courses yet for {activeTerm}.</p>
      ) : (
        courses.map((course) => {
          const courseAttendance = attendance[course.code] ?? {}
          const presentCount = Object.values(courseAttendance).filter((s) => s === "present").length
          const bonusUnlocked = presentCount >= 7
          const isOpen = openCourses[course.code] !== false
          const isCelebrating = celebrating[course.code]

          return (
            <div
              key={course.code}
              className="rounded-lg border overflow-hidden transition-all duration-300"
              style={{
                borderColor: bonusUnlocked ? course.color : "hsl(var(--border))",
                boxShadow: bonusUnlocked ? `0 0 12px ${course.color}44` : "none",
              }}
            >
              {/* Course header */}
              <button
                onClick={() => toggleCourse(course.code)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: course.color + "22", borderLeft: "3px solid " + course.color }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: course.color }}>
                    {course.code}
                  </p>
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">{course.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {bonusUnlocked && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                      style={{ backgroundColor: course.color + "33", color: course.color }}
                    >
                      +5 pts
                    </span>
                  )}
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {presentCount}/13
                  </span>
                  <span
                    className="text-[10px] text-[hsl(var(--muted-foreground))]"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {/* Celebration banner */}
              {isCelebrating && (
                <div
                  className="px-3 py-2 text-center text-xs font-bold animate-bounce"
                  style={{ backgroundColor: course.color + "22", color: course.color }}
                >
                  🎉 Bonus unlocked! +5 points for {course.code}!
                </div>
              )}

              {/* Bonus progress bar */}
              {isOpen && (
                <div className="px-3 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                      {bonusUnlocked ? "🏆 Bonus achieved!" : `${7 - presentCount} more for +5 bonus`}
                    </span>
                    <span className="text-[9px] font-medium" style={{ color: course.color }}>
                      {presentCount}/7
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[hsl(var(--muted))] overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((presentCount / 7) * 100, 100)}%`,
                        backgroundColor: course.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Lesson grid */}
              {isOpen && (
                <div className="px-3 pb-3 grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 13 }, (_, i) => i + 1).map((lesson) => {
                    const status = courseAttendance[lesson] ?? "absent"
                    const isPresent = status === "present"
                    return (
                      <button
                        key={lesson}
                        onClick={() => toggle(course.code, lesson)}
                        className="flex flex-col items-center justify-center rounded-lg p-1.5 text-[9px] font-bold transition-all duration-200 hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: isPresent ? course.color + "33" : "hsl(var(--muted))",
                          color: isPresent ? course.color : "hsl(var(--muted-foreground))",
                          border: isPresent ? `1px solid ${course.color}66` : "1px solid transparent",
                          boxShadow: isPresent ? `0 0 6px ${course.color}44` : "none",
                        }}
                        title={`Lesson ${lesson}: ${isPresent ? "Present" : "Absent"}`}
                      >
                        <span>{lesson}</span>
                        <span className="text-[8px] mt-0.5">{isPresent ? "✓" : "✗"}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export function CoursesPanel({ activeTerm }: PanelProps) {
  const courses = TERM_COURSES[activeTerm]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
        {activeTerm} — Courses
      </p>
      {courses.length === 0 ? (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No courses yet for {activeTerm}.</p>
      ) : (
        courses.map((course: Course) => (
          <div
            key={course.code}
            className="rounded-lg p-3 shadow-md"
            style={{ backgroundColor: course.color + "20", borderLeft: "3px solid " + course.color }}
          >
            <p className="text-[10px] font-semibold uppercase opacity-70" style={{ color: course.color }}>
              {course.code}
            </p>
            <p className="text-xs font-bold mt-0.5 text-[hsl(var(--foreground))]">{course.name}</p>
          </div>
        ))
      )}
    </div>
  )
}