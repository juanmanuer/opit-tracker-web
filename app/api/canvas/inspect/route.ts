import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { CANVAS_COURSE_IDS } from "@/lib/grades"
import { getCanvasToken } from "@/lib/canvas-token"

// READ-ONLY diagnostic: shows how Canvas names and grades each assessment.
// Open /api/canvas/inspect?term=Term%201 while logged in. Writes nothing.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

  const term = new URL(req.url).searchParams.get("term") ?? "Term 3"
  const courses = CANVAS_COURSE_IDS[term]
  if (!courses) return NextResponse.json({ error: `Unknown term ${term}` }, { status: 400 })

  const token = await getCanvasToken(session.user.email)
  const domain = process.env.CANVAS_DOMAIN
  const get = async (path: string) => {
    const res = await fetch(`https://${domain}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`${res.status} ${path}`)
    return res.json()
  }

  const out = await Promise.all(Object.entries(courses).map(async ([code, id]) => {
    try {
      const [enrollments, groups, subs] = await Promise.all([
        get(`/courses/${id}/enrollments?user_id=self`),
        get(`/courses/${id}/assignment_groups?per_page=50`),
        get(`/courses/${id}/students/submissions?student_ids[]=self&include[]=assignment&per_page=100`),
      ])
      const g = enrollments[0]?.grades ?? {}
      return {
        code,
        canvasFinal: { current: g.current_score ?? null, final: g.final_score ?? null },
        groups: groups.map((x: any) => ({ id: x.id, name: x.name, weight: x.group_weight })),
        items: subs
          .map((s: any) => ({
            name: s.assignment?.name,
            groupId: s.assignment?.assignment_group_id,
            points: s.assignment?.points_possible,
            score: s.score,
            pct: s.score != null && s.assignment?.points_possible ? Math.round((s.score / s.assignment.points_possible) * 1000) / 10 : null,
            state: s.workflow_state,
            gradedAt: s.graded_at,
          }))
          .filter((i: any) => i.points > 0),
      }
    } catch (err) {
      return { code, error: String(err) }
    }
  }))
  return NextResponse.json({ term, courses: out })
}
