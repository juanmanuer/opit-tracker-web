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

  const avatar = (size: string) => (
    <button onClick={() => setAccountOpen(true)} aria-label={`Account · ${session?.user?.email ?? ""}`} title="Account"
      className={`${size} rounded-2xl overflow-hidden flex items-center justify-center bg-card font-display font-bold text-sm shrink-0`}>
      {session?.user?.image ? <img src={session.user.image} alt="" className="h-full w-full object-cover" /> : session?.user?.name?.charAt(0) ?? <LogOut className="h-4 w-4" />}
    </button>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="pb-24 md:pb-8">
        {/* Header — Bento: floating white pills on the grey ground */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur">
          <div className={`mx-auto ${view === "plan" ? "max-w-[1600px]" : "max-w-6xl"} px-4 sm:px-6 py-3 flex items-center gap-2.5`}>
            {/* Brand + signature */}
            <button onClick={() => navigate(NAV[0].key)} className="flex items-center gap-2.5 mr-1 shrink-0" aria-label="OPIT Tracker, home">
              <span className="h-10 w-10 rounded-2xl bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] flex items-center justify-center font-display font-bold text-sm">OT</span>
              <span className="hidden lg:flex flex-col items-start leading-tight">
                <span className="font-display font-bold text-[15px]">OPIT Tracker</span>
                <span className={`font-display text-[11px] ${muted}`}>by Juan M. Aguilar</span>
              </span>
            </button>

            <nav aria-label="Main" className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-card">
              {NAV.map(n => {
                const active = view === n.key
                return (
                  <button key={n.key} onClick={() => navigate(n.key)} aria-current={active ? "page" : undefined}
                    className={`font-display text-sm px-4 py-2 rounded-xl transition-colors ${active ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold" : `${muted} font-medium hover:text-[hsl(var(--foreground))]`}`}>
                    {n.label}
                  </button>
                )
              })}
            </nav>

            <div role="tablist" aria-label="Term" className="flex items-center gap-1 p-1 rounded-2xl bg-card font-display text-[13px] font-semibold">
              {terms.map(t => (
                <button key={t} role="tab" aria-selected={t === term} onClick={() => changeTerm(t)}
                  className={`px-3 py-2 rounded-xl transition-colors ${t === term ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]" : `${muted} hover:text-[hsl(var(--foreground))]`}`}>
                  {t.replace("Term ", "T")}
                </button>
              ))}
            </div>

            <button onClick={() => setPaletteOpen(true)} aria-label="Search"
              className={`ml-auto h-10 flex items-center gap-2 text-[13px] px-3 rounded-2xl bg-card hover:brightness-95 dark:hover:brightness-125 ${muted}`}>
              <Search className="h-4 w-4" /> <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline font-display text-[11px] px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))]">Ctrl K</kbd>
            </button>
            <InstallButton compact />
            {isStudent && <span className="hidden sm:inline"><ExportButton activeTerm={term} /></span>}
            <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme"
              className={`h-10 w-10 rounded-2xl bg-card flex items-center justify-center shrink-0 ${muted}`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {avatar("h-10 w-10")}
          </div>
        </header>

        {academic.error && (
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-1">
            <div className="flex items-start gap-2 rounded-2xl border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
              <span className="flex-1">{academic.error}</span>
              <button onClick={academic.clearError} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <main className={`mx-auto ${view === "plan" ? "max-w-[1600px]" : "max-w-6xl"} px-4 sm:px-6 py-4`}>
          {!academic.loaded ? (
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`h-44 rounded-3xl bg-card animate-pulse ${i === 0 ? "sm:col-span-2" : ""}`} />)}
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

          <footer className={`mt-6 flex flex-wrap justify-between gap-2 font-display text-xs ${muted}`}>
            <span>OPIT Tracker — designed &amp; built by <span className="font-semibold text-[hsl(var(--foreground))]">Juan Manuel Aguilar</span></span>
            <a href="/privacy" className="hover:underline">Privacy</a>
          </footer>
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav aria-label="Main" className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className={`grid ${NAV.length === 4 ? "grid-cols-4" : "grid-cols-2"} gap-1 p-1 rounded-2xl bg-card shadow-lg shadow-black/5`}>
          {NAV.map(n => {
            const active = view === n.key
            return (
              <button key={n.key} onClick={() => navigate(n.key)} aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl font-display text-[11px] transition-colors ${active ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold" : muted}`}>
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
