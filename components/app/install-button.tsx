"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"

// Registers the service worker and shows "Install app" when the browser allows it
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const [prompt, setPrompt] = useState<any>(null)

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {})
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e) }
    const onInstalled = () => setPrompt(null)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled) }
  }, [])

  if (!prompt) return null
  return (
    <button onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null) }} title="Install OPIT Tracker as an app"
      className={compact
        ? "h-9 w-9 rounded-xl flex items-center justify-center bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
        : "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"}>
      <Download className="h-4 w-4" />{!compact && " Install app"}
    </button>
  )
}
