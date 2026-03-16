import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json([], { status: 401 })

    const rows = await sql`
      SELECT id, title, start_date as "startDate", end_date as "endDate", type, course_code as "courseCode"
      FROM calendar_events 
      WHERE email = ${session.user.email}
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET calendar error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { title, startDate, endDate, type, courseCode } = await req.json()

    const rows = await sql`
      INSERT INTO calendar_events (email, title, start_date, end_date, type, course_code)
      VALUES (${session.user.email}, ${title}, ${startDate}, ${endDate}, ${type}, ${courseCode})
      RETURNING id
    `
    return NextResponse.json({ id: rows[0].id })
  } catch (error) {
    console.error("POST calendar error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { id } = await req.json()
    await sql`DELETE FROM calendar_events WHERE id=${id} AND email=${session.user.email}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE calendar error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}