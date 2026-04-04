import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(req.url)
    const term = searchParams.get("term") ?? "Term 2"
    const email = session.user.email

    const [assessments, practices, attendance, grades, notes] = await Promise.all([
      sql`SELECT assessment_id as "assessmentId", status FROM user_assessments WHERE email = ${email}`,
      sql`SELECT practice_id as "practiceId", completed FROM user_practices WHERE email = ${email}`,
      sql`SELECT course_code as "courseCode", lesson_number as "lessonNumber", status FROM attendance WHERE email = ${email}`,
      sql`SELECT course_code as "courseCode", assessment_index as "assessmentIndex", score FROM grade_scores WHERE email = ${email} AND term = ${term}`,
      sql`SELECT content, created_at as "createdAt" FROM user_notes WHERE email = ${email} AND term = ${term} ORDER BY created_at DESC`,
    ])

    return NextResponse.json({
      user: { name: session.user.name, email: session.user.email },
      term,
      assessments,
      practices,
      attendance,
      grades,
      notes,
      exportedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}