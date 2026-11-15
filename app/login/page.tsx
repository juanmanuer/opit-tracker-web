"use client"

import React, { useEffect, useState } from "react"
import { signIn } from "next-auth/react"

const TERMINAL = [
  { t: "$ opit-tracker boot --env production", c: "#e6edf3" },
  { t: "✓ canvas      linked · grades & deadlines", c: "#5eead4" },
  { t: "✓ attendance  13 live sessions per course", c: "#5eead4" },
  { t: "✓ bonus       +5 live · +5 practices · max 110", c: "#5eead4" },
  { t: "✓ runway      term timeline compiled", c: "#5eead4" },
  { t: "✓ ntfy        reminders armed", c: "#5eead4" },
  { t: "→ awaiting authentication…", c: "#fbbf24" },
]

const TOKENS = [
  "SELECT * FROM grades;", "git push origin main", "200 OK", "ssh opit@canvas", "npm run build", "</>", "{ term: 3 }",
  "await sync()", "HTTP/2", "0xC0FFEE", "kubectl get pods", "ping 1.1.1.1", "SQL", "TLS 1.3", "λ", "∑ weights = 100",
  "docker compose up", "cron: */5 * * * *", "AES-256-GCM", "#!/bin/bash", "POST /api/attend", "ICS → calendar",
]

const ERRORS: Record<string, string> = {
  AccessDenied: "Access denied. Sign in with your OPIT Google account (any @opit.com address).",
  OAuthSignin: "Couldn't reach Google. Try again.",
  OAuthCallback: "Google sign-in was interrupted. Try again.",
  Default: "Sign-in failed. Try again.",
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lines, setLines] = useState(0)
  const [hasOpitLogo, setHasOpitLogo] = useState(false)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error")
    if (code) setError(ERRORS[code] ?? ERRORS.Default)
    // Show the official OPIT logo only if /public/opit-logo.svg exists
    fetch("/opit-logo.svg", { method: "HEAD" }).then(r => setHasOpitLogo(r.ok && (r.headers.get("content-type") ?? "").includes("svg"))).catch(() => {})
    const timer = setInterval(() => setLines(n => (n >= TERMINAL.length ? n : n + 1)), 420)
    return () => clearInterval(timer)
  }, [])

  async function handleGoogle() {
    setLoading(true)
    setError("")
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl") ?? "/"
    await signIn("google", { callbackUrl })
  }

  return (
    <div className="login-root fixed inset-0 overflow-y-auto text-white">
      <style>{`
        .login-root { background: radial-gradient(1200px 700px at 15% 10%, #1e1b4b 0%, transparent 60%),
                                  radial-gradient(1000px 700px at 90% 90%, #0c4a6e 0%, transparent 60%),
                                  linear-gradient(135deg, #0f172a 0%, #111c3a 45%, #0b2a3c 100%); }
        .grid-bg { background-image: linear-gradient(rgba(148,163,184,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.07) 1px, transparent 1px);
                   background-size: 44px 44px; mask-image: radial-gradient(ellipse at center, black 35%, transparent 80%); }
        @keyframes drift { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(40px,-30px) scale(1.12) } }
        @keyframes float { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: .55 } 85% { opacity: .55 } 100% { transform: translateY(-120px); opacity: 0 } }
        @keyframes blink { 50% { opacity: 0 } }
        @keyframes scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(100%) } }
        .orb { position:absolute; border-radius:9999px; filter: blur(80px); animation: drift 16s ease-in-out infinite; }
        .token { position:absolute; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #93c5fd; white-space: nowrap; animation: float 9s linear infinite; }
        .caret { display:inline-block; width:8px; height:15px; background:#5eead4; vertical-align:-2px; animation: blink 1s step-end infinite; }
        .card-glow { background: conic-gradient(from 180deg at 50% 50%, #22d3ee, #a78bfa, #f472b6, #22d3ee); }
        @media (prefers-reduced-motion: reduce) { .orb, .token, .caret { animation: none } }
      `}</style>

      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="orb h-[420px] w-[420px] bg-cyan-500/30 -top-24 -left-20" />
        <div className="orb h-[480px] w-[480px] bg-violet-600/30 top-1/3 -right-32" style={{ animationDelay: "-5s" }} />
        <div className="orb h-[360px] w-[360px] bg-fuchsia-500/20 -bottom-24 left-1/4" style={{ animationDelay: "-9s" }} />
        <div className="grid-bg absolute inset-0" />
        {TOKENS.map((t, i) => (
          <span key={t} className="token hidden md:block"
            style={{
              // two side columns, one token per row, staggered — never overlapping the card or each other
              left: `${i % 2 ? 78 + (Math.floor(i / 2) % 3) * 5 : 3 + (Math.floor(i / 2) % 3) * 5}%`,
              top: `${14 + Math.floor(i / 2) * (78 / Math.ceil(TOKENS.length / 2))}%`,
              animationDelay: `${-(i * 1.7) % 9}s`, animationDuration: `${9 + (i % 4)}s`,
            }}>
            {t}
          </span>
        ))}
      </div>

      <div className="relative min-h-full flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-xl shadow-lg shadow-cyan-500/30" />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide">OPIT Tracker</p>
              <p className="text-[10px] text-slate-400 font-mono">v2.0 · academic command center</p>
            </div>
            {hasOpitLogo && (
              <img src="/opit-logo.svg" alt="OPIT" className="h-6 ml-3 pl-3 border-l border-white/15 opacity-90" />
            )}
          </div>
          <span className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-emerald-300/90 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" /> all systems operational
          </span>
        </header>

        {/* Centre */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-10 gap-8">
          <div className="text-center max-w-xl">
            <p className="font-mono text-xs text-cyan-300/90 mb-3">// BSc Modern Computer Science</p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Your degree, <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">compiled.</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300">Grades, live sessions, attendance and deadlines. One dashboard, synced with Canvas.</p>
          </div>

          {/* Sign-in card */}
          <div className="relative w-full max-w-md">
            <div className="card-glow absolute -inset-[1.5px] rounded-3xl opacity-70 blur-[2px]" />
            <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 p-7 sm:p-8 shadow-2xl">
              <p className="font-mono text-[11px] text-slate-400">$ auth login --provider google</p>
              <h2 className="mt-2 text-xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-slate-400">Use your OPIT student account to continue.</p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300 font-mono">✗ {error}</div>
              )}

              <button onClick={handleGoogle} disabled={loading}
                className="mt-6 w-full flex items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-white text-slate-900 px-5 py-3.5 text-[15px] font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-wait">
                <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.12z"/>
                  <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.54A8 8 0 0 0 1.83 5.43L4.5 7.5c.67-2 2.52-3.92 4.48-3.92z"/>
                </svg>
                {loading ? "Redirecting to Google…" : <><span className="sm:hidden">Sign in with OPIT account</span><span className="hidden sm:inline">Continue with your OPIT account</span></>}
              </button>

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-cyan-300">@students.opit.com</span>
                <span>·</span>
                <span className="font-mono rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-cyan-300">@faculty.opit.com</span>
                <span>·</span>
                <span className="font-mono rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-cyan-300">@opit.com</span>
              </div>
              <p className="mt-3 text-center text-[10px] text-slate-500 font-mono">🔒 OAuth 2.0 · TLS 1.3 · secrets encrypted with AES-256-GCM</p>
            </div>
          </div>

          {/* Terminal */}
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-white/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-2 text-[10px] font-mono text-slate-500">juanma@opit-tracker:~</span>
            </div>
            <div className="px-4 py-3 font-mono text-[11.5px] leading-6 min-h-[188px]">
              {TERMINAL.slice(0, lines).map(l => <p key={l.t} style={{ color: l.c }}>{l.t}</p>)}
              {lines >= TERMINAL.length && <p className="text-slate-300">$ <span className="caret" /></p>}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-xl">
            {["Grade center", "Term runway", "Live sessions", "Attendance", "Ctrl + K", "Push alerts", "Calendar sync"].map(f => (
              <span key={f} className="text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10 rounded-full px-3 py-1">{f}</span>
            ))}
          </div>
        </main>

        <footer className="px-6 pb-6 text-center text-[11px] text-slate-500 font-mono">
          built by Juan M. Aguilar · Next.js · Neon Postgres · Vercel ·{" "}
          <a href="/privacy" className="underline hover:text-slate-300">privacy</a>
        </footer>
      </div>
    </div>
  )
}
