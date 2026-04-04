"use client"

import { ExportButton } from "@/components/dashboard/export-button"
import { cn } from "@/lib/utils"
import { TERMS, initialAssessments, type Term } from "@/lib/store"
import { Bell, Search, LogOut, Sun, Moon, X, Trophy, Calendar, BookOpen } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from "react"

interface TopNavProps {
  activeTerm: Term
  onTermChange: (term: Term) => void
}

export function TopNav({ activeTerm, onTermChange }: TopNavProps) {
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)

  // Panel states
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showSearch])

  // Close all panels when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-nav-panel]")) {
        setShowSearch(false)
        setShowNotifications(false)
        setShowProfile(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Search data ────────────────────────────────────────────────────────
  const allSearchItems = initialAssessments.map((a) => ({
    id: a.id,
    title: a.title,
    subtitle: `${a.courseCode} · ${a.course}`,
    meta: a.deadline !== "TBD" ? a.deadline : "",
    type: "assessment" as const,
  }))

  const searchResults = searchQuery.trim().length < 2 ? [] :
    allSearchItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6)

  // ── Notifications ──────────────────────────────────────────────────────
  const today = new Date()
  const upcoming = initialAssessments
    .filter((a) => {
      if (a.deadline === "TBD") return false
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      }
      const [mon, day] = a.deadline.split(" ")
      if (!months[mon] === undefined || !day) return false
      const dueDate = new Date(2026, months[mon], parseInt(day))
      const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 14
    })
    .sort((a, b) => {
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      }
      const [aM, aD] = a.deadline.split(" ")
      const [bM, bD] = b.deadline.split(" ")
      return new Date(2026, months[aM], parseInt(aD)).getTime() -
             new Date(2026, months[bM], parseInt(bD)).getTime()
    })
    .slice(0, 5)

  const hasNotifications = upcoming.length > 0

  function getDaysUntil(deadline: string): number {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    const [mon, day] = deadline.split(" ")
    const due = new Date(2026, months[mon], parseInt(day))
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  function urgencyColor(days: number) {
    if (days <= 3)  return "text-red-400"
    if (days <= 7)  return "text-[hsl(var(--neon-yellow))]"
    return "text-[hsl(var(--primary))]"
  }

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-[hsl(var(--card))] px-6 py-3 relative z-50">

      {/* Term tabs */}
      <nav className="flex items-center gap-1 rounded-lg bg-[hsl(var(--muted))] p-1" role="tablist" aria-label="Term navigation">
        {TERMS.map((term) => (
          <button
            key={term}
            role="tab"
            aria-selected={activeTerm === term}
            onClick={() => onTermChange(term)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
              activeTerm === term
                ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_12px_hsl(187,100%,50%,0.3)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
            )}
          >
            {term}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Dark/Light toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        {/* ── SEARCH ── */}
        <div data-nav-panel className="relative">
          <button
            onClick={() => { setShowSearch(!showSearch); setShowNotifications(false); setShowProfile(false) }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              showSearch
                ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            )}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {showSearch && (
            <div className="absolute right-0 top-10 w-80 rounded-xl border border-border bg-[hsl(var(--card))] shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <Search className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assessments, courses..."
                  className="flex-1 bg-transparent text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  </button>
                )}
              </div>

              {searchQuery.length < 2 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Type at least 2 characters to search</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">No results for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="flex flex-col py-1 max-h-64 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer">
                      <div className="h-6 w-6 rounded-md bg-[hsl(var(--primary)/0.15)] flex items-center justify-center shrink-0">
                        <BookOpen className="h-3 w-3 text-[hsl(var(--primary))]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{item.title}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{item.subtitle}</p>
                      </div>
                      {item.meta && (
                        <span className="text-[9px] text-[hsl(var(--muted-foreground))] shrink-0">{item.meta}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── NOTIFICATIONS ── */}
        <div data-nav-panel className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowSearch(false); setShowProfile(false) }}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              showNotifications
                ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            )}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasNotifications && (
              <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-[hsl(var(--secondary))] animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-10 w-80 rounded-xl border border-border bg-[hsl(var(--card))] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-[hsl(var(--foreground))]">Upcoming Deadlines</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--secondary)/0.15)] text-[hsl(var(--secondary))]">
                  Next 14 days
                </span>
              </div>

              {upcoming.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <Trophy className="h-6 w-6 text-[hsl(var(--primary))] mx-auto mb-2" />
                  <p className="text-xs font-medium text-[hsl(var(--foreground))]">All clear!</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">No deadlines in the next 14 days</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border max-h-72 overflow-y-auto">
                  {upcoming.map((a) => {
                    const days = getDaysUntil(a.deadline)
                    return (
                      <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-[hsl(var(--muted))] transition-colors">
                        <div className="h-6 w-6 rounded-md bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0 mt-0.5">
                          <Calendar className="h-3 w-3 text-[hsl(var(--primary))]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{a.title}</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{a.courseCode} · {a.course}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("text-[10px] font-bold", urgencyColor(days))}>
                            {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d`}
                          </p>
                          <p className="text-[9px] text-[hsl(var(--muted-foreground))]">{a.deadline}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="px-3 py-2 border-t border-border bg-[hsl(var(--muted)/0.3)]">
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] text-center">
                  Grade change alerts sent via email automatically
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── PROFILE ── */}
        <div data-nav-panel className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowSearch(false); setShowNotifications(false) }}
            className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border-2 border-transparent hover:border-[hsl(var(--primary)/0.5)] transition-all"
            aria-label="Profile"
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
                <span className="text-[10px] font-bold text-[hsl(var(--primary))]">
                  {session?.user?.name?.charAt(0) ?? "?"}
                </span>
              </div>
            )}
          </button>

          {showProfile && (
            <div className="absolute right-0 top-10 w-64 rounded-xl border border-border bg-[hsl(var(--card))] shadow-2xl overflow-hidden">
              {/* Avatar + name */}
              <div className="flex flex-col items-center gap-2 px-4 py-5 bg-[hsl(var(--muted)/0.3)]">
                <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[hsl(var(--primary)/0.3)]">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
                      <span className="text-lg font-bold text-[hsl(var(--primary))]">
                        {session?.user?.name?.charAt(0) ?? "?"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {session?.user?.name ?? "Student"}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {session?.user?.email ?? ""}
                  </p>
                </div>
              </div>

              {/* Info rows */}
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Program</span>
                  <span className="text-[10px] font-medium text-[hsl(var(--foreground))]">BSc Modern Computer Science</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Institution</span>
                  <span className="text-[10px] font-medium text-[hsl(var(--foreground))]">OPIT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Active Term</span>
                  <span className="text-[10px] font-medium text-[hsl(var(--primary))]">{activeTerm}</span>
                </div>
              </div>

              {/* Logout */}
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

{/* Export */}
<ExportButton activeTerm={activeTerm} />

{/* Logout button (standalone) */}
<button
  onClick={handleLogout}
  className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-red-400 transition-colors"
  aria-label="Log out"
  title="Log out"
>
  <LogOut className="h-4 w-4" />
</button>

      </div>
    </header>
  )
}