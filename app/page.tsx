"use client"

import React from "react"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopNav } from "@/components/dashboard/top-nav"
import { KanbanBoard } from "@/components/dashboard/kanban-board"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { LoginOverlay } from "@/components/dashboard/login-overlay"
import {
  AssessmentsPanel,
  PracticesPanel,
  GradesPanel,
  MiscPanel,
  AttendancePanel,
  CoursesPanel,
} from "@/components/dashboard/section-panels"
import type { Term, SidebarSection } from "@/lib/store"
import { LayoutGrid, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Page() {
  const [loggedIn, setLoggedIn] = useState(false)
const [activeTerm, setActiveTerm] = useState<Term>("Term 2")
  const [activeSection, setActiveSection] = useState<SidebarSection>("assessments")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mainView, setMainView] = useState<"kanban" | "calendar">("kanban")

  const sectionPanels: Record<SidebarSection, React.ReactNode> = {
    assessments: <AssessmentsPanel />,
    practices: <PracticesPanel />,
    grades: <GradesPanel />,
    misc: <MiscPanel />,
    attendance: <AttendancePanel />,
  }

  return (
    <>
      {!loggedIn && <LoginOverlay onLogin={() => setLoggedIn(true)} />}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav activeTerm={activeTerm} onTermChange={setActiveTerm} />

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Section detail panel */}
            <div className="w-80 shrink-0 border-r border-border bg-[hsl(var(--background))] p-4 overflow-y-auto">
              {sectionPanels[activeSection]}
            </div>

            {/* Main content */}
            <main className="flex-1 flex flex-col min-w-0 p-5 overflow-hidden">
              {/* View toggle */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                    {mainView === "kanban" ? "Task Board" : "Calendar"}
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{activeTerm} Overview</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--muted))] p-1">
                  <button
                    onClick={() => setMainView("kanban")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      mainView === "kanban"
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_10px_hsl(187,100%,50%,0.25)]"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    )}
                    aria-label="Kanban view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Board
                  </button>
                  <button
                    onClick={() => setMainView("calendar")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      mainView === "calendar"
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_10px_hsl(187,100%,50%,0.25)]"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    )}
                    aria-label="Calendar view"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Calendar
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {mainView === "kanban" ? <KanbanBoard /> : <CalendarView />}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  )
}
