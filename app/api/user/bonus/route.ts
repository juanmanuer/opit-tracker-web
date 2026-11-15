import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ensureGradeSchema } from "@/lib/canvas-grades"

// Official bonuses imported from Canvas, all terms (read-only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json([], { status: 401 })
  try {
    await ensureGradeSchema()
    const rows = await sql`
      SELECT term, course_code AS "courseCode", live, practices
      FROM course_bonuses WHERE email = ${session.user.email}
    `
    return NextResponse.json(rows)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
