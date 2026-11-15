import { sql } from "@/lib/db"
import { DEFAULT_TERM } from "@/lib/store"
import { emailForToken } from "@/lib/calendar-feed"
import { fetchCanvasTermGrades } from "@/lib/canvas-grades"
import { buildPlan, toICS, type CanvasDates, type PersonalEvent } from "@/lib/plan"

// Public calendar feed (the long random token in the URL is the password).
// Google/Apple Calendar poll this URL a few times a day.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const email = await emailForToken(token.replace(/\.ics$/, ""))
  if (!email) return new Response("Not found", { status: 404 })

  let canvas: CanvasDates = {}
  try {
    for (const c of await fetchCanvasTermGrades(DEFAULT_TERM, email)) {
      canvas[c.code] = c.assessments.map(a => ({ idx: a.idx, dueAt: a.dueAt ?? null, unlockAt: a.unlockAt ?? null, url: a.url ?? null }))
    }
  } catch { canvas = {} } // fall back to the dates stored in the app

  const personal = (await sql`
    SELECT id, title, start_date AS "startDate", end_date AS "endDate", type, course_code AS "courseCode"
    FROM calendar_events WHERE email = ${email}
  `.catch(() => [])) as PersonalEvent[]

  const ics = toICS(buildPlan(DEFAULT_TERM, canvas, personal), `OPIT ${DEFAULT_TERM}`)
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="opit-${DEFAULT_TERM.replace(" ", "").toLowerCase()}.ics"`,
      "Cache-Control": "public, max-age=1800",
    },
  })
}
