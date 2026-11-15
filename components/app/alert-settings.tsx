"use client"

import { useEffect, useState } from "react"


// Each person's own alert channels (email + private ntfy topic for the phone)
export function AlertSettings() {
  const [s, setS] = useState<{ ntfyTopic: string; ntfyUrl: string; emailAlerts: boolean; pushAlerts: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => { fetch("/api/user/settings").then(r => r.ok ? r.json() : null).then(setS).catch(() => {}) }, [])
  if (!s) return null
  const save = (patch: Partial<typeof s>) => {
    setS({ ...s, ...patch })
    fetch("/api/user/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => {})
  }
  const Toggle = ({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none">
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="accent-[hsl(var(--primary))]" /> {label}
    </label>
  )
  return (
    <div className="rounded-xl border border-border bg-[hsl(var(--muted)/0.4)] p-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-[11px] font-medium">Alerts</span>
        <Toggle on={s.emailAlerts} label="Email" onChange={v => save({ emailAlerts: v })} />
        <Toggle on={s.pushAlerts} label="Phone (ntfy)" onChange={v => save({ pushAlerts: v })} />
      </div>
      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
        Phone: install the free <a className="underline" href="https://ntfy.sh/app" target="_blank" rel="noreferrer">ntfy app</a> and subscribe to your private topic{" "}
        <button onClick={() => { navigator.clipboard?.writeText(s.ntfyTopic); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))]">{copied ? "copied ✓" : s.ntfyTopic}</button>
        {" "}— keep it to yourself.
      </p>
    </div>
  )
}


