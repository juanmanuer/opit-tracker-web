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
      SELECT id, content, created_at as "createdAt"
      FROM user_notes
      WHERE email = ${session.user.email} AND term = ${term}
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET notes error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { content, term } = await req.json()

    const rows = await sql`
      INSERT INTO user_notes (email, term, content)
      VALUES (${session.user.email}, ${term}, ${content})
      RETURNING id
    `
    return NextResponse.json({ id: rows[0].id })
  } catch (error) {
    console.error("POST notes error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { id } = await req.json()
    await sql`
      DELETE FROM user_notes
      WHERE id = ${id} AND email = ${session.user.email}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE notes error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}