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
  type Assessment,
  type Term,
} from "@/lib/store"
import { Check, Circle, ExternalLink, Mail, Video, CheckCircle2, XCircle, MinusCircle } from "lucide-react"

// ── Shared prop ────────────────────────────────────────────────────────────
interface PanelProps {
  activeTerm: Term
}

// ── Assessments ────────────────────────────────────────────────────────────
export function AssessmentsPanel({ activeTerm }: PanelProps) {
  const [assessments, setAssessments] = useState(initialAssessments)
  const courses = TERM_COURSES[activeTerm]

  const toggle = (id: string) => {
    setAssessments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "done" ? "todo" : "done" }
          : a
      )
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Course pills */}
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
                style={{ backgroundColor: `${c.color}20`, borderLeft: `3px solid ${c.color}` }}
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

      {/* Assessments list */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          Upcoming
        </p>
        {assessments.map((a) => (
          <button
            key={a.id}
            onClick={() => toggle(a.id)}
            className="flex items-start gap-2.5 rounded-lg p-2.5 text-left hover:bg-[hsl(var(--muted))] transition-colors group"
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
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{a.course} · {a.deadline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Practices ──────────────────────────────────────────────────────────────
export function PracticesPanel({ activeTerm }: PanelProps) {
  const [pract
