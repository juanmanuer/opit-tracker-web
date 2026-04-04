import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json([], { status: 401 })

    const rows = await sql`
      SELECT practice_id as "practiceId", completed
      FROM user_practices
      WHERE email = ${session.user.email}
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET practices error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { practiceId, completed } = await req.json()

    await sql`
      INSERT INTO user_practices (email, practice_id, completed)
      VALUES (${session.user.email}, ${practiceId}, ${completed})
      ON CONFLICT (email, practice_id)
      DO UPDATE SET completed = ${completed}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST practices error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}