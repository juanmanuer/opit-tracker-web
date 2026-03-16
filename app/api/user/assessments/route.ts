import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json([], { status: 401 })

    const rows = await sql`
      SELECT assessment_id as "assessmentId", status 
      FROM user_assessments 
      WHERE email = ${session.user.email}
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET assessments error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { assessmentId, status } = await req.json()

    await sql`
      INSERT INTO user_assessments (email, assessment_id, status)
      VALUES (${session.user.email}, ${assessmentId}, ${status})
      ON CONFLICT (email, assessment_id) 
      DO UPDATE SET status = ${status}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST assessments error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}