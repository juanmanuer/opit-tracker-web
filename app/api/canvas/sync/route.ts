import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { gradeChangeEmailHtml } from "@/lib/email"
import { CANVAS_COURSE_IDS } from "@/lib/grades"
import { TERM_COURSES, type Term } from "@/lib/store"

const CANVAS_DOMAIN = process.env.CANVAS_DOMAIN
const CANVAS_TOKEN = process.env.CANVAS_TOKEN

// Canvas course IDs live in lib/grades.ts (CANVAS_COURSE_IDS)
function getTermCourses(term: string) {
  const ids = CANVAS_COURSE_IDS[term] ?? {}
  const names = Object.fromEntries((TERM_COURSES[term as Term] ?? []).map(c => [c.code, c.name]))
  return Object.entries(ids).map(([code, id]) => ({ id, code, name: names[code] ?? code }))
}

async function canvasFetch(path: string) {
  const res = await fetch(`https://${CANVAS_DOMAIN}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${CANVAS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Canvas API error: ${res.status} ${path}`)
  return res.json()
}

async function sendGradeNotification(
  email: string,
  changes: { courseCode: string; courseName: string; oldScore: number | null; newScore: number }[]
) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: email,
        subject: `📊 OPIT Tracker — ${changes.length} grade${changes.length > 1 ? "s" : ""} updated`,
        html: gradeChangeEmailHtml(changes),
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error("Resend error:", err)
    }
  } catch (err) {
    console.error("Failed to send grade notification:", err)
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const userEmail = session.user.email
    const { searchParams } = new URL(req.url)
    const term = searchParams.get("term") ?? "Term 3"
    const courses = getTermCourses(term)
    if (courses.length === 0) {
      return NextResponse.json({ error: `No Canvas courses configured for ${term}` }, { status: 400 })
    }
    if (!CANVAS_DOMAIN || !CANVAS_TOKEN) {
      return NextResponse.json({ error: "Canvas is not configured (CANVAS_DOMAIN / CANVAS_TOKEN missing)" }, { status: 500 })
    }

    const results = await Promise.all(
      courses.map(async (course) => {
        try {
          const [assignments, grades] = await Promise.all([
            canvasFetch(`/courses/${course.id}/assignments?per_page=50&order_by=due_at`),
            canvasFetch(`/courses/${course.id}/enrollments?user_id=self`),
          ])

          const upcoming = assignments
            .filter((a: any) => a.due_at && new Date(a.due_at) > new Date())
            .map((a: any) => ({
              id: a.id,
              title: a.name,
              dueAt: a.due_at,
              pointsPossible: a.points_possible,
              htmlUrl: a.html_url,
            }))

          const enrollment = grades[0]
          const gradeInfo = enrollment ? {
            currentScore: enrollment.grades?.current_score,
            finalScore: enrollment.grades?.final_score,
            currentGrade: enrollment.grades?.current_grade,
            finalGrade: enrollment.grades?.final_grade,
          } : null

          return { courseCode: course.code, courseName: course.name, upcoming, gradeInfo, error: null }
        } catch (err) {
          // One course failing must not break the whole sync
          return { courseCode: course.code, courseName: course.name, upcoming: [], gradeInfo: null, error: String(err) }
        }
      })
    )

    // ── Check for grade changes and send notification ──────────────────
    const changes: {
      courseCode: string
      courseName: string
      oldScore: number | null
      newScore: number
    }[] = []

    // Canvas course totals are stored in canvas_scores — separate from the
    // manual per-assessment scores in grade_scores, which are never touched here.
    await sql`
      CREATE TABLE IF NOT EXISTS canvas_scores (
        email       TEXT NOT NULL,
        term        TEXT NOT NULL,
        course_code TEXT NOT NULL,
        score       NUMERIC NOT NULL,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (email, term, course_code)
      )
    `
    const previous = await sql`
      SELECT course_code, score FROM canvas_scores
      WHERE email = ${userEmail} AND term = ${term}
    `
    const isFirstSync = previous.length === 0 // first run: store silently, no email

    for (const result of results) {
      const newScore = result.gradeInfo?.currentScore
      if (newScore === null || newScore === undefined) continue

      const prev = previous.find((r: any) => r.course_code === result.courseCode)
      const oldScore = prev ? Number(prev.score) : null
      if (oldScore === Number(newScore)) continue

      if (!isFirstSync) {
        changes.push({ courseCode: result.courseCode, courseName: result.courseName, oldScore, newScore })
      }
      await sql`
        INSERT INTO canvas_scores (email, term, course_code, score)
        VALUES (${userEmail}, ${term}, ${result.courseCode}, ${newScore})
        ON CONFLICT (email, term, course_code)
        DO UPDATE SET score = ${newScore}, updated_at = now()
      `
    }

    // Send email if anything changed
    if (changes.length > 0) {
      await sendGradeNotification(userEmail, changes)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Canvas sync error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}