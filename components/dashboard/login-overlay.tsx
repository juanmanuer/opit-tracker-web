"use client"

import React from "react"

import { useState } from "react"
import { ArrowRight } from "lucide-react"

interface LoginOverlayProps {
  onLogin: (email: string) => void
}

export function LoginOverlay({ onLogin }: LoginOverlayProps) {
  const [email, setEmail] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) onLogin(email.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--background)/0.85)] backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 rounded-2xl bg-[hsl(var(--primary)/0.1)] blur-xl" />

        <div className="relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] neon-glow-cyan">
              <span className="text-sm font-bold text-[hsl(var(--primary-foreground))]">O</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[hsl(var(--foreground))] neon-text-cyan tracking-wide">OPIT Tracker</h1>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] -mt-0.5">Academic Dashboard</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <div className={`relative rounded-lg border transition-all duration-200 ${isFocused ? "border-[hsl(var(--primary))] neon-glow-cyan" : "border-[hsl(var(--border))]"}`}>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="you@opit.edu"
                  className="w-full rounded-lg bg-[hsl(var(--muted))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.5)] outline-none"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-all shadow-[0_0_16px_hsl(187,100%,50%,0.25)] hover:shadow-[0_0_24px_hsl(187,100%,50%,0.35)]"
            >
              Enter Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))] mt-4">
            Use any email to continue
          </p>
        </div>
      </div>
    </div>
  )
}
