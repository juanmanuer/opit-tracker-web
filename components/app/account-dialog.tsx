"use client"

// Account: who you are, alerts, Canvas courses, export / delete your data, sign out.
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Download, Trash2, LogOut, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertSettings } from "@/components/app/alert-settings"
import { useCatalog } from "@/components/app/catalog-gate"

const muted = "text-[hsl(var(--muted-foreground))]"
const ROLE_LABEL: Record<string, string> = { student: "Student", teacher: "Professor / tutor", staff: "Staff" }

export function AccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: session } = useSession()
  const { catalog, role, refresh } = useCatalog()
  const [confirm, setConfirm] = useState("")
  const [showDelete, setShowDelete] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const email = session?.user?.email ?? ""

  const reload = async () => {
    setBusy(true); setMsg("Reading your courses from Canvas…")
    const r = await refresh()
    setBusy(false); setMsg(r.ok ? "Courses updated from Canvas." : r.error ?? "Couldn't update")
  }
  const erase = async () => {
    setBusy(true)
    const res = await fetch("/api/user/data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setMsg(data.error ?? "Couldn't delete")
    signOut({ callbackUrl: "/login" })
  }
  const discovered = catalog.discoveredAt ? new Date(catalog.discoveredAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Account</DialogTitle>
        <DialogDescription>{email} · {ROLE_LABEL[role] ?? role}</DialogDescription>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium">Alerts</p>
          <AlertSettings />
        </section>

        <section className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">Courses</p>
          <p className={`text-[11px] ${muted}`}>
            {Object.keys(catalog.terms).length} terms · read from your Canvas{discovered ? ` (last: ${discovered})` : ""}. Updates daily.
          </p>
          <button onClick={reload} disabled={busy} className="self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))] disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Re-read my courses now
          </button>
        </section>

        <section className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">Your data</p>
          <p className={`text-[11px] ${muted}`}>Stored only to run this app for you. Your Canvas token is encrypted and never shown or exported.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/user/data" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><Download className="h-3.5 w-3.5" /> Export my data</a>
            <button onClick={() => setShowDelete(v => !v)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:text-[hsl(var(--destructive))]"><Trash2 className="h-3.5 w-3.5" /> Delete my data</button>
          </div>
          {showDelete && (
            <div className="rounded-xl border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.08)] p-3 flex flex-col gap-2">
              <p className="text-[11px]">This permanently erases your grades, attendance, practices, notes, calendar events and settings, and disconnects Canvas. It can't be undone — export first if you want a copy.</p>
              <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={`Type ${email} to confirm`}
                className="text-xs rounded-md px-2 py-1.5 bg-background border border-border outline-none" />
              <button onClick={erase} disabled={busy || confirm.trim().toLowerCase() !== email.toLowerCase()}
                className="self-start text-xs font-medium px-3 py-1.5 rounded-lg bg-[hsl(var(--destructive))] text-white disabled:opacity-40">Delete everything</button>
            </div>
          )}
        </section>

        {msg && <p className={`text-[11px] ${muted}`}>{msg}</p>}
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
      </DialogContent>
    </Dialog>
  )
}
