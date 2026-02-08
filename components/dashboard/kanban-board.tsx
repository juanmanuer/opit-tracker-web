"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { initialKanbanTasks, type KanbanTask } from "@/lib/store"
import { Plus, GripVertical, X, Clock } from "lucide-react"

const columns = [
  { key: "todo" as const, label: "To Do", color: "hsl(var(--muted-foreground))", dotColor: "bg-[hsl(var(--muted-foreground))]" },
  { key: "in-progress" as const, label: "In Progress", color: "hsl(var(--neon-cyan))", dotColor: "bg-[hsl(var(--primary))]" },
  { key: "done" as const, label: "Done", color: "hsl(var(--neon-green))", dotColor: "bg-[hsl(160,100%,50%)]" },
]

const typeColors: Record<string, string> = {
  assessment: "bg-[hsl(var(--secondary)/0.15)] text-[hsl(var(--secondary))]",
  practice: "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]",
  reading: "bg-[hsl(var(--neon-yellow)/0.15)] text-[hsl(var(--neon-yellow))]",
  other: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialKanbanTasks)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  const handleAddTask = (column: KanbanTask["column"]) => {
    if (!newTitle.trim()) return
    const newTask: KanbanTask = {
      id: `k${Date.now()}`,
      title: newTitle.trim(),
      course: "General",
      type: "other",
      column,
    }
    setTasks((prev) => [...prev, newTask])
    setNewTitle("")
    setAddingTo(null)
  }

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDrop = (column: KanbanTask["column"]) => {
    if (!draggedTask) return
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTask ? { ...t, column } : t))
    )
    setDraggedTask(null)
  }

  const handleRemoveTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.column === col.key)
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
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => setAddingTo(col.key)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                aria-label={`Add task to ${col.label}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-2">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  className={cn(
                    "group rounded-lg border border-border bg-[hsl(var(--card))] p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-[hsl(var(--primary)/0.3)]",
                    draggedTask === task.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <GripVertical className="h-3.5 w-3.5 mt-0.5 text-[hsl(var(--muted-foreground)/0.4)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed">{task.title}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">{task.course}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="text-[hsl(var(--muted-foreground)/0.3)] hover:text-[hsl(var(--destructive))] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      aria-label={`Remove ${task.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-md", typeColors[task.type])}>
                      {task.type}
                    </span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-[9px] text-[hsl(var(--muted-foreground))]">
                        <Clock className="h-2.5 w-2.5" />
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Add task form */}
              {addingTo === col.key && (
                <div className="rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card))] p-3 neon-glow-cyan">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTask(col.key)}
                    placeholder="Task title..."
                    className="w-full bg-transparent text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleAddTask(col.key)}
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
