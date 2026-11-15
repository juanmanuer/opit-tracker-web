"use client"

import { useEffect } from "react"
import { Sun, BookOpen, PieChart, CalendarRange, Video, ExternalLink, Moon, Radio } from "lucide-react"
import { useTheme } from "next-themes"
import { DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from "@/components/ui/command"
import { QUICK_LINKS } from "@/lib/store"
import { coursesOf, professorOf, nextSessions, zoomUrl } from "@/lib/academic"
import type { View } from "@/components/app/app-shell"

export function CommandPalette({ open, setOpen, term, onNavigate, onOpenCourse }: {
  open: boolean; setOpen: (o: boolean) => void; term: string
  onNavigate: (v: View) => void; onOpenCourse: (code: string) => void
}) {
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(!open) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen])

  const run = (fn: () => void) => { setOpen(false); fn() }
  const next = nextSessions(term, new Date(), 1)[0]
  const courses = coursesOf(term)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <DialogDescription className="sr-only">Search courses, actions and links</DialogDescription>
      <CommandInput placeholder="Search courses, actions, links…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => run(() => onNavigate("today"))}><Sun className="mr-2 h-4 w-4" /> Today<CommandShortcut>G T</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(() => onNavigate("courses"))}><BookOpen className="mr-2 h-4 w-4" /> Courses<CommandShortcut>G C</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(() => onNavigate("grades"))}><PieChart className="mr-2 h-4 w-4" /> Grades<CommandShortcut>G G</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(() => onNavigate("plan"))}><CalendarRange className="mr-2 h-4 w-4" /> Plan<CommandShortcut>G P</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={`Courses · ${term}`}>
          {courses.map(c => (
            <CommandItem key={c.code} value={`${c.code} ${c.name}`} onSelect={() => run(() => onOpenCourse(c.code))}>
              <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} /> {c.name}
              <span className="ml-2 text-xs opacity-60 font-mono">{c.code}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {next?.professor.meetingId && (
            <CommandItem value={`join next live session ${next.professor.courseName}`} onSelect={() => run(() => window.open(zoomUrl(next.professor.meetingId), "_blank"))}>
              <Radio className="mr-2 h-4 w-4" /> Join next live session · {next.professor.courseName}
            </CommandItem>
          )}
          {courses.map(c => {
            const p = professorOf(term, c.code)
            return p?.meetingId ? (
              <CommandItem key={`zoom-${c.code}`} value={`zoom ${c.code} ${c.name}`} onSelect={() => run(() => window.open(zoomUrl(p.meetingId), "_blank"))}>
                <Video className="mr-2 h-4 w-4" /> Zoom · {c.name}
              </CommandItem>
            ) : null
          })}
          <CommandItem value="toggle theme dark light" onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />} Switch to {theme === "dark" ? "light" : "dark"} mode
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Links">
          {QUICK_LINKS.map(l => (
            <CommandItem key={l.id} value={`${l.label} ${l.description}`} onSelect={() => run(() => window.open(l.url, "_blank"))}>
              <ExternalLink className="mr-2 h-4 w-4" /> {l.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
