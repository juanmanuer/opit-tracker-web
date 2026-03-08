"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
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
  const courses = TERM_COURSES[activeTerm]

  const toggle = (id: string) => {
    setAssessments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "done" ? "todo" : "done" } : a
      )
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {courses.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            {activeTerm} Courses
          </p>
          <div className="flex flex-col gap-1.5">
            {courses.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: c.color + "20", borderLeft: "3px solid " + c.color }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: c.color }}>
                    {c.code}
                  </p>
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{c.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          Upcoming
        </p>
        {assessments.map((a) => (
          <button
            key={a.id}
            onClick={() => toggle(a.id)}
            className="flex items-start gap-2.5 rounded-lg p-2.5 text-left hover:bg-[hsl(var(--muted))] transition-colors"
          >
            {a.status === "done" ? (
              <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(160,100%,50%)]" />
            ) : (
              <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
            )}
            <div className="min-w-0">
              <p className={cn("text-xs font-medium leading-tight", a.status === "done" && "line-through text-[hsl(var(--muted-foreground))]")}>
                {a.title}
              </p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {a.course} · {a.deadline}
              </p>
            </div>
          </button>
        ))}
      </div>
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
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
        Grades
      </p>
      {initialGrades.map((g) => (
        <div
          key={g.id}
          className="flex items-center justify-between rounded-lg p-2.5 bg-[hsl(var(--muted))]"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{g.assessment}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              {g.course} · {g.weight}
            </p>
          </div>
          <span className="text-sm font-bold text-[hsl(var(--primary))] ml-2 shrink-0">
            {g.grade}
          </span>
        </div>
      ))}
    </div>
  )
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
  const getIcon = (status: string) => {
    if (status === "present") return CheckCircle2
    if (status === "absent") return XCircle
    return MinusCircle
  }

  const getColor = (status: string) => {
    if (status === "present") return "text-[hsl(160,100%,50%)]"
    if (status === "absent") return "text-red-400"
    return "text-yellow-400"
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
        Attendance
      </p>
      {initialAttendance.map((r) => {
        const Icon = getIcon(r.status)
        return (
          <div
            key={r.id}
            className="flex items-center gap-2.5 rounded-lg p-2.5 bg-[hsl(var(--muted))]"
          >
            <Icon className={"h-3.5 w-3.5 " + getColor(r.status)} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{r.course}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{r.date}</p>
            </div>
            <span className={"ml-auto text-[10px] font-medium capitalize shrink-0 " + getColor(r.status)}>
              {r.status}
            </span>
          </div>
        )
      })}
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