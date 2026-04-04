"use client"

export const dynamic = "force-dynamic"

import React, { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopNav } from "@/components/dashboard/top-nav"
import { KanbanBoard } from "@/components/dashboard/kanban-board"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { ProgressDashboard } from "@/components/dashboard/progress-dashboard"
import { MobileLayout } from "@/components/dashboard/mobile-layout"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  AssessmentsPanel, PracticesPanel, GradesPanel,
  MiscPanel, AttendancePanel, CoursesPanel,
} from "@/components/dashboard/section-panels"
import type { Term, SidebarSection } from "@/lib/store"
import { LayoutGrid, Calendar, BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Page() {
  const isMobile = useIsMobile()
  const [activeTerm, setActiveTerm] = useState<Term>("Term 2")
  const [activeSection, setActiveSection] = useState<SidebarSection>("assessments")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mainView, setMainView] = useState<"dashboard" | "kanban" | "calendar">("dashboard")

  // Render mobile layout on small screens
  if (isMobile) return <MobileLayout />

  const sectionPanels: Record<SidebarSection, React.ReactNode> = {
    assessments: <AssessmentsPanel activeTerm={activeTerm} />,
    practices:   <PracticesPanel activeTerm={activeTerm} />,
    grades:      <GradesPanel activeTerm={activeTerm} />,
    misc:        <MiscPanel activeTerm={activeTerm} />,
    attendance:  <AttendancePanel activeTerm={activeTerm} />,
    courses:     <CoursesPanel activeTerm={activeTerm} />,
  }

  const views = [
    { key: "dashboard" as const, label: "Overview",  icon: BarChart2  },
    { key: "kanban"    as const, label: "Board",      icon: LayoutGrid },
    { key: "calendar"  as const, label: "Calendar",   icon: Calendar   },
  ]

  const titles: Record<typeof mainView, string> = {
    dashboard: "Overview",
    kanban:    "Task Board",
    calendar:  "Calendar",
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav activeTerm={activeTerm} onTermChange={setActiveTerm} />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="w-80 shrink-0 border-r border-border bg-[hsl(var(--background))] p-4 overflow-y-auto">
            {sectionPanels[activeSection]}
          </div>

          <main className="flex-1 flex flex-col min-w-0 p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">{titles[mainView]}</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{activeTerm} Overview</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--muted))] p-1">
                {views.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setMainView(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      mainView === key
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_10px_hsl(187,100%,50%,0.25)]"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {mainView === "dashboard" ? <ProgressDashboard activeTerm={activeTerm} /> :
               mainView === "kanban"    ? <KanbanBoard activeTerm={activeTerm} /> :
                                          <CalendarView />}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}