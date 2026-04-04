"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import {
  ClipboardList, CheckSquare, BarChart3, Mail,
  CalendarCheck, BookOpen, BarChart2, LayoutGrid,
  Calendar, Sun, Moon, LogOut, ChevronDown, Download
} from "lucide-react"
import { TERMS, type Term, type SidebarSection } from "@/lib/store"
import {
  AssessmentsPanel, PracticesPanel, GradesPanel,
  MiscPanel, AttendancePanel, CoursesPanel,
} from "@/components/dashboard/section-panels"
import { ProgressDashboard } from "@/components/dashboard/progress-dashboard"
import { KanbanBoard } from "@/components/dashboard/kanban-board"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { ExportButton } from "@/components/dashboard/export-button"

type MainView = "dashboard" | "kanban" | "calendar"

const sectionTabs: { key: SidebarSection; label: string; icon: typeof ClipboardList }[] = [
  { key: "assessments", label: "Assess.",   icon: ClipboardList  },
  { key: "practices",   label: "Practice",  icon: CheckSquare    },
  { key: "grades",      label: "Grades",    icon: BarChart3      },
  { key: "misc",        label: "Misc",      icon: Mail           },
  { key: "attendance",  label: "Attend.",   icon: CalendarCheck  },
  { key: "courses",     label: "Courses",   icon: BookOpen       },
]

const viewTabs: { key: MainView; label: string; icon: typeof BarChart2 }[] = [
  { key: "dashboard", label: "Overview", icon: BarChart2  },
  { key: "kanban",    label: "Board",    icon: LayoutGrid },
  { key: "calendar",  label: "Calendar", icon: Calendar   },
]

export function MobileLayout() {
  const [activeTerm, setActiveTerm] = useState<Term>("Term 2")
  const [activeSection, setActiveSection] = useState<SidebarSection>("assessments")
  const [mainView, setMainView] = useState<MainView>("dashboard")
  const [screen, setScreen] = useState<"section" | "main">("main")
  const [showTermPicker, setShowTermPicker] = useState(false)
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  const sectionPanels: Record<SidebarSection, React.ReactNode> = {
    assessments: <AssessmentsPanel activeTerm={activeTerm} />,
    practices:   <PracticesPanel activeTerm={activeTerm} />,
    grades:      <GradesPanel activeTerm={activeTerm} />,
    misc:        <MiscPanel activeTerm={activeTerm} />,
    attendance:  <AttendancePanel activeTerm={activeTerm} />,
    courses:     <CoursesPanel activeTerm={activeTerm} />,
  }

  const sectionLabel = sectionTabs.find(s => s.key === activeSection)?.label ?? ""

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--background))]">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-[hsl(var(--card))] shrink-0">
        {/* Logo + Term picker */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
            <span className="text-xs font-bold text-[hsl(var(--primary-foreground))]">O</span>
          </div>
          <button
            onClick={() => setShowTermPicker(p => !p)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--foreground))]"
          >
            {activeTerm}
            <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ExportButton activeTerm={activeTerm} />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt="Profile"
              className="h-7 w-7 rounded-full object-cover border border-border"
              onClick={() => signOut({ callbackUrl: "/login" })}
            />
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)]"
            >
              <LogOut className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            </button>
          )}
        </div>
      </header>

      {/* ── Term picker dropdown ── */}
      {showTermPicker && (
        <div className="absolute top-14 left-4 z-50 rounded-xl border border-border bg-[hsl(var(--card))] shadow-2xl overflow-hidden">
          {TERMS.map(term => (
            <button
              key={term}
              onClick={() => { setActiveTerm(term); setShowTermPicker(false) }}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                activeTerm === term
                  ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-semibold"
                  : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              )}
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* ── Screen toggle (Section vs Main view) ── */}
      <div className="flex border-b border-border shrink-0 bg-[hsl(var(--card))]">
        <button
          onClick={() => setScreen("main")}
          className={cn(
            "flex-1 py-2 text-xs font-semibold transition-colors",
            screen === "main"
              ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]"
              : "text-[hsl(var(--muted-foreground))]"
          )}
        >
          Dashboard
        </button>
        <button
          onClick={() => setScreen("section")}
          className={cn(
            "flex-1 py-2 text-xs font-semibold transition-colors",
            screen === "section"
              ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]"
              : "text-[hsl(var(--muted-foreground))]"
          )}
        >
          {sectionLabel}
        </button>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

        {screen === "main" ? (
          <>
            {/* View tabs */}
            <div className="flex gap-1 px-3 pt-3 pb-2 shrink-0">
              {viewTabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMainView(key)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                    mainView === key
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Main view content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-24">
              {mainView === "dashboard" ? <ProgressDashboard activeTerm={activeTerm} /> :
               mainView === "kanban"    ? <KanbanBoard activeTerm={activeTerm} /> :
                                          <CalendarView />}
            </div>
          </>
        ) : (
          /* Section panel content */
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-24">
            {sectionPanels[activeSection]}
          </div>
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-[hsl(var(--card))] pb-safe">
        <div className="flex">
          {sectionTabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key
            return (
              <button
                key={key}
                onClick={() => { setActiveSection(key); setScreen("section") }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors",
                  isActive
                    ? "text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))]"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(187,100%,50%,0.6)]")} />
                <span className="text-[9px] font-medium">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}