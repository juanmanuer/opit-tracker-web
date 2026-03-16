import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const CANVAS_DOMAIN = process.env.CANVAS_DOMAIN
const CANVAS_TOKEN = process.env.CANVAS_TOKEN

const TERM2_COURSES = [
  { id: 448, code: "COMP-2001", name: "Foundational Mathematics" },
  { id: 456, code: "COMP-2002", name: "Web Development" },
  { id: 449, code: "COMP-2003", name: "Introduction to Operating Systems" },
  { id: 450, code: "COMP-2004", name: "Data Structures and Algorithms" },
  { id: 457, code: "COMP-2005", name: "Project Management and QA" },
]

async function canvasFetch(path: string) {
  const res = await fetch(`https://${CANVAS_DOMAIN}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${CANVAS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Canvas API error: ${res.status} ${path}`)
  return res.json()
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const results = await Promise.all(
      TERM2_COURSES.map(async (course) => {
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
            submissionTypes: a.submission_types,
          }))

        const enrollment = grades[0]
        const gradeInfo = enrollment ? {
          currentScore: enrollment.grades?.current_score,
          finalScore: enrollment.grades?.final_score,
          currentGrade: enrollment.grades?.current_grade,
          finalGrade: enrollment.grades?.final_grade,
        } : null

        return {
          courseCode: course.code,
          courseName: course.name,
          upcoming,
          gradeInfo,
        }
      })
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error("Canvas sync error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}