// lib/canvas-grades.ts
// Reads per-assessment grades and the official bonus items from Canvas,
// and stores them in the app's tables. Shared by the import endpoint and
// the hourly grade-alert job.
import { sql } from "@/lib/db"
import { CANVAS_COURSE_IDS, GRADE_WEIGHTS } from "@/lib/grades"
import { getCanvasToken } from "@/lib/canvas-token"

export type CanvasAssessment = { idx: number; name: string; pct: number | null; gradedAt: string | null; dueAt?: string | null; unlockAt?: string | null; url?: string | null }
export type CanvasCourse = {
  code: string
  assessments: CanvasAssessment[]                  // one per configured assessment (pct null = not graded)
  bonus: { live: boolean | null; practices: boolean | null } // null = not awarded yet
  error?: string
}

const round1 = (n: number) => Math.round(n * 10) / 10

async function canvasGet(path: string, token: string) {
  const res = await fetch(`https://${process.env.CANVAS_DOMAIN}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Canvas ${res.status}`)
  return res.json()
}

// "🎯 Assessment 3: Standard Operating Procedure" -> 2 (index). Ignores "Reassessment".
function assessmentIndex(name: string): number | null {
  const m = name.match(/\bAssessment\s*(\d+)/i)
  return m ? parseInt(m[1], 10) - 1 : null
}

export async function fetchCanvasTermGrades(term: string): Promise<CanvasCourse[]> {
  const token = await getCanvasToken()
  if (!token) throw new Error("No Canvas token")
  const courses = CANVAS_COURSE_IDS[term] ?? {}

  return Promise.all(Object.entries(courses).map(async ([code, id]) => {
    const weights = GRADE_WEIGHTS[term]?.[code] ?? []
    const assessments: CanvasAssessment[] = weights.map((_, idx) => ({ idx, name: `Assessment ${idx + 1}`, pct: null, gradedAt: null }))
    const bonus: CanvasCourse["bonus"] = { live: null, practices: null }
    try {
      const subs = await canvasGet(`/courses/${id}/students/submissions?student_ids[]=self&include[]=assignment&per_page=100`, token)
      for (const s of subs) {
        const name: string = (s.assignment?.name ?? "").trim()
        const points: number = s.assignment?.points_possible ?? 0
        const graded = s.score !== null && s.score !== undefined && s.workflow_state !== "unsubmitted"

        if (/Extra Bonus for Attending Live Sessions/i.test(name)) { if (graded) bonus.live = s.score > 0; continue }
        if (/Extra Bonus for Completing the Practices/i.test(name)) { if (graded) bonus.practices = s.score > 0; continue }

        const idx = assessmentIndex(name)
        if (idx === null || idx >= assessments.length || points <= 0) continue
        assessments[idx] = {
          idx, name,
          pct: graded ? round1((s.score / points) * 100) : null,
          gradedAt: graded ? s.graded_at ?? null : null,
          dueAt: s.assignment?.due_at ?? null,
          unlockAt: s.assignment?.unlock_at ?? null,
          url: s.assignment?.html_url ?? null,
        }
      }
      return { code, assessments, bonus }
    } catch (err) {
      return { code, assessments, bonus, error: String(err) }
    }
  }))
}

// ── Storage helpers ─────────────────────────────────────────────────────
let schemaChecked = false
export async function ensureGradeSchema() {
  if (schemaChecked) return
  // Official bonuses imported from Canvas (manual/app-computed ones are derived on the fly)
  await sql`
    CREATE TABLE IF NOT EXISTS course_bonuses (
      email       TEXT NOT NULL,
      term        TEXT NOT NULL,
      course_code TEXT NOT NULL,
      live        BOOLEAN,
      practices   BOOLEAN,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (email, term, course_code)
    )
  `
  // Canvas gives decimals (97.6). If the score column is an integer type, widen it
  // to NUMERIC — lossless: every existing value is kept exactly.
  const col = await sql`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'grade_scores' AND column_name = 'score'
  `
  if (col[0] && ["integer", "smallint", "bigint"].includes(col[0].data_type)) {
    await sql`ALTER TABLE grade_scores ALTER COLUMN score TYPE NUMERIC(6,2)`
  }
  schemaChecked = true
}

export async function readAppScores(email: string, term: string) {
  const rows = await sql`
    SELECT course_code, assessment_index, score FROM grade_scores
    WHERE email = ${email} AND term = ${term}
  `
  const map: Record<string, Record<number, number>> = {}
  rows.forEach((r: any) => { (map[r.course_code] ??= {})[r.assessment_index] = Number(r.score) })
  return map
}

export async function writeScore(email: string, term: string, courseCode: string, idx: number, score: number) {
  await sql`
    INSERT INTO grade_scores (email, term, course_code, assessment_index, score)
    VALUES (${email}, ${term}, ${courseCode}, ${idx}, ${score})
    ON CONFLICT (email, term, course_code, assessment_index)
    DO UPDATE SET score = ${score}
  `
}

export async function writeBonus(email: string, term: string, courseCode: string, live: boolean | null, practices: boolean | null) {
  await sql`
    INSERT INTO course_bonuses (email, term, course_code, live, practices)
    VALUES (${email}, ${term}, ${courseCode}, ${live}, ${practices})
    ON CONFLICT (email, term, course_code)
    DO UPDATE SET live = COALESCE(${live}, course_bonuses.live),
                  practices = COALESCE(${practices}, course_bonuses.practices),
                  updated_at = now()
  `
}

// Compare Canvas with the app. Empty boxes get filled automatically;
// different values are returned as conflicts for the user to review.
export async function syncTermFromCanvas(email: string, term: string, opts: { applyFills: boolean }) {
  await ensureGradeSchema()
  const [canvas, app] = await Promise.all([fetchCanvasTermGrades(term), readAppScores(email, term)])

  const filled: { courseCode: string; idx: number; name: string; score: number }[] = []
  const conflicts: { courseCode: string; idx: number; name: string; canvas: number; app: number }[] = []
  const errors: string[] = []

  for (const c of canvas) {
    if (c.error) { errors.push(`${c.code}: ${c.error}`); continue }
    for (const a of c.assessments) {
      if (a.pct === null) continue
      const mine = app[c.code]?.[a.idx]
      if (mine === undefined) {
        if (opts.applyFills) await writeScore(email, term, c.code, a.idx, a.pct)
        filled.push({ courseCode: c.code, idx: a.idx, name: a.name, score: a.pct })
      } else if (Math.abs(mine - a.pct) > 0.05) {
        conflicts.push({ courseCode: c.code, idx: a.idx, name: a.name, canvas: a.pct, app: mine })
      }
    }
    if (opts.applyFills && (c.bonus.live !== null || c.bonus.practices !== null)) {
      await writeBonus(email, term, c.code, c.bonus.live, c.bonus.practices)
    }
  }
  return { filled, conflicts, errors, bonuses: canvas.map(c => ({ code: c.code, ...c.bonus })) }
}
