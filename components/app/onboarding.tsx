"use client"

// First-visit welcome: confirm role → phone alerts → install the app.
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { GraduationCap, Presentation, Building2, Bell, Smartphone, Check, ArrowRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertSettings } from "@/components/app/alert-settings"
import { InstallButton } from "@/components/app/install-button"
import { useCatalog } from "@/components/app/catalog-gate"

type Role = "student" | "teacher" | "staff"
const ROLES: { key: Role; label: string; text: string; icon: typeof GraduationCap }[] = [
  { key: "student", label: "Student", text: "Grades, bonuses, attendance, deadlines and reminders.", icon: GraduationCap },
  { key: "teacher", label: "Professor / tutor", text: "Your courses, deadlines, and the course info students get reminders from.", icon: Presentation },
  { key: "staff", label: "Staff", text: "Course overview for the courses you're enrolled in on Canvas.", icon: Building2 },
]
const muted = "text-[hsl(var(--muted-foreground))]"

export function Onboarding() {
  const { data: session, update } = useSession()
  const { catalog } = useCatalog()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role>("student")
  const [initialRole, setInitialRole] = useState<Role>("student")
  const [test, setTest] = useState<string | null>(null)
  const [alertsOk, setAlertsOk] = useState(false)

  useEffect(() => {
    fetch("/api/user/settings").then(r => (r.ok ? r.json() : null)).then(s => {
      if (!s || s.onboarded || s.builtInCourses) return
      setRole(s.role); setInitialRole(s.role); setAlertsOk(!!s.alertsAvailable); setOpen(true)
    }).catch(() => {})
  }, [])

  const finish = async () => {
    await fetch("/api/user/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, onboarded: true }) }).catch(() => {})
    setOpen(false)
    if (role !== initialRole) { await update?.(); window.location.reload() }
  }
  const sendTest = async () => {
    setTest("Sending…")
    const r = await fetch("/api/canvas/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test-alert" }) }).catch(() => null)
    setTest(r?.ok ? "Sent — check the ntfy app on your phone." : "Couldn't send. Try again in a minute.")
  }

  const terms = Object.keys(catalog.terms)
  const courses = terms.reduce((n, t) => n + catalog.terms[t].courses.length, 0)
  const first = session?.user?.name?.split(" ")[0]

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) finish() }}>
      <DialogContent className="max-w-md">
        <div className="flex gap-1 mb-1">{[0, 1, 2].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"}`} />)}</div>

        {step === 0 && <>
          <DialogTitle>Welcome{first ? `, ${first}` : ""} 👋</DialogTitle>
          <DialogDescription>We found {courses} course{courses === 1 ? "" : "s"} in your Canvas across {terms.length} term{terms.length === 1 ? "" : "s"}. How do you use OPIT?</DialogDescription>
          <div className="flex flex-col gap-2 mt-2">
            {ROLES.map(r => (
              <button key={r.key} onClick={() => setRole(r.key)}
                className={`flex items-start gap-3 text-left rounded-xl border p-3 transition-colors ${role === r.key ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]" : "border-border hover:bg-[hsl(var(--muted))]"}`}>
                <r.icon className="h-5 w-5 mt-0.5 text-[hsl(var(--primary))]" />
                <span><span className="text-sm font-medium block">{r.label}</span><span className={`text-xs ${muted}`}>{r.text}</span></span>
                {role === r.key && <Check className="h-4 w-4 ml-auto text-[hsl(var(--primary))]" />}
              </button>
            ))}
          </div>
        </>}

        {step === 1 && <>
          <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Alerts on your phone</DialogTitle>
          <DialogDescription>New grades, live sessions starting, and deadlines in 2 days / 6 hours — plus a Sunday summary of your week.</DialogDescription>
          <ol className={`text-xs ${muted} list-decimal pl-4 flex flex-col gap-1 mt-1`}>
            <li>Install the free <b>ntfy</b> app (App Store / Google Play)</li>
            <li>Tap <b>+</b> and subscribe to your private topic below</li>
            <li>Press <b>Send a test</b></li>
          </ol>
          <div className="mt-2"><AlertSettings /></div>
          <div className="flex items-center gap-2">
            <button onClick={sendTest} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]">Send a test</button>
            {test && <span className={`text-xs ${muted}`}>{test}</span>}
          </div>
        </>}

        {step === 2 && <>
          <DialogTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Put it on your home screen</DialogTitle>
          <DialogDescription>It opens full-screen like a normal app.</DialogDescription>
          <div className={`text-xs ${muted} flex flex-col gap-2 mt-1`}>
            <p><b>Android / desktop:</b> <InstallButton /></p>
            <p><b>iPhone:</b> open this page in Safari → Share → <i>Add to Home Screen</i>.</p>
            <p>Tip: press <kbd className="font-mono px-1 rounded bg-[hsl(var(--muted))]">Ctrl K</kbd> anywhere to search courses and jump around.</p>
          </div>
        </>}

        <div className="flex items-center gap-2 mt-3">
          {step > 0 && <button onClick={() => setStep(step === 2 && (role !== "student" || !alertsOk) ? 0 : step - 1)} className={`text-xs ${muted} hover:underline`}>Back</button>}
          <button onClick={finish} className={`text-xs ${muted} hover:underline ml-auto`}>Skip</button>
          {/* phone alerts are for students; professors and staff skip that step */}
          <button onClick={() => (step < 2 ? setStep(step === 0 && (role !== "student" || !alertsOk) ? 2 : step + 1) : finish())}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
            {step < 2 ? <>Next <ArrowRight className="h-4 w-4" /></> : <>Done <Check className="h-4 w-4" /></>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
