// app/login/page.tsx
"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [focusedField, setFocusedField] = useState<"email"|"password"|null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--background))]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[hsl(var(--primary)/0.04)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Glow behind card — same as your LoginOverlay */}
        <div className="absolute -inset-1 rounded-2xl bg-[hsl(var(--primary)/0.1)] blur-xl" />

        <div className="relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-2xl">

          {/* Logo — identical to your LoginOverlay */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] neon-glow-cyan">
              <span className="text-sm font-bold text-[hsl(var(--primary-foreground))]">O</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[hsl(var(--foreground))] neon-text-cyan tracking-wide">
                OPIT Tracker
              </h1>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] -mt-0.5">
                Academic Dashboard
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1.5 uppercase tracking-wider"
              >
                Email
              </label>
              <div className={`relative rounded-lg border transition-all duration-200 ${
                focusedField === "email"
                  ? "border-[hsl(var(--primary))] neon-glow-cyan"
                  : "border-[hsl(var(--border))]"
              }`}>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@opit.edu"
                  className="w-full rounded-lg bg-[hsl(var(--muted))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.5)] outline-none"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1.5 uppercase tracking-wider"
              >
                Password
              </label>
              <div className={`relative rounded-lg border transition-all duration-200 ${
                focusedField === "password"
                  ? "border-[hsl(var(--primary))] neon-glow-cyan"
                  : "border-[hsl(var(--border))]"
              }`}>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[hsl(var(--muted))] px-3.5 py-2.5 pr-10 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.5)] outline-none"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass
                    ? <EyeOff className="h-3.5 w-3.5" />
                    : <Eye    className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-all shadow-[0_0_16px_hsl(187,100%,50%,0.25)] hover:shadow-[0_0_24px_hsl(187,100%,50%,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Enter Dashboard"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))] mt-4">
            OPIT Tracker · Academic use only
          </p>
        </div>
      </div>
    </div>
  )
}