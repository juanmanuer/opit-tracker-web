"use client"

import { cn } from "@/lib/utils"
import type { SidebarSection } from "@/lib/store"
import {
  ClipboardList,
  CheckSquare,
  BarChart3,
  Mail,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface SidebarProps {
  activeSection: SidebarSection
  onSectionChange: (section: SidebarSection) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const sections: { key: SidebarSection; label: string; icon: typeof ClipboardList; description: string }[] = [
  { key: "assessments", label: "Assessments", icon: ClipboardList, description: "Deadlines & submissions" },
  { key: "practices", label: "Practices", icon: CheckSquare, description: "Exercises & worksheets" },
  { key: "grades", label: "Grades", icon: BarChart3, description: "Scores & weights" },
  { key: "misc", label: "Misc", icon: Mail, description: "Emails & Zoom links" },
  { key: "attendance", label: "Attendance", icon: CalendarCheck, description: "Class participation" },
]

export function Sidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-[hsl(var(--sidebar-background))] transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] neon-glow-cyan">
          <span className="text-sm font-bold text-[hsl(var(--primary-foreground))]">O</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-[hsl(var(--foreground))] neon-text-cyan tracking-wide">
              OPIT Tracker
            </h1>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Academic Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1" role="navigation" aria-label="Sidebar navigation">
        {sections.map((s) => {
          const Icon = s.icon
          const isActive = activeSection === s.key
          return (
            <button
              key={s.key}
              onClick={() => onSectionChange(s.key)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 group relative",
                isActive
                  ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--foreground))]"
              )}
              title={collapsed ? s.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[hsl(var(--primary))]" />
              )}
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "drop-shadow-[0_0_6px_hsl(187,100%,50%,0.6)]")} />
              {!collapsed && (
                <div className="overflow-hidden">
                  <span className="font-medium">{s.label}</span>
                  {isActive && (
                    <span className="block text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{s.description}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-border">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full rounded-lg py-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--foreground))] transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
