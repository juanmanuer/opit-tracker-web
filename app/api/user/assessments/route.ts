import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json([], { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { assessments: true },
  })

  return NextResponse.json(user?.assessments ?? [])
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })

  const { assessmentId, status } = await req.json()

  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    create: { email: session.user.email, name: session.user.name ?? "" },
    update: {},
  })

  const result = await prisma.userAssessment.upsert({
    where: { userId_assessmentId: { userId: user.id, assessmentId } },
    create: { userId: user.id, assessmentId, status },
    update: { status },
  })

  return NextResponse.json(result)
}