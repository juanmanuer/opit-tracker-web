"use client"

import React, { useState } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  async function handleGoogle() {
    setLoading(true)
    setError("")
    const result = await signIn("google", { callbackUrl: "/" })
    if (result?.error) {
      setError("Access denied. Please use your @students.opit.com account.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--background))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[hsl(var(--primary)/0.04)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        <div className="absolute -inset-1 rounded-2xl bg-[hsl(var(--primary)/0.1)] blur-xl" />

        <div className="relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-2xl">

          <div className="flex items-center justify-center gap-2.5 mb-8">
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

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.8)] hover:border-[hsl(var(--primary))] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.12z"/>
              <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.54A8 8 0 0 0 1.83 5.43L4.5 7.5c.67-2 2.52-3.92 4.48-3.92z"/>
            </svg>
            {loading ? "Redirecting to Google..." : "Sign in with Google"}
          </button>

          <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))] mt-5">
            Only <span className="text-[hsl(var(--primary))]">@students.opit.com</span> and{" "}
            <span className="text-[hsl(var(--primary))]">@opit.com</span> accounts are allowed
          </p>
        </div>
      </div>
    </div>
  )
}