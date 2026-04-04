"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { initialAssessments, TERM_COURSES, type Term } from "@/lib/store"
import { Plus, GripVertical, X, Clock, Trophy } from "lucide-react"

interface KanbanCard {
  id: string
  title: string
  course: string
  courseCode: string
  weight: string
  deadline: string
  column: "todo" | "in-progress" | "done"
  isPersonal?: boolean
}

interface KanbanBoardProps {
  activeTerm: Term
}

const columns = [
  { key: "todo"        as const, label: "To Do",       dotColor: "bg-[hsl(var(--muted-foreground))]" },
  { key: "in-progress" as const, label: "In Progress",  dotColor: "bg-[hsl(var(--primary))]"          },
  { key: "done"        as const, label: "Done",         dotColor: "bg-[hsl(160,100%,50%)]"            },
]

function getCourseColor(code: string): string {
  const colors: Record<string, string> = {
    "COMP-2001": "#4F46E5", "COMP-2002": "#059669",
    "COMP-2003": "#DC2626", "COMP-2004": "#D97706",
    "COMP-2005": "#7C3AED", "COMP-3001": "#0891B2",
    "COMP-3002": "#059669", "COMP-3003": "#6366F1",
    "COMP-3004": "#D97706", "COMP-3005": "#DC2626",
    "COMP-4001": "#7C3AED", "COMP-4002": "#DC2626",
    "COMP-4003": "#059669", "COMP-4004": "#0891B2",
    "COMP-4005": "#D97706",
  }
  return colors[code] ?? "#6B7280"
}

export function KanbanBoard({ activeTerm }: KanbanBoardProps) {
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [draggedCard, setDraggedCard] = useState<string | null>(null)

  // Build cards from assessments for active term
  useEffect(() => {
    const courses = TERM_COURSES[activeTerm]
    const termAssessments = initialAssessments.filter((a) =>
      courses.some((c) => c.code === a.courseCode)
    )

    // Load saved statuses from DB
    fetch("/api/user/assessments")
      .then((r) => r.json())
      .then((saved: { assessmentId: string; status: string }[]) => {
        const built: KanbanCard[] = termAssessments.map((a) => {
          const savedStatus = Array.isArray(saved)
            ? saved.find((s) => s.assessmentId === a.id)?.status
            : undefined
          const column =
            savedStatus === "done" ? "done"
            : savedStatus === "in-progress" ? "in-progress"
            : "todo"
          return {
            id: a.id,
            title: a.title,
            course: a.course,
            courseCode: a.courseCode,
            weight: a.weight,
            deadline: a.deadline,
            column,
          }
        })
        setCards(built)
      })
      .catch(() => {
        // Fallback without saved statuses
        setCards(termAssessments.map((a) => ({
          id: a.id,
          title: a.title,
          course: a.course,
          courseCode: a.courseCode,
          weight: a.weight,
          deadline: a.deadline,
          column: "todo" as const,
        })))
      })
  }, [activeTerm])

  const moveCard = async (id: string, column: KanbanCard["column"]) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, column } : c)))
    const card = cards.find((c) => c.id === id)
    if (!card?.isPersonal) {
      // Sync status back to assessments DB
      const status = column === "done" ? "done" : column === "in-progress" ? "in-progress" : "todo"
      await fetch("/api/user/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: id, status }),
      })
    }
  }

  const addPersonalCard = (column: KanbanCard["column"]) => {
    if (!newTitle.trim()) return
    const newCard: KanbanCard = {
      id: `personal-${Date.now()}`,
      title: newTitle.trim(),
      course: "Personal",
      courseCode: "",
      weight: "",
      deadline: "",
      column,
      isPersonal: true,
    }
    setCards((prev) => [...prev, newCard])
    setNewTitle("")
    setAddingTo(null)
  }

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  const handleDrop = (column: KanbanCard["column"]) => {
    if (!draggedCard) return
    moveCard(draggedCard, column)
    setDraggedCard(null)
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {columns.map((col) => {
        const colCards = cards.filter((c) => c.column === col.key)
        return (
          <div
            key={col.key}
            className="flex-1 flex flex-col min-w-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", col.dotColor)} />
                <span className="text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] rounded-full px-1.5 py-0.5">
                  {colCards.length}
                </span>
              </div>
              <button
                onClick={() => setAddingTo(col.key)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                aria-label={`Add personal task to ${col.label}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-2">
              {colCards.map((card) => {
                const color = getCourseColor(card.courseCode)
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggedCard(card.id)}
                    className={cn(
                      "group rounded-lg border border-border bg-[hsl(var(--card))] p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md",
                      draggedCard === card.id && "opacity-50",
                      card.column === "done" && "opacity-70"
                    )}
                    style={{
                      borderLeft: card.courseCode ? `3px solid ${color}` : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 mt-0.5 text-[hsl(var(--muted-foreground)/0.4)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="min-w-0">
                          {card.courseCode && (
                            <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color }}>
                              {card.courseCode}
                            </p>
                          )}
                          <p className={cn(
                            "text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed",
                            card.column === "done" && "line-through text-[hsl(var(--muted-foreground))]"
                          )}>
                            {card.title}
                          </p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                            {card.course}
                          </p>
                        </div>
                      </div>
                      {card.isPersonal && (
                        <button
                          onClick={() => removeCard(card.id)}
                          className="text-[hsl(var(--muted-foreground)/0.3)] hover:text-[hsl(var(--destructive))] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {card.weight && card.weight !== "TBD" && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: color + "22", color }}
                        >
                          {card.weight}
                        </span>
                      )}
                      {card.deadline && card.deadline !== "TBD" && (
                        <span className="flex items-center gap-1 text-[9px] text-[hsl(var(--muted-foreground))]">
                          <Clock className="h-2.5 w-2.5" />
                          {card.deadline}
                        </span>
                      )}
                      {card.column === "done" && (
                        <Trophy className="h-3 w-3 text-[hsl(var(--neon-yellow))] ml-auto" />
                      )}
                    </div>

                    {/* Quick move buttons (show on hover) */}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {columns.filter((c) => c.key !== card.column).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => moveCard(card.id, c.key)}
                          className="text-[9px] px-2 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Add personal task form */}
              {addingTo === col.key && (
                <div className="rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card))] p-3">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPersonalCard(col.key)}
                    placeholder="Personal task title..."
                    className="w-full bg-transparent text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => addPersonalCard(col.key)}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingTo(null); setNewTitle("") }}
                      className="text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}