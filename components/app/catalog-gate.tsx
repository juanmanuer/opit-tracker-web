"use client"

// Loads the signed-in person's course catalogue (built-in or discovered from
// their Canvas) BEFORE the app renders, so every screen shows their courses.
// No Canvas yet → a short "connect Canvas" step.
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { KeyRound, Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { setActiveCatalog, type Catalog } from "@/lib/catalog"

type Ctx = {
  catalog: Catalog
  role: string
  version: number
  setCatalog: (c: Catalog) => void
  refresh: () => Promise<{ ok: boolean; error?: string }>
}
const CatalogContext = createContext<Ctx | null>(null)
export const useCatalog = () => {
  const c = useContext(CatalogContext)
  if (!c) throw new Error("useCatalog outside CatalogGate")
  return c
}

const muted = "text-[hsl(var(--muted-foreground))]"

export function CatalogGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ catalog: Catalog; role: string; connected: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const apply = useCallback((catalog: Catalog, extra: Partial<{ role: string; connected: boolean }> = {}) => {
    setActiveCatalog(catalog)
    setState(s => ({ role: s?.role ?? "student", connected: s?.connected ?? true, ...extra, catalog }))
    setVersion(v => v + 1)
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/catalog")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      apply(data.catalog, { role: data.role, connected: data.canvasConnected })
    } catch (e) {
      setError(String(e).replace("Error: ", ""))
    }
  }, [apply])

  useEffect(() => { load() }, [load])

  const refresh = useCallback(async () => {
    const res = await fetch("/api/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` }
    apply(data.catalog)
    return { ok: true }
  }, [apply])

  if (error) return (
    <Center>
      <p className="text-sm">Couldn't load your courses.</p>
      <p className={`text-xs ${muted}`}>{error}</p>
      <button onClick={load} className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]">Try again</button>
    </Center>
  )
  if (!state) return <Center><Loader2 className={`h-5 w-5 animate-spin ${muted}`} /><p className={`text-xs ${muted}`}>Loading your courses…</p></Center>

  const empty = Object.keys(state.catalog.terms).length === 0
  if (empty) return <ConnectCanvas connected={state.connected} onDone={async () => { await load() }} />

  return (
    <CatalogContext.Provider value={{ catalog: state.catalog, role: state.role, version, setCatalog: c => apply(c), refresh }}>
      {children}
    </CatalogContext.Provider>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center bg-background">{children}</div>
}

// First run for someone new: paste a Canvas token → courses are discovered
function ConnectCanvas({ connected, onDone }: { connected: boolean; onDone: () => Promise<void> }) {
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const discover = async () => {
    const res = await fetch("/api/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    if (!Object.keys(data.catalog?.terms ?? {}).length) throw new Error("Canvas is connected, but no courses were found. OPIT Tracker shows the courses you study or teach in Canvas — if you were just enrolled, try again later.")
  }

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      if (!connected || token.trim()) {
        const res = await fetch("/api/canvas/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token.trim() }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setMsg("Reading your courses from Canvas… (10–20 seconds)")
      await discover()
      await onDone()
    } catch (e) {
      setMsg(String(e).replace("Error: ", ""))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Center>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-left flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-[hsl(var(--primary)/0.12)]"><KeyRound className="h-5 w-5 text-[hsl(var(--primary))]" /></div>
          <div>
            <p className="text-base font-semibold">Connect your Canvas</p>
            <p className={`text-xs ${muted}`}>Your courses, assessments, weights and deadlines are read from it automatically — the ones you study or teach.</p>
          </div>
        </div>
        <ol className={`text-xs ${muted} list-decimal pl-4 flex flex-col gap-1`}>
            <li>Open <a className="underline inline-flex items-center gap-0.5" href="https://opit.instructure.com/profile/settings" target="_blank" rel="noreferrer">Canvas → Account → Settings <ExternalLink className="h-3 w-3" /></a></li>
            <li>Press <b>+ New Access Token</b>, purpose “OPIT Tracker”, generate</li>
            <li>Copy it and paste it here. It's stored encrypted and renewed automatically.</li>
          </ol>
        <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder={connected ? "Canvas is connected — paste a new token only to replace it" : "Paste your Canvas token"} autoComplete="off"
          className="text-sm rounded-lg px-3 py-2 bg-[hsl(var(--muted))] border border-border outline-none focus:border-[hsl(var(--primary))]" />
        <button onClick={submit} disabled={busy || (!connected && token.trim().length < 20)}
          className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {connected && !token.trim() ? "Read my courses again" : "Connect and load my courses"}
        </button>
        {msg && <p className={`text-xs ${/found|error|rejected|different|HTTP|failed/i.test(msg) ? "text-[hsl(var(--destructive))]" : muted}`}>{msg}</p>}
        <button onClick={() => signOut({ callbackUrl: "/login" })} className={`text-[11px] ${muted} hover:underline self-start`}>Sign out</button>
      </div>
    </Center>
  )
}
