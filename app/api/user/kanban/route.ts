import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json([], { status: 401 })

    const rows = await sql`
      SELECT id, title, course, type, due_date as "dueDate", column_name as "column"
      FROM kanban_tasks 
      WHERE email = ${session.user.email}
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET kanban error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { id, title, course, type, dueDate, column } = await req.json()

    if (id) {
      await sql`
        UPDATE kanban_tasks 
        SET title=${title}, course=${course}, type=${type}, due_date=${dueDate}, column_name=${column}
        WHERE id=${id} AND email=${session.user.email}
      `
      return NextResponse.json({ id })
    } else {
      const rows = await sql`
        INSERT INTO kanban_tasks (email, title, course, type, due_date, column_name)
        VALUES (${session.user.email}, ${title}, ${course}, ${type}, ${dueDate}, ${column})
        RETURNING id
      `
      return NextResponse.json({ id: rows[0].id })
    }
  } catch (error) {
    console.error("POST kanban error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

    const { id } = await req.json()
    await sql`DELETE FROM kanban_tasks WHERE id=${id} AND email=${session.user.email}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE kanban error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}