import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json([], { status: 401 })

    const rows = await sql`
      SELECT course_code as "courseCode", lesson_number as "lessonNumber", status
      FROM attendance
      WHERE email = ${session.user.email}
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET attendance error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { courseCode, lessonNumber, status } = await req.json()

    await sql`
      INSERT INTO attendance (email, course_code, lesson_number, status)
      VALUES (${session.user.email}, ${courseCode}, ${lessonNumber}, ${status})
      ON CONFLICT (email, course_code, lesson_number)
      DO UPDATE SET status = ${status}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST attendance error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}