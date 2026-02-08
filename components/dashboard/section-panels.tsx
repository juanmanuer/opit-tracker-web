"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  initialPractices,
  initialGrades,
  initialMiscItems,
  initialAttendance,
  type Assessment,
  type Practice,
  type Grade,
  type MiscItem,
  type AttendanceRecord,
} from "@/lib/store"
import {
  Clock,
  Plus,
  Check,
  Pencil,
  ExternalLink,
  Mail,
  Video,
  Link2,
  X,
  AlertCircle,
} from "lucide-react"

// ==================== ASSESSMENTS PANEL ====================

export function AssessmentsPanel() {
  const [assessments, setAssessments] = useState([
    { id: "1", title: "F. Math. (30%)", course: "Foundations", deadline: "2026-02-15", status: "todo" },
    { id: "2", title: "Web. Dev. (30%)", course: "Web Dev", deadline: "2026-02-11", status: "in-progress" },
    { id: "3", title: "IOS (40%)", course: "Mobile Dev", deadline: "2026-02-22", status: "todo" },
    { id: "4", title: "DSA (35%)", course: "Data Structures", deadline: "2026-02-22", status: "todo" },
    { id: "5", title: "F. Math. (35%)", course: "Foundations", deadline: "2026-03-15", status: "todo" },
    { id: "6", title: "PM (50%)", course: "Project Mgmt", deadline: "2026-03-22", status: "todo" },
    { id: "7", title: "IOS (10%)", course: "Mobile Dev", deadline: "2026-03-15", status: "todo" },
    { id: "8", title: "DSA (35%)", course: "Data Structures", deadline: "2026-03-14", status: "todo" },
    { id: "9", title: "Web Dev. (40%)", course: "Web Dev", deadline: "2026-03-25", status: "todo" },
    { id: "10", title: "PM (50%)", course: "Project Mgmt", deadline: "2026-04-12", status: "todo" },
    { id: "11", title: "IOS (40%)", course: "Mobile Dev", deadline: "2026-04-12", status: "todo" },
    { id: "12", title: "DSA (30%)", course: "Data Structures", deadline: "2026-04-04", status: "todo" },
    { id: "13", title: "F. Math. (35%)", course: "Foundations", deadline: "2026-04-12", status: "todo" },
    { id: "14", title: "Web Dev. (30%)", course: "Web Dev", deadline: "2026-04-07", status: "todo" },
    { id: "15", title: "IOS (10%)", course: "Mobile Dev", deadline: "2026-04-12", status: "todo" },
  ] as Assessment[])

  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCourse, setNewCourse] = useState("")
  const [newDeadline, setNewDeadline] = useState("")

  const statusStyles: Record<string, { label: string; style: string }> = {
    todo: { label: "To Do", style: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
    "in-progress": { label: "In Progress", style: "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]" },
    done: { label: "Done", style: "bg-[hsl(160,100%,50%,0.12)] text-[hsl(160,100%,50%)]" },
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return
    setAssessments((prev) => [
      ...prev,
      { id: `a${Date.now()}`, title: newTitle, course: newCourse || "General", deadline: newDeadline || "TBD", status: "todo" },
    ])
    setNewTitle("")
    setNewCourse("")
    setNewDeadline("")
    setAdding(false)
  }

  const cycleStatus = (id: string) => {
    const order: Assessment["status"][] = ["todo", "in-progress", "done"]
    setAssessments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        const idx = order.indexOf(a.status)
        return { ...a, status: order[(idx + 1) % order.length] }
      })
    )
  }

  const getDaysUntil = (deadline: string) => {
    if (deadline === "TBD") return null
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Assessments</h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--primary))] hover:opacity-80 transition-opacity"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {assessments.map((a) => {
          const days = getDaysUntil(a.deadline)
          const urgent = days !== null && days <= 3 && days >= 0 && a.status !== "done"
          return (
            <div
              key={a.id}
              className={cn(
                "rounded-lg border bg-[hsl(var(--card))] p-3 transition-all",
                urgent ? "border-[hsl(var(--destructive)/0.4)] ring-1 ring-[hsl(var(--destructive)/0.2)]" : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed">{a.title}</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{a.course}</p>
                </div>
                <button
                  onClick={() => cycleStatus(a.id)}
                  className={cn("shrink-0 text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors", statusStyles[a.status].style)}
                >
                  {statusStyles[a.status].label}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                <span className={cn("text-[10px]", urgent ? "text-[hsl(var(--destructive))] font-medium" : "text-[hsl(var(--muted-foreground))]")}>
                  {a.deadline === "TBD" ? "TBD" : new Date(a.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {urgent && (
                  <span className="flex items-center gap-0.5 text-[9px] text-[hsl(var(--destructive))]">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {days === 0 ? "Due today!" : `${days}d left`}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="flex flex-col gap-2 rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card))] p-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title..."
            className="bg-transparent text-xs text-[hsl(var(--foreground))] outline-none"
          />
          <input
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="bg-transparent text-[10px] text-[hsl(var(--muted-foreground))] outline-none"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="text-[10px] text-[hsl(var(--primary))] font-medium">Add</button>
            <button onClick={() => setAdding(false)} className="text-[10px] text-[hsl(var(--muted-foreground))]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== PRACTICES PANEL ====================

export function PracticesPanel() {
  const [practices, setPractices] = useState(initialPractices as Practice[])
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")

  const toggleComplete = (id: string) => {
    setPractices((prev) => prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)))
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return
    setPractices((prev) => [...prev, { id: `p${Date.now()}`, title: newTitle, course: "General", completed: false }])
    setNewTitle("")
    setAdding(false)
  }

  const completedCount = practices.filter((p) => p.completed).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Practices</h3>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
            {completedCount}/{practices.length} completed
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--primary))] hover:opacity-80"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
        <div
          className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-500"
          style={{ width: `${practices.length > 0 ? (completedCount / practices.length) * 100 : 0}%` }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {practices.map((p) => (
          <button
            key={p.id}
            onClick={() => toggleComplete(p.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-left transition-all group",
              p.completed ? "border-[hsl(160,100%,50%,0.2)]" : "border-border hover:border-[hsl(var(--primary)/0.2)]"
            )}
          >
            <div
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                p.completed
                  ? "bg-[hsl(160,100%,50%)] border-[hsl(160,100%,50%)]"
                  : "border-[hsl(var(--muted-foreground)/0.3)] group-hover:border-[hsl(var(--primary))]"
              )}
            >
              {p.completed && <Check className="h-2.5 w-2.5 text-[hsl(var(--background))]" />}
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs leading-relaxed", p.completed ? "text-[hsl(var(--muted-foreground))] line-through" : "text-[hsl(var(--foreground))]")}>{p.title}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{p.course}</p>
            </div>
          </button>
        ))}
      </div>

      {adding && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card))] px-3 py-2 neon-glow-cyan">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Practice title..."
            className="flex-1 bg-transparent text-xs text-[hsl(var(--foreground))] outline-none"
            autoFocus
          />
          <button onClick={handleAdd} className="text-[10px] font-medium text-[hsl(var(--primary))]">Add</button>
          <button onClick={() => setAdding(false)} className="text-[10px] text-[hsl(var(--muted-foreground))]">Cancel</button>
        </div>
      )}
    </div>
  )
}

// ==================== GRADES PANEL ====================

export function GradesPanel() {
  const [grades] = useState<Grade[]>(initialGrades)

  const gradeColorMap: Record<string, string> = {
    "A+": "text-[hsl(160,100%,50%)]",
    A: "text-[hsl(160,100%,50%)]",
    "A-": "text-[hsl(160,80%,50%)]",
    "B+": "text-[hsl(var(--primary))]",
    B: "text-[hsl(var(--primary))]",
    "B-": "text-[hsl(var(--neon-yellow))]",
    "C+": "text-[hsl(var(--neon-yellow))]",
    C: "text-[hsl(var(--secondary))]",
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Grades</h3>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[hsl(var(--muted))]">
              <th className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-3 py-2">Course</th>
              <th className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-3 py-2">Assessment</th>
              <th className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-3 py-2 text-center">Grade</th>
              <th className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-3 py-2 text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => (
              <tr key={g.id} className="border-t border-border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                <td className="text-[11px] text-[hsl(var(--foreground))] px-3 py-2.5">{g.course}</td>
                <td className="text-[11px] text-[hsl(var(--muted-foreground))] px-3 py-2.5">{g.assessment}</td>
                <td className="text-center px-3 py-2.5">
                  <span className={cn("text-xs font-bold", gradeColorMap[g.grade] || "text-[hsl(var(--foreground))]")}>{g.grade}</span>
                </td>
                <td className="text-[11px] text-[hsl(var(--muted-foreground))] text-right px-3 py-2.5">{g.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== MISC PANEL ====================

export function MiscPanel() {
  const [items, setItems] = useState<MiscItem[]>(initialMiscItems)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newType, setNewType] = useState<MiscItem["type"]>("email")

  const typeIcons: Record<string, typeof Mail> = {
    email: Mail,
    zoom: Video,
    link: Link2,
  }

  const startEdit = (item: MiscItem) => {
    setEditingId(item.id)
    setEditValue(item.value)
  }

  const saveEdit = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, value: editValue } : i)))
    setEditingId(null)
  }

  const handleAdd = () => {
    if (!newLabel.trim() || !newValue.trim()) return
    setItems((prev) => [...prev, { id: `m${Date.now()}`, label: newLabel, value: newValue, type: newType }])
    setNewLabel("")
    setNewValue("")
    setAdding(false)
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Misc Links</h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--primary))] hover:opacity-80"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = typeIcons[item.type]
          const isEditing = editingId === item.id
          return (
            <div key={item.id} className="rounded-lg border border-border bg-[hsl(var(--card))] p-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                  <span className="text-xs font-medium text-[hsl(var(--foreground))]">{item.label}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => (isEditing ? saveEdit(item.id) : startEdit(item))} className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
                    {isEditing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                  </button>
                  <button onClick={() => removeItem(item.id)} className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="mt-1.5 w-full bg-transparent text-[10px] text-[hsl(var(--primary))] border-b border-[hsl(var(--primary)/0.3)] outline-none"
                  autoFocus
                />
              ) : (
                <a href={item.type === "email" ? `mailto:${item.value}` : item.value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1.5 text-[10px] text-[hsl(var(--primary))] hover:underline">
                  {item.value} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card))] p-3 flex flex-col gap-2">
          <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label..." className="bg-transparent text-xs text-[hsl(var(--foreground))] outline-none" />
          <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="URL..." className="bg-transparent text-[10px] text-[hsl(var(--foreground))] outline-none" />
          <div className="flex items-center gap-2">
            <select value={newType} onChange={(e) => setNewType(e.target.value as MiscItem["type"])} className="bg-[hsl(var(--muted))] text-[10px] rounded px-1">
              <option value="email">Email</option>
              <option value="zoom">Zoom</option>
              <option value="link">Link</option>
            </select>
            <button onClick={handleAdd} className="text-[10px] text-[hsl(var(--primary))]">Add</button>
            <button onClick={() => setAdding(false)} className="text-[10px] text-[hsl(var(--muted-foreground))]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== ATTENDANCE PANEL ====================

export function AttendancePanel() {
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendance)

  const statusStyles: Record<string, { label: string; style: string }> = {
    present: { label: "Present", style: "bg-[hsl(160,100%,50%,0.12)] text-[hsl(160,100%,50%)]" },
    absent: { label: "Absent", style: "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]" },
    excused: { label: "Excused", style: "bg-[hsl(var(--neon-yellow)/0.15)] text-[hsl(var(--neon-yellow))]" },
  }

  const cycleStatus = (id: string) => {
    const order: AttendanceRecord["status"][] = ["present", "absent", "excused"]
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const idx = order.indexOf(r.status)
        return { ...r, status: order[(idx + 1) % order.length] }
      })
    )
  }

  const presentCount = records.filter((r) => r.status === "present").length
  const rate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Attendance</h3>
        <span className={cn("text-xs font-bold", rate >= 80 ? "text-[hsl(160,100%,50%)]" : rate >= 60 ? "text-[hsl(var(--neon-yellow))]" : "text-[hsl(var(--destructive))]")}>
          {rate}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", rate >= 80 ? "bg-[hsl(160,100%,50%)]" : rate >= 60 ? "bg-[hsl(var(--neon-yellow))]" : "bg-[hsl(var(--destructive))]")}
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {records.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2.5">
            <div>
              <p className="text-xs text-[hsl(var(--foreground))]">{r.course}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            </div>
            <button onClick={() => cycleStatus(r.id)} className={cn("text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors", statusStyles[r.status].style)}>
              {statusStyles[r.status].label}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}