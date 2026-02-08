"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { initialCalendarEvents, type CalendarEvent } from "@/lib/store"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"

const eventTypeStyles: Record<string, { dot: string; bg: string }> = {
  deadline: { dot: "bg-[hsl(var(--secondary))]", bg: "bg-[hsl(var(--secondary)/0.1)]" },
  class: { dot: "bg-[hsl(var(--primary))]", bg: "bg-[hsl(var(--primary)/0.1)]" },
  exam: { dot: "bg-[hsl(var(--destructive))]", bg: "bg-[hsl(var(--destructive)/0.15)]" },
  meeting: { dot: "bg-[hsl(var(--neon-yellow))]", bg: "bg-[hsl(var(--neon-yellow)/0.1)]" },
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>(initialCalendarEvents)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)) // Feb 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [addingEvent, setAddingEvent] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState("")

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [year, month])

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return events.filter((e) => e.date === dateStr)
  }

  const selectedEvents = selectedDate ? events.filter((e) => e.date === selectedDate) : []

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDate) return
    const newEvent: CalendarEvent = {
      id: `e${Date.now()}`,
      title: newEventTitle.trim(),
      date: selectedDate,
      type: "deadline",
    }
    setEvents((prev) => [...prev, newEvent])
    setNewEventTitle("")
    setAddingEvent(false)
  }

  const handleRemoveEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{monthName}</h3>
          <button onClick={nextMonth} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(eventTypeStyles).map(([type, s]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", s.dot)} />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-border bg-border flex-1">
        {/* Day headers */}
        {DAYS.map((day) => (
          <div key={day} className="bg-[hsl(var(--muted))] py-2 text-center">
            <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{day}</span>
          </div>
        ))}
        {/* Day cells */}
        {calendarDays.map((day, i) => {
          const dayEvents = day ? getEventsForDay(day) : []
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={i}
              onClick={() => dateStr && setSelectedDate(isSelected ? null : dateStr)}
              disabled={!day}
              className={cn(
                "bg-[hsl(var(--card))] p-1.5 text-left transition-colors min-h-[72px] flex flex-col",
                day && "hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer",
                isSelected && "bg-[hsl(var(--primary)/0.08)] ring-1 ring-[hsl(var(--primary)/0.3)]",
                !day && "bg-[hsl(var(--background))]"
              )}
            >
              {day && (
                <>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isToday(day)
                        ? "h-5 w-5 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center text-[10px]"
                        : "text-[hsl(var(--muted-foreground))]"
                    )}
                  >
                    {day}
                  </span>
                  <div className="flex flex-col gap-0.5 mt-1 flex-1">
                    {dayEvents.slice(0, 2).map((evt) => {
                      const style = eventTypeStyles[evt.type]
                      return (
                        <div key={evt.id} className={cn("flex items-center gap-1 rounded px-1 py-0.5", style.bg)}>
                          <span className={cn("h-1 w-1 rounded-full shrink-0", style.dot)} />
                          <span className="text-[8px] text-[hsl(var(--foreground))] truncate">{evt.title}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[8px] text-[hsl(var(--muted-foreground))] pl-1">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date events */}
      {selectedDate && (
        <div className="mt-3 rounded-lg border border-border bg-[hsl(var(--card))] p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Events for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </h4>
            <button
              onClick={() => setAddingEvent(true)}
              className="text-[hsl(var(--primary))] hover:opacity-80 transition-opacity"
              aria-label="Add event"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {selectedEvents.length === 0 && !addingEvent && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">No events. Click + to add one.</p>
          )}
          <div className="flex flex-col gap-1.5">
            {selectedEvents.map((evt) => {
              const style = eventTypeStyles[evt.type]
              return (
                <div key={evt.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                    <span className="text-[11px] text-[hsl(var(--foreground))]">{evt.title}</span>
                    {evt.time && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{evt.time}</span>}
                  </div>
                  <button
                    onClick={() => handleRemoveEvent(evt.id)}
                    className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-all"
                    aria-label={`Remove ${evt.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
            {addingEvent && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                  placeholder="Event title..."
                  className="flex-1 bg-transparent text-[11px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none border-b border-[hsl(var(--primary)/0.3)] pb-0.5"
                  autoFocus
                />
                <button onClick={handleAddEvent} className="text-[10px] text-[hsl(var(--primary))] font-medium">Add</button>
                <button onClick={() => { setAddingEvent(false); setNewEventTitle("") }} className="text-[10px] text-[hsl(var(--muted-foreground))]">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
