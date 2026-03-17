import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json([], { status: 401 })

    const { searchParams } = new URL(req.url)
    const term = searchParams.get("term") ?? "Term 2"

    const rows = await sql`
      SELECT course_code as "courseCode", assessment_index as "assessmentIndex", score
      FROM grade_scores
      WHERE email = ${session.user.email} AND term = ${term}
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET grades error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { term, courseCode, assessmentIndex, score } = await req.json()

    await sql`
      INSERT INTO grade_scores (email, term, course_code, assessment_index, score)
      VALUES (${session.user.email}, ${term}, ${courseCode}, ${assessmentIndex}, ${score})
      ON CONFLICT (email, term, course_code, assessment_index)
      DO UPDATE SET score = ${score}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST grades error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}