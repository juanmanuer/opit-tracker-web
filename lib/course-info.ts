// lib/course-info.ts
// Course details Canvas doesn't provide (live-session time, Zoom, passcodes,
// office hours). One row per Canvas course, SHARED by everyone enrolled in it:
// one person fills it in, the whole cohort gets reminders and Zoom buttons.
// Only people whose catalogue contains that Canvas course can read or edit it.
import { sql } from "@/lib/db"
import { BUILT_IN, type Catalog } from "@/lib/catalog"
import type { Professor } from "@/lib/store"

export type CourseInfo = {
  live_sessions: string | null
  office_hours: string | null
  meeting_id: string | null
  passcode: string | null
  recording_password: string | null
  professor_name: string | null
  professor_email: string | null
  tutors: string | null
  updated_by: string | null
  updated_at: string | null
}
export const INFO_FIELDS = ["live_sessions", "office_hours", "meeting_id", "passcode", "recording_password", "professor_name", "professor_email", "tutors"] as const

let ready = false
async function ensureTable() {
  if (ready) return
  await sql`
    CREATE TABLE IF NOT EXISTS course_info (
      canvas_id          BIGINT PRIMARY KEY,
      live_sessions      TEXT,
      office_hours       TEXT,
      meeting_id         TEXT,
      passcode           TEXT,
      recording_password TEXT,
      professor_name     TEXT,
      professor_email    TEXT,
      tutors             TEXT,
      updated_by         TEXT,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  ready = true
}

const canvasIdsOf = (cat: Catalog) =>
  Object.values(cat.terms).flatMap(t => t.courses.map(c => c.canvasId).filter((x): x is number => !!x))

// The original owner's hand-entered details become the shared starting point
// for his cohort (only fills courses nobody has filled yet).
let seeded = false
export async function seedFromBuiltIn() {
  if (seeded) return
  await ensureTable()
  for (const t of Object.values(BUILT_IN.terms)) {
    for (const p of t.professors) {
      const id = t.courses.find(c => c.code === p.courseCode)?.canvasId
      if (!id) continue
      await sql`
        INSERT INTO course_info (canvas_id, live_sessions, office_hours, meeting_id, passcode, recording_password, professor_name, professor_email, tutors, updated_by)
        VALUES (${id}, ${p.liveSessions || null}, ${p.officeHours || null}, ${p.meetingId || null}, ${p.passcode || null},
                ${p.recordingPassword || null}, ${p.name || null}, ${p.email || null}, ${p.tutors.join(", ") || null}, 'built-in')
        ON CONFLICT (canvas_id) DO NOTHING
      `
    }
  }
  seeded = true
}

// Shared details override what discovery guessed (empty fields never erase anything)
export async function applyCourseInfo(cat: Catalog): Promise<Catalog> {
  const ids = canvasIdsOf(cat)
  if (ids.length === 0) return cat
  await ensureTable()
  const rows = (await sql`SELECT * FROM course_info WHERE canvas_id = ANY(${ids})`) as (CourseInfo & { canvas_id: string })[]
  if (rows.length === 0) return cat
  const byId = new Map(rows.map(r => [Number(r.canvas_id), r]))
  const terms = { ...cat.terms }
  for (const [name, t] of Object.entries(terms)) {
    let changed = false
    const professors = [...t.professors]
    for (const c of t.courses) {
      const info = c.canvasId ? byId.get(c.canvasId) : undefined
      if (!info) continue
      const i = professors.findIndex(p => p.courseCode === c.code)
      const base: Professor = i >= 0 ? professors[i] : {
        name: "", email: "", courseCode: c.code, courseName: c.name, liveSessions: "", meetingId: "",
        passcode: "", recordingPassword: "", officeHours: "", tutors: [],
      }
      const merged: Professor = {
        ...base,
        name: info.professor_name || base.name,
        email: info.professor_email || base.email,
        liveSessions: info.live_sessions || base.liveSessions,
        officeHours: info.office_hours || base.officeHours,
        meetingId: info.meeting_id || base.meetingId,
        passcode: info.passcode || base.passcode,
        recordingPassword: info.recording_password || base.recordingPassword,
        tutors: info.tutors ? info.tutors.split(",").map(s => s.trim()).filter(Boolean) : base.tutors,
        infoUpdatedBy: info.updated_by, infoUpdatedAt: info.updated_at,
      }
      if (i >= 0) professors[i] = merged; else professors.push(merged)
      changed = true
    }
    if (changed) terms[name] = { ...t, professors }
  }
  return { ...cat, terms }
}

export async function saveCourseInfo(email: string, canvasId: number, fields: Partial<Record<(typeof INFO_FIELDS)[number], string>>) {
  await ensureTable()
  const clean = Object.fromEntries(INFO_FIELDS.map(k => [k, typeof fields[k] === "string" ? fields[k]!.trim().slice(0, 300) || null : null]))
  await sql`
    INSERT INTO course_info (canvas_id, live_sessions, office_hours, meeting_id, passcode, recording_password, professor_name, professor_email, tutors, updated_by, updated_at)
    VALUES (${canvasId}, ${clean.live_sessions}, ${clean.office_hours}, ${clean.meeting_id}, ${clean.passcode}, ${clean.recording_password},
            ${clean.professor_name}, ${clean.professor_email}, ${clean.tutors}, ${email.toLowerCase()}, now())
    ON CONFLICT (canvas_id) DO UPDATE SET
      live_sessions = EXCLUDED.live_sessions, office_hours = EXCLUDED.office_hours, meeting_id = EXCLUDED.meeting_id,
      passcode = EXCLUDED.passcode, recording_password = EXCLUDED.recording_password, professor_name = EXCLUDED.professor_name,
      professor_email = EXCLUDED.professor_email, tutors = EXCLUDED.tutors, updated_by = EXCLUDED.updated_by, updated_at = now()
  `
}
