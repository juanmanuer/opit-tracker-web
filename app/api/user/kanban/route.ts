import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json([], { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { kanbanTasks: true },
  })

  return NextResponse.json(user?.kanbanTasks ?? [])
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

  const { id, title, course, type, dueDate, column } = await req.json()

  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    create: { email: session.user.email, name: session.user.name ?? "" },
    update: {},
  })

  const task = await prisma.kanbanTask.upsert({
    where: { id: id ?? "" },
    create: { userId: user.id, title, course, type, dueDate, column },
    update: { title, course, type, dueDate, column },
  })

  return NextResponse.json(task)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

  const { id } = await req.json()
  await prisma.kanbanTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
}