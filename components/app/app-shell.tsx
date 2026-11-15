"use client"

import { useEffect, useState } from "react"
import { Sun, BookOpen, PieChart, CalendarRange, Search, Moon, LogOut, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useSession } from "next-auth/react"
import type { Term } from "@/lib/store"
import { gradedTerms, termNames } from "@/lib/catalog"
import { useCatalog } from "@/components/app/catalog-gate"
import { useActiveTerm } from "@/hooks/use-active-term"
import { useAcademic } from "@/hooks/use-academic"
import { TodayView } from "@/components/app/today-view"
import { CoursesView } from "@/components/app/courses-view"
import { CommandPalette } from "@/components/app/command-palette"
import { InstallButton } from "@/components/app/install-button"
import { GradeCenter } from "@/components/dashboard/grade-center"
import { PlanView } from "@/components/app/plan-view"
import { ExportButton } from "@/components/dashboard/export-button"
import { TeacherView } from "@/components/app/teacher-view"
import { Onboarding } from "@/components/app/onboarding"
import { AccountDialog } from "@/components/app/account-dialog"

export type View = "today" | "courses" | "grades" | "plan"

const STUDENT_NAV: { key: View; label: string; icon: typeof Sun }[] = [
  { key: "today", label: "Today", icon: Sun },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "grades", label: "Grades", icon: PieChart },
  { key: "plan", label: "Plan", icon: CalendarRange },
]
// Professors and staff: no grades/attendance — their courses and the calendar
const TEACHER_NAV = STUDENT_NAV.filter(n => n.key === "courses" || n.key === "plan")

const muted = "text-[hsl(var(--muted-foreground))]"

export function AppShell() {
  const { catalog, role } = useCatalog()
  const isStudent = role === "student"
  const NAV = isStudent ? STUDENT_NAV : TEACHER_NAV
  const [term, setTerm] = useActiveTerm()
  const [view, setView] = useState<View>(isStudent ? "today" : "courses")
  const [accountOpen, setAccountOpen] = useState(false)
  const [course, setCourse] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const academic = useAcademic()
  const terms = gradedTerms(catalog).length ? gradedTerms(catalog) : termNames(catalog)
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)   // theme is only known in the browser
  useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === "dark"

  // Deep links: /#grades, /#courses/COMP-3001
  useEffect(() => {
    const [v, c] = window.location.hash.replace("#", "").split("/")
    if (NAV.some(n => n.key === v)) setView(v as View)
    if (c) setCourse(c)
  }, [])
  const navigate = (v: View, c?: string | null) => {
    setView(v)
    if (c !== undefined) setCourse(c)
    window.history.replaceState(null, "", `#${v}${v === "courses" && (c ?? course) ? `/${c ?? course}` : ""}`)
    window.scrollTo({ top: 0 })
  }
  const openCourse = (code: string) => navigate("courses", code)

  // Keyboard shortcuts: G then T / C / G / P
  useEffect(() => {
    let pendingG = 0
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || el.closest("input, textarea, select, [contenteditable=true], [cmdk-root]")) return
      const k = e.key.toLowerCase()
      if (pendingG && Date.now() - pendingG < 1200) {
        const map: Record<string, View> = { t: "today", c: "courses", g: "grades", p: "plan" }
        if (map[k] && NAV.some(n => n.key === map[k])) { e.preventDefault(); navigate(map[k]) }
        pendingG = 0
      } else if (k === "g") pendingG = Date.now()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
  const changeTerm = (t: string) => { setTerm(t as Term); setCourse(null) }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop rail */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[72px] flex-col items-center gap-1 py-4 border-r border-border bg-[hsl(var(--sidebar-background))] z-30">
        <div className="h-9 w-9 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center text-xs font-bold mb-4" title="OPIT Tracker">OT</div>
        {NAV.map(n => {
          const active = view === n.key
          return (
            <button key={n.key} onClick={() => navigate(n.key)} title={n.label}
              className={`w-14 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] transition-colors ${active ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]" : `${muted} hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]`}`}>
              <n.icon className="h-5 w-5" /> {n.label}
            </button>
          )
        })}
        <div className="mt-auto flex flex-col items-center gap-2">
          <InstallButton compact />
          <button onClick={() => setTheme(isDark ? "light" : "dark")} title="Toggle theme" className={`h-9 w-9 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))] ${muted}`}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setAccountOpen(true)} title={`Account · ${session?.user?.email ?? ""}`}
            className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center bg-[hsl(var(--muted))] text-xs font-semibold">
            {session?.user?.image ? <img src={session.user.image} alt="" className="h-full w-full object-cover" /> : session?.user?.name?.charAt(0) ?? <LogOut className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <div className="md:pl-[72px] pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-3">
            <div role="tablist" aria-label="Term" className="flex items-center gap-0.5 p-0.5 rounded-full bg-[hsl(var(--muted))]">
              {terms.map(t => (
                <button key={t} role="tab" aria-selected={t === term} onClick={() => changeTerm(t)}
                  className={`text-[11px] font-medium px-3 py-1 rounded-full transition-colors ${t === term ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : `${muted} hover:text-[hsl(var(--foreground))]`}`}>
                  <span className="sm:hidden">{t.replace("Term ", "T")}</span><span className="hidden sm:inline">{t}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setPaletteOpen(true)}
              className={`ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] ${muted}`}>
              <Search className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))]">Ctrl K</kbd>
            </button>
            <span className="md:hidden"><InstallButton /></span>
            {isStudent && <ExportButton activeTerm={term} />}
            <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme" className={`md:hidden h-8 w-8 rounded-lg flex items-center justify-center ${muted}`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setAccountOpen(true)} aria-label="Account" className="md:hidden h-8 w-8 rounded-full overflow-hidden flex items-center justify-center bg-[hsl(var(--muted))] text-xs font-semibold">
              {session?.user?.image ? <img src={session.user.image} alt="" className="h-full w-full object-cover" /> : session?.user?.name?.charAt(0) ?? <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {academic.error && (
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-3">
            <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
              <span className="flex-1">{academic.error}</span>
              <button onClick={academic.clearError} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <main className={`mx-auto ${view === "plan" ? "max-w-[1600px]" : "max-w-6xl"} px-4 sm:px-6 py-5`}>
          {!academic.loaded ? (
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-[hsl(var(--muted)/0.6)] animate-pulse" />)}
            </div>
          ) : !isStudent && view === "courses" ? (
            <TeacherView term={term} />
          ) : view === "today" ? (
            <TodayView term={term} academic={academic} onOpenCourse={openCourse} />
          ) : view === "courses" ? (
            <CoursesView term={term} academic={academic} course={course} onSelectCourse={c => navigate("courses", c)} />
          ) : view === "grades" ? (
            <GradeCenter key={term} embedded activeTerm={term} onDataChanged={academic.reload} />
          ) : (
            <PlanView term={term} academic={academic} onOpenCourse={openCourse} />
          )}
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className={`grid ${NAV.length === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
          {NAV.map(n => {
            const active = view === n.key
            return (
              <button key={n.key} onClick={() => navigate(n.key)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${active ? "text-[hsl(var(--primary))]" : muted}`}>
                <n.icon className="h-5 w-5" /> {n.label}
              </button>
            )
          })}
        </div>
      </nav>

      <Onboarding />
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} term={term} onNavigate={v => navigate(v)} onOpenCourse={openCourse} />
    </div>
  )
}
