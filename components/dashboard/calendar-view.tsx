"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface Assessment {
  id: string
  title: string
  courseCode: string
  courseName: string
  color: string
  startDate: string
  endDate: string
  weight: string
}

const ASSESSMENTS: Assessment[] = [
  { id: "2001-1", courseCode: "COMP-2001", courseName: "Foundational Mathematics",     color: "#4F46E5", title: "Assessment 1", startDate: "2026-02-02", endDate: "2026-02-15", weight: "30%" },
  { id: "2001-2", courseCode: "COMP-2001", courseName: "Foundational Mathematics",     color: "#4F46E5", title: "Assessment 2", startDate: "2026-03-02", endDate: "2026-03-15", weight: "35%" },
  { id: "2001-3", courseCode: "COMP-2001", courseName: "Foundational Mathematics",     color: "#4F46E5", title: "Assessment 3", startDate: "2026-03-30", endDate: "2026-04-12", weight: "35%" },
  { id: "2002-1", courseCode: "COMP-2002", courseName: "Web Development",              color: "#059669", title: "Assessment 1", startDate: "2026-02-04", endDate: "2026-02-11", weight: "30%" },
  { id: "2002-2", courseCode: "COMP-2002", courseName: "Web Development",              color: "#059669", title: "Assessment 2", startDate: "2026-03-18", endDate: "2026-03-25", weight: "40%" },
  { id: "2002-3", courseCode: "COMP-2002", courseName: "Web Development",              color: "#059669", title: "Assessment 3", startDate: "2026-04-01", endDate: "2026-04-14", weight: "30%" },
  { id: "2003-1", courseCode: "COMP-2003", courseName: "Operating Systems",            color: "#DC2626", title: "Assessment 1", startDate: "2026-02-06", endDate: "2026-02-22", weight: "40%" },
  { id: "2003-2", courseCode: "COMP-2003", courseName: "Operating Systems",            color: "#DC2626", title: "Assessment 2", startDate: "2026-03-06", endDate: "2026-03-22", weight: "10%" },
  { id: "2003-3", courseCode: "COMP-2003", courseName: "Operating Systems",            color: "#DC2626", title: "Assessment 3", startDate: "2026-03-27", endDate: "2026-04-12", weight: "40%" },
  { id: "2003-4", courseCode: "COMP-2003", courseName: "Operating Systems",            color: "#DC2626", title: "Assessment 4", startDate: "2026-04-03", endDate: "2026-04-12", weight: "10%" },
  { id: "2004-1", courseCode: "COMP-2004", courseName: "Data Structures & Algorithms", color: "#D97706", title: "Assessment 1", startDate: "2026-02-07", endDate: "2026-02-14", weight: "35%" },
  { id: "2004-2", courseCode: "COMP-2004", courseName: "Data Structures & Algorithms", color: "#D97706", title: "Assessment 2", startDate: "2026-03-07", endDate: "2026-03-14", weight: "35%" },
  { id: "2004-3", courseCode: "COMP-2004", courseName: "Data Structures & Algorithms", color: "#D97706", title: "Assessment 3", startDate: "2026-03-28", endDate: "2026-04-12", weight: "30%" },
  { id: "2005-1", courseCode: "COMP-2005", courseName: "Project Management & QA",      color: "#7C3AED", title: "Assessment 1", startDate: "2026-03-04", endDate: "2026-03-22", weight: "50%" },
  { id: "2005-2", courseCode: "COMP-2005", courseName: "Project Management & QA",      color: "#7C3AED", title: "Assessment 2", startDate: "2026-03-25", endDate: "2026-04-12", weight: "50%" },
]

const COURSE_ORDER = ["COMP-2001", "COMP-2002", "COMP-2003", "COMP-2004", "COMP-2005"]
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function dateToStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

// ── Countdown helpers ────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + "T00:00:00")
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function countdownLabel(days: number): string {
  if (days < 0)  return "Passed"
  if (days === 0) return "Today!"
  if (days === 1) return "Tomorrow"
  return `${days}d left`
}

function countdownColor(days: number): string {
  if (days < 0)  return "hsl(var(--muted-foreground))"
  if (days <= 3)  return "#EF4444"
  if (days <= 7)  return "#EAB308"
  return "#22C55E"
}

export function CalendarView() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<Assessment | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = dateToStr(today)

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(totalCells - firstDay - daysInMonth).fill(null),
  ]
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  function getAssessmentsForDay(day: number): Assessment[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return ASSESSMENTS.filter(a => a.startDate <= dateStr && a.endDate >= dateStr)
  }

  function getBarType(day: number, a: Assessment): "start" | "end" | "middle" | "single" {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const isStart = a.startDate === dateStr
    const isEnd = a.endDate === dateStr
    if (isStart && isEnd) return "single"
    if (isStart) return "start"
    if (isEnd) return "end"
    return "middle"
  }

  function isDeadline(day: number, a: Assessment): boolean {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return a.endDate === dateStr
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const seen = new Set<string>()
  const legend = ASSESSMENTS.filter(a => {
    if (seen.has(a.courseCode)) return false
    seen.add(a.courseCode)
    return true
  })

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-base font-bold text-[hsl(var(--foreground))] min-w-[140px] text-center">{monthName}</h3>
          <button onClick={nextMonth} className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {legend.map(a => (
            <div key={a.courseCode} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{a.courseName}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">📌</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Deadline</span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              {DAYS.map(d => (
                <th key={d} className="bg-[hsl(var(--muted))] py-2 text-center text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider border-b border-border">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((day, di) => {
                  const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null
                  const isToday = dateStr === todayStr
                  const dayAssessments = day ? getAssessmentsForDay(day) : []
                  const sorted = [...dayAssessments].sort((a, b) =>
                    COURSE_ORDER.indexOf(a.courseCode) - COURSE_ORDER.indexOf(b.courseCode)
                  )

                  return (
                    <td
                      key={di}
                      className={cn(
                        "border border-border align-top p-0 h-24",
                        day ? "bg-[hsl(var(--card))]" : "bg-[hsl(var(--background))]",
                        isToday && "ring-2 ring-inset ring-[hsl(var(--primary)/0.5)]"
                      )}
                    >
                      {day && (
                        <div className="flex flex-col h-full">
                          <div className="px-2 pt-1.5 pb-1">
                            <span className={cn(
                              "text-[11px] font-semibold",
                              isToday
                                ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-[10px]"
                                : "text-[hsl(var(--muted-foreground))]"
                            )}>
                              {day}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 px-0 pb-1 flex-1">
                            {sorted.map(a => {
                              const type = getBarType(day, a)
                              const deadline = isDeadline(day, a)
                              const days = daysUntil(a.endDate)
                              const cdColor = countdownColor(days)
                              const cdLabel = countdownLabel(days)

                              return (
                                <button
                                  key={a.id}
                                  onClick={() => setSelected(selected?.id === a.id ? null : a)}
                                  className={cn(
                                    "flex items-center gap-1 text-left w-full transition-all hover:brightness-110 active:scale-95",
                                    type === "start" && "rounded-l-full pl-2 pr-0 ml-1",
                                    type === "end" && "rounded-r-full pl-1 pr-2 mr-1",
                                    type === "middle" && "pl-1 pr-1",
                                    type === "single" && "rounded-full pl-2 pr-2 mx-1",
                                  )}
                                  style={{
                                    backgroundColor: a.color + "33",
                                    borderTop: `2px solid ${a.color}`,
                                    borderBottom: `2px solid ${a.color}`,
                                    borderLeft: (type === "start" || type === "single") ? `2px solid ${a.color}` : "none",
                                    borderRight: (type === "end" || type === "single") ? `2px solid ${a.color}` : "none",
                                    minHeight: "18px",
                                  }}
                                >
                                  {(type === "start" || type === "single") && (
                                    <span className="text-[8px] font-bold truncate leading-none py-0.5" style={{ color: a.color }}>
                                      {a.courseName.split(" ")[0]} · {a.title.replace("Assessment ", "A")} · {a.weight}
                                    </span>
                                  )}
                                  {deadline && (
                                    <span className="ml-auto shrink-0 flex items-center gap-0.5">
                                      <span className="text-[8px] font-bold" style={{ color: cdColor }}>{cdLabel}</span>
                                      <span className="text-[10px]">📌</span>
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail popup */}
      {selected && (() => {
        const days = daysUntil(selected.endDate)
        const cdColor = countdownColor(days)
        const cdLabel = countdownLabel(days)
        return (
          <div
            className="rounded-xl border p-4 flex items-start justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ backgroundColor: selected.color + "18", borderColor: selected.color + "55" }}
          >
            <div className="flex items-start gap-3 flex-1">
              <span className="mt-0.5 h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: selected.color }} />
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: selected.color }}>
                  {selected.courseCode} · {selected.courseName}
                </p>
                <p className="text-sm font-semibold text-[hsl(var(--foreground))] mt-0.5">
                  {selected.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    📅 {new Date(selected.startDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" → "}
                    {new Date(selected.endDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: selected.color + "33", color: selected.color }}
                  >
                    {selected.weight}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    📌 Deadline: {new Date(selected.endDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                  </span>
                  {/* ── Countdown badge ── */}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cdColor + "22", color: cdColor, border: `1px solid ${cdColor}55` }}
                  >
                    ⏱ {cdLabel}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })()}
    </div>
  )
}