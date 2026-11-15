"use client"

// Professor, live session, office hours and Zoom for one course.
// Editable by anyone enrolled; shared with the whole course.
import { useState } from "react"
import { Video, Copy, Mail, User, Users, Clock, Pencil, Radio, Info } from "lucide-react"
import { professorOf, zoomUrl, parseLiveSession } from "@/lib/academic"
import { useCatalog } from "@/components/app/catalog-gate"

const muted = "text-[hsl(var(--muted-foreground))]"
const fg = "text-[hsl(var(--foreground))]"
const DAYS = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"]
const pad = (n: number) => String(n).padStart(2, "0")

// "Mondays 12:00–13:30" ⇄ { day, start, end }
function splitSlot(text: string) {
  const s = parseLiveSession(text ?? "")
  if (!s) return { day: "", start: "", end: "" }
  return { day: DAYS[(s.weekday + 6) % 7], start: `${pad(s.startH)}:${pad(s.startM)}`, end: `${pad(s.endH)}:${pad(s.endM)}` }
}
const joinSlot = (day: string, start: string, end: string) => (day && start && end ? `${day} ${start}–${end}` : "")
const clean = (s: string) => (s ?? "").replace(/\s*\(Malta\)/g, "")

export function CourseInfoCard({ term, code }: { term: string; code: string }) {
  const { catalog, setCatalog } = useCatalog()
  const prof = professorOf(term, code, catalog)
  const course = catalog.terms[term]?.courses.find(c => c.code === code)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500) }

  const canEdit = !!course?.canvasId
  const missingLive = !prof?.liveSessions

  if (editing) return <CourseInfoEditor term={term} code={code} onDone={c => { if (c) setCatalog(c); setEditing(false) }} />

  return (
    <div className="rounded-2xl bg-[hsl(var(--muted)/0.5)] px-4 py-3 flex flex-col gap-2 text-xs">
      {missingLive && canEdit && (
        <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-left rounded-lg border border-dashed border-amber-400/60 bg-amber-400/10 px-3 py-2 text-amber-600 dark:text-amber-400">
          <Radio className="h-3.5 w-3.5 shrink-0" />
          <span>Canvas doesn't say when the live sessions are. <b>Add the time once</b> and everyone in this course gets reminders and a Zoom button.</span>
        </button>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {prof?.name && <span className={`flex items-center gap-1.5 ${fg}`}><User className="h-3.5 w-3.5" /> {prof.name}</span>}
        {prof?.liveSessions && <span className={`flex items-center gap-1.5 ${muted}`}><Radio className="h-3.5 w-3.5" /> Live: {clean(prof.liveSessions)}</span>}
        {prof?.officeHours && <span className={`flex items-center gap-1.5 ${muted}`}><Clock className="h-3.5 w-3.5" /> Office hours: {clean(prof.officeHours)}</span>}
        {!!prof?.tutors?.length && <span className={`flex items-center gap-1.5 ${muted}`}><Users className="h-3.5 w-3.5" /> {prof.tutors.join(", ")}</span>}
        <span className="flex flex-wrap gap-1.5 ml-auto">
          {prof?.meetingId && <a href={zoomUrl(prof.meetingId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-card"><Video className="h-3.5 w-3.5" /> Zoom</a>}
          {prof?.passcode && <button onClick={() => copy(prof.passcode, "pass")} className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-card"><Copy className="h-3.5 w-3.5" /> {copied === "pass" ? "Copied" : "Passcode"}</button>}
          {prof?.recordingPassword && <button onClick={() => copy(prof.recordingPassword, "rec")} className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-card"><Copy className="h-3.5 w-3.5" /> {copied === "rec" ? "Copied" : "Recording pwd"}</button>}
          {prof?.email && <a href={`mailto:${prof.email}`} className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-card"><Mail className="h-3.5 w-3.5" /> Email</a>}
          {canEdit && <button onClick={() => setEditing(true)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-card ${muted}`}><Pencil className="h-3.5 w-3.5" /> Edit</button>}
        </span>
      </div>
      {prof?.infoUpdatedAt && prof.infoUpdatedBy !== "built-in" && (
        <p className={`text-[10px] ${muted}`}>Shared course info · updated {new Date(prof.infoUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
      )}
    </div>
  )
}

function CourseInfoEditor({ term, code, onDone }: { term: string; code: string; onDone: (catalog?: any) => void }) {
  const { catalog } = useCatalog()
  const p = professorOf(term, code, catalog)
  const live = splitSlot(p?.liveSessions ?? "")
  const office = splitSlot(p?.officeHours ?? "")
  const officeWeeks = (p?.officeHours ?? "").match(/\(([\d,\s]+)\)/)?.[1]?.replace(/\s+/g, "") ?? ""
  const [f, setF] = useState({
    professor_name: p?.name ?? "", professor_email: p?.email ?? "", tutors: p?.tutors?.join(", ") ?? "",
    liveDay: live.day, liveStart: live.start, liveEnd: live.end,
    ohDay: office.day, ohStart: office.start, ohEnd: office.end, ohWeeks: officeWeeks,
    meeting_id: p?.meetingId ?? "", passcode: p?.passcode ?? "", recording_password: p?.recordingPassword ?? "",
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    setBusy(true); setErr(null)
    const oh = joinSlot(f.ohDay, f.ohStart, f.ohEnd)
    const res = await fetch("/api/course-info", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        term, courseCode: code,
        professor_name: f.professor_name, professor_email: f.professor_email, tutors: f.tutors,
        live_sessions: joinSlot(f.liveDay, f.liveStart, f.liveEnd),
        office_hours: oh && f.ohWeeks ? `Weeks (${f.ohWeeks}) · ${oh}` : oh,
        meeting_id: f.meeting_id.replace(/\s+/g, ""), passcode: f.passcode, recording_password: f.recording_password,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setErr(data.error ?? "Couldn't save")
    onDone(data.catalog)
  }

  const input = "text-xs rounded-md px-2 py-1.5 bg-background border border-border outline-none focus:border-[hsl(var(--primary))]"
  // plain function (not a component) so inputs keep focus while typing
  const slot = (d: keyof typeof f, s: keyof typeof f, e: keyof typeof f) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <select value={f[d]} onChange={set(d)} className={input}><option value="">—</option>{DAYS.map(x => <option key={x}>{x}</option>)}</select>
      <input type="time" value={f[s]} onChange={set(s)} className={input} /> – <input type="time" value={f[e]} onChange={set(e)} className={input} />
    </div>
  )

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 text-xs">
      <p className={`flex items-center gap-1.5 ${muted}`}><Info className="h-3.5 w-3.5" /> Shared with everyone enrolled in this course. Times in Malta / Brussels time.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">Live session{slot("liveDay", "liveStart", "liveEnd")}</label>
        <label className="flex flex-col gap-1">Office hours
          {slot("ohDay", "ohStart", "ohEnd")}
          <input value={f.ohWeeks} onChange={set("ohWeeks")} placeholder="Weeks, e.g. 2,4,6,8,10,12 (empty = none on the calendar)" className={input} />
        </label>
        <label className="flex flex-col gap-1">Zoom meeting ID<input value={f.meeting_id} onChange={set("meeting_id")} inputMode="numeric" className={input} /></label>
        <label className="flex flex-col gap-1">Zoom passcode<input value={f.passcode} onChange={set("passcode")} className={input} /></label>
        <label className="flex flex-col gap-1">Recording password<input value={f.recording_password} onChange={set("recording_password")} className={input} /></label>
        <label className="flex flex-col gap-1">Professor<input value={f.professor_name} onChange={set("professor_name")} className={input} /></label>
        <label className="flex flex-col gap-1">Professor email<input type="email" value={f.professor_email} onChange={set("professor_email")} className={input} /></label>
        <label className="flex flex-col gap-1">Tutors (comma separated)<input value={f.tutors} onChange={set("tutors")} className={input} /></label>
      </div>
      <div className="flex items-center gap-2">
        {err && <span className="text-[hsl(var(--destructive))]">{err}</span>}
        <span className="ml-auto flex gap-2">
          <button onClick={() => onDone()} className={`px-3 py-1.5 rounded-md border border-border ${muted}`}>Cancel</button>
          <button onClick={save} disabled={busy} className="px-3 py-1.5 rounded-md font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-50">{busy ? "Saving…" : "Save for everyone"}</button>
        </span>
      </div>
    </div>
  )
}
