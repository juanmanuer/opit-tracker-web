"use client"

import { cn } from "@/lib/utils"
import { TERMS, type Term } from "@/lib/store"
import { Bell, Search, User } from "lucide-react"

interface TopNavProps {
  activeTerm: Term
  onTermChange: (term: Term) => void
}

export function TopNav({ activeTerm, onTermChange }: TopNavProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-[hsl(var(--card))] px-6 py-3">
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
      <div className="flex items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors" aria-label="Search">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-[hsl(var(--secondary))]" />
        </button>
        <div className="h-8 w-8 rounded-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
          <User className="h-4 w-4 text-[hsl(var(--primary))]" />
        </div>
      </div>
    </header>
  )
}
